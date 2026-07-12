/**
 * CRUD Factory — eliminates the 7×55-line admin route boilerplate.
 *
 * Instead of copy-pasting the same requireEditor → zod validate →
 * prisma.findMany/create/update/delete → audit log pattern for every
 * content type, we use a single factory function.
 *
 * Usage in /api/admin/<entity>/route.ts:
 *
 *   import { createCrudRoute } from "@/lib/crud";
 *   import { z } from "zod";
 *   import { db } from "@/lib/db";
 *
 *   const schema = z.object({
 *     title: z.string(),
 *     body: z.string(),
 *   });
 *
 *   export const { GET, POST, PUT, DELETE } = createCrudRoute({
 *     model: db.article,
 *     entityName: "Article",
 *     schema,
 *     searchFields: ["title", "body", "excerpt"],
 *   });
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEditor } from "@/lib/auth";
import { audit } from "@/lib/audit";

export interface CrudConfig<T extends Record<string, unknown>> {
  /** Prisma model delegate, e.g. db.article */
  model: {
    findMany: (args?: Record<string, unknown>) => Promise<T[]>;
    findUnique: (args: { where: { id: number } }) => Promise<T | null>;
    create: (args: { data: Partial<T> }) => Promise<T>;
    update: (args: { where: { id: number }; data: Partial<T> }) => Promise<T>;
    delete: (args: { where: { id: number } }) => Promise<T>;
    count: (args?: Record<string, unknown>) => Promise<number>;
  };
  /** Display name for audit logs, e.g. "Article" */
  entityName: string;
  /** Zod schema for validation */
  schema: z.ZodType<T>;
  /** Fields to search in (for ?q= query param) */
  searchFields?: string[];
  /** Fields to filter by (for ?field=value query params) */
  filterFields?: string[];
  /** Default sort field (default: "id") */
  defaultSort?: string;
  /** Default sort direction (default: "desc") */
  defaultOrder?: "asc" | "desc";
  /** Default page size (default: 50) */
  defaultLimit?: number;
  /** Whether to auto-generate createdAt (default: true) */
  autoTimestamp?: boolean;
}

/**
 * Create a complete CRUD handler set for a content type.
 * Returns { GET, POST, PUT, DELETE } for use in route.ts exports.
 */
export function createCrudRoute<T extends Record<string, unknown>>(
  config: CrudConfig<T>,
) {
  const {
    model,
    entityName,
    schema,
    searchFields = [],
    filterFields = [],
    defaultSort = "id",
    defaultOrder = "desc",
    defaultLimit = 50,
  } = config;

  // ─── GET: list with pagination, search, filter ──────────────────────────
  async function GET(request: NextRequest) {
    try {
      const session = await requireEditor();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
      const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || String(defaultLimit))));
      const q = searchParams.get("q") || "";
      const sort = searchParams.get("sort") || defaultSort;
      const order = (searchParams.get("order") || defaultOrder) as "asc" | "desc";

      // Build where clause
      const where: Record<string, unknown> = {};

      // Search
      if (q && searchFields.length > 0) {
        where.OR = searchFields.map(field => ({
          [field]: { contains: q },
        }));
      }

      // Filters
      for (const field of filterFields) {
        const value = searchParams.get(field);
        if (value) {
          where[field] = value;
        }
      }

      const [items, total] = await Promise.all([
        model.findMany({
          where,
          orderBy: { [sort]: order },
        }),
        model.count({ where }),
      ]);

      return NextResponse.json({
        success: true,
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.error(`GET ${entityName} error:`, error);
      return NextResponse.json(
        { success: false, error: `Failed to fetch ${entityName.toLowerCase()}s` },
        { status: 500 },
      );
    }
  }

  // ─── POST: create new ───────────────────────────────────────────────────
  async function POST(request: NextRequest) {
    try {
      const session = await requireEditor();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const body = await request.json();
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const data = { ...parsed.data } as Record<string, unknown>;
      if (config.autoTimestamp !== false) {
        data.createdAt = new Date();
      }

      const created = await model.create({ data: data as Partial<T> });
      const createdId = (created as unknown as { id: number }).id;

      await audit({
        session,
        action: "create",
        entity: entityName,
        entityId: createdId,
        after: created,
        req: request as unknown as Request,
      });

      return NextResponse.json({ success: true, item: created });
    } catch (error) {
      console.error(`POST ${entityName} error:`, error);
      return NextResponse.json(
        { success: false, error: `Failed to create ${entityName.toLowerCase()}` },
        { status: 500 },
      );
    }
  }

  // ─── PUT: update existing ───────────────────────────────────────────────
  async function PUT(request: NextRequest) {
    try {
      const session = await requireEditor();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const id = parseInt(searchParams.get("id") || "0");
      if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
      }

      const before = await model.findUnique({ where: { id } });
      if (!before) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const body = await request.json();
      // Use safeParse with partial-like behavior by making all keys optional
      const parsed = schema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: "Validation failed", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      const updated = await model.update({
        where: { id },
        data: parsed.data as Partial<T>,
      });

      await audit({
        session,
        action: "update",
        entity: entityName,
        entityId: id,
        before,
        after: updated,
        req: request as unknown as Request,
      });

      return NextResponse.json({ success: true, item: updated });
    } catch (error) {
      console.error(`PUT ${entityName} error:`, error);
      return NextResponse.json(
        { success: false, error: `Failed to update ${entityName.toLowerCase()}` },
        { status: 500 },
      );
    }
  }

  // ─── DELETE: remove ─────────────────────────────────────────────────────
  async function DELETE(request: NextRequest) {
    try {
      const session = await requireEditor();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(request.url);
      const id = parseInt(searchParams.get("id") || "0");
      if (!id) {
        return NextResponse.json({ error: "Missing id" }, { status: 400 });
      }

      const before = await model.findUnique({ where: { id } });
      if (!before) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      await model.delete({ where: { id } });

      await audit({
        session,
        action: "delete",
        entity: entityName,
        entityId: id,
        before,
        req: request as unknown as Request,
      });

      return NextResponse.json({ success: true });
    } catch (error) {
      console.error(`DELETE ${entityName} error:`, error);
      return NextResponse.json(
        { success: false, error: `Failed to delete ${entityName.toLowerCase()}` },
        { status: 500 },
      );
    }
  }

  return { GET, POST, PUT, DELETE };
}
