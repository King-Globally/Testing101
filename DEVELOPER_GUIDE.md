# Jamiatul Ulama Johannesburg — Developer Guide

## Architecture Overview

This is a Next.js 16 App Router project with Prisma (SQLite) and NextAuth.
The site is a single-page application with client-side routing driven by
`useState<PageId>` in `HomeClient.tsx`.

## How to Add Content (No Code Required)

### Adding Articles / Fatwas / Downloads / Announcements / Hadiths / DYKs

1. Log in to the admin panel (Ctrl+Shift+A or click the lock icon in the footer).
2. Navigate to the appropriate tab (Articles, Fatwas, etc.).
3. Click "New" to create a new item, or click an existing item to edit.
4. Fill in the form and save.

Changes are immediately live. All mutations are audit-logged.

### Adding a New Category

Simply use the new category value in the `cat` field when creating an article,
fatwa, or download. The category will automatically appear in the filter chips
on the public site (derived dynamically from the database via `/api/categories`).

To set a friendly display label for a category, add it to `CATEGORY_LABELS` in
`src/lib/categories.ts`.

## How to Add a New Page (Minimal Code)

1. **Add the page id** to the `PageId` type in `src/lib/site-config.ts`:
   ```ts
   export type PageId = "home" | "fatwas" | ... | "mypage";
   ```

2. **Add the page config** in `src/lib/page-registry.ts`:
   ```ts
   mypage: {
     id: "mypage",
     label: "My Page",
     arabic: "صفحتي",
     icon: "FileText",
     showInNav: true,
     showInFooter: "knowledge",
     searchable: true,
     navOrder: 9,
   },
   ```

3. **Add the nav item** in `NAV_ITEMS` in `src/lib/site-config.ts`:
   ```ts
   { id: "mypage", label: "My Page", arabic: "صفحتي", icon: FileText, searchable: true },
   ```

4. **Create the page component** in `src/components/pages/MyPage.tsx`.

5. **Add the render case** in `HomeClient.tsx`'s page render block:
   ```tsx
   {page === "mypage" && <MyPage />}
   ```

That's it — navigation, footer, and search will all pick up the new page
automatically from the registry.

## How to Add a New Content Type (Entity)

1. **Add the Prisma model** in `prisma/schema.prisma`:
   ```prisma
   model MyEntity {
     id        Int      @id @default(autoincrement())
     title     String
     body      String
     createdAt DateTime @default(now())
   }
   ```
   Run `npx prisma db push` to apply.

2. **Add the TypeScript interface** in `src/types/content.ts`:
   ```ts
   export interface MyEntity {
     id: number;
     title: string;
     body: string;
     createdAt: Date;
   }
   ```

3. **Create the admin CRUD route** in `src/app/api/admin/my-entities/route.ts`.
   You can use the CRUD factory to eliminate boilerplate:
   ```ts
   import { createCrudRoute } from "@/lib/crud";
   import { z } from "zod";
   import { db } from "@/lib/db";

   const schema = z.object({
     title: z.string(),
     body: z.string(),
   });

   export const { GET, POST, PUT, DELETE } = createCrudRoute({
     model: db.myEntity,
     entityName: "MyEntity",
     schema,
     searchFields: ["title", "body"],
   });
   ```

4. **Add the admin panel tab** in `src/components/AdminPanel.tsx`:
   - Add to `Tab` type union
   - Add to `TABS` array
   - Add to `SCHEMAS` record

5. **Create the public read API** in `src/app/api/my-entities/route.ts` (optional).

6. **Create the display component** and add it to the page render in `HomeClient.tsx`.

## Centralized Configuration

All site-wide configuration lives in `src/lib/site-config.ts`:

- `ORG` — organization name, tagline, website
- `CONTACT` — email, phone, WhatsApp, postal address
- `BANKING` — banking details for donations
- `NAV_ITEMS` — navigation items
- `USEFUL_LINKS` — useful links page content
- `METADATA` — SEO metadata
- `DEFAULT_FINANCIAL_INDICATORS` — Zakāh/gold/silver rates
- `SOCIAL` — social media links

To change any of these, edit `site-config.ts` and redeploy.
The `/api/config` endpoint exposes this config to the frontend.

## API Reference

### Public APIs (no auth)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/config` | GET | Site configuration |
| `/api/articles?page=1&limit=20&cat=fiqh&q=zakat` | GET | Articles with pagination |
| `/api/fatwas?page=1&limit=20&cat=Zakāh&q=fasting` | GET | Fatwas with pagination |
| `/api/downloads?page=1&limit=20&cat=fiqh` | GET | Downloads with pagination |
| `/api/announcements?limit=20&kind=moon` | GET | Announcements |
| `/api/categories?type=article` | GET | Dynamic categories |
| `/api/search?q=zakat&types=article,fatwa` | GET | Cross-content search |
| `/api/moon-sighting` | GET | Moon-sighting intelligence |
| `/api/download?file=...` | GET | PDF download |
| `/api/contact` | POST | Contact form submission |

### Admin APIs (editor auth required)

| Endpoint | Methods | Purpose |
|---|---|---|
| `/api/admin/articles` | GET, POST, PUT, DELETE | Article CRUD |
| `/api/admin/articles/bulk` | POST | Bulk import articles |
| `/api/admin/fatwas` | GET, POST, PUT, DELETE | Fatwa CRUD |
| `/api/admin/fatwas/bulk` | POST | Bulk import fatwas |
| `/api/admin/downloads` | GET, POST, PUT, DELETE | Download CRUD |
| `/api/admin/announcements` | GET, POST, PUT, DELETE | Announcement CRUD |
| `/api/admin/hadiths` | GET, POST, PUT, DELETE | Hadith CRUD |
| `/api/admin/dyks` | GET, POST, PUT, DELETE | DYK CRUD |
| `/api/admin/prayer` | GET, POST, PUT, DELETE | Prayer schedule CRUD |
| `/api/admin/audit` | GET | Audit log (read-only) |
| `/api/admin/exports?entity=all` | GET | Export all content as JSON |

## Database Schema

Run `npx prisma studio` to view/edit the database in a browser UI.

### Models

| Model | Purpose |
|---|---|
| `Article` | Islamic articles |
| `Fatwa` | Q&A fatwas |
| `Download` | PDF/booklet downloads |
| `Announcement` | Site announcements |
| `Hadith` | Hadith of the moment |
| `Dyk` | "Did You Know" facts |
| `PrayerSchedule` | Daily prayer times |
| `HijriMonth` | Islamic month metadata |
| `User` | Admin users |
| `AuditLog` | Audit trail |
| `LoginAttempt` | Login rate limiting |

## Moon-Sighting System

The advanced moon-sighting system lives in `src/lib/moon/`:

- `moon-sighting.ts` — astronomical engine (conjunction, visibility, 30-day logic)
- `hadith-rotation.ts` — 75+ authentic ahadith with 3-month rotation cycle
- `announcement-manager.ts` — intelligent announcement filtering

The `/api/moon-sighting` endpoint aggregates all of this into a single response
that the `MoonSightingAlert` component and `HeadlineBanner` consume.

## File Structure

```
src/
├── app/
│   ├── api/                    # API routes (public + admin)
│   │   ├── admin/              # Editor-only CRUD routes
│   │   ├── articles/           # Public article API
│   │   ├── fatwas/             # Public fatwa API
│   │   ├── downloads/          # Public download API
│   │   ├── announcements/      # Public announcement API
│   │   ├── categories/         # Dynamic category API
│   │   ├── config/             # Site config API
│   │   ├── search/             # Cross-content search API
│   │   └── moon-sighting/      # Moon-sighting intelligence API
│   ├── layout.tsx              # Root layout (fonts, metadata)
│   └── page.tsx                # Home page (server component)
├── components/
│   ├── AdminPanel.tsx          # Admin CRUD UI
│   ├── ArticleGrid.tsx         # Article listing with category chips
│   ├── FatwaList.tsx           # Fatwa listing with category chips
│   ├── DownloadsGrid.tsx       # Download listing with category chips
│   ├── HomeClient.tsx          # Main app shell + page routing
│   ├── MoonSightingAlert.tsx   # Moon-sighting alert card
│   ├── IslamicCalendar.tsx     # Hijri calendar
│   ├── PrayerTimes.tsx         # Prayer times dashboard
│   └── ...
├── lib/
│   ├── site-config.ts          # ★ Centralized site configuration
│   ├── page-registry.ts        # ★ Page registry (add pages in one line)
│   ├── categories.ts           # ★ Dynamic category derivation
│   ├── crud.ts                 # ★ CRUD factory (eliminates boilerplate)
│   ├── db.ts                   # Prisma client
│   ├── auth.ts                 # NextAuth config
│   ├── audit.ts                # Audit logging
│   ├── hijri.ts                # Hijri date conversion
│   ├── prayer.ts               # Prayer times hook
│   └── moon/                   # Moon-sighting engine
├── types/
│   └── content.ts              # ★ Centralized type definitions
└── prisma/
    └── schema.prisma           # Database schema
```

★ = New files added for extensibility

## Backup & Restore

### Export all content
```bash
curl -H "Cookie: next-auth.session-token=..." \
  https://your-site/api/admin/exports?entity=all > backup.json
```

### Bulk import articles
```bash
curl -X POST -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"items":[{"title":"...","cat":"fiqh","body":"..."}]}' \
  https://your-site/api/admin/articles/bulk
```

## Deployment

The site is configured for Vercel deployment (`vercel.json`).
The SQLite database file is at `db/custom.db` (relative path for Vercel).

For production with high traffic, consider migrating to PostgreSQL by:
1. Updating `prisma/schema.prisma` provider to `"postgresql"`
2. Updating `DATABASE_URL` in `.env`
3. Running `npx prisma migrate dev`
