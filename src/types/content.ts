/**
 * Centralized content type definitions — single source of truth.
 *
 * All content models (Article, Fatwa, Download, etc.) are defined here
 * and imported by components, API routes, and the admin panel.
 * This eliminates the scattered inline type definitions that were
 * previously duplicated across 8+ component files.
 *
 * To add a new content type:
 *   1. Add the interface here
 *   2. Add the Prisma model in prisma/schema.prisma
 *   3. Add the admin schema in AdminPanel.tsx SCHEMAS
 *   4. Add the CRUD route (or use createCrudRoute factory)
 */

// ─── Content Models ──────────────────────────────────────────────────────────

export interface Article {
  id: number;
  title: string;
  cat: string;         // machine key (e.g. "fiqh")
  catLabel: string;    // display label (e.g. "Fiqh & Ijtihād")
  date: string;        // display date string
  excerpt: string;
  body: string;        // HTML or markdown content
  createdAt: Date;
  // Future extension fields (optional, not yet in schema):
  slug?: string;
  status?: "draft" | "published";
  publishedAt?: Date;
  tags?: string[];
  authorId?: number;
}

export interface Fatwa {
  id: number;
  q: string;           // question
  cat: string;         // category (display label — to be aligned with Article pattern)
  answer: string;      // HTML or markdown
  source: string;      // citation / reference
  createdAt: Date;
  // Future extension fields:
  slug?: string;
  catKey?: string;     // machine key (to align with Article)
  status?: "draft" | "published";
}

export interface DownloadItem {
  id: number;
  title: string;
  cat: string;         // machine key
  catLabel: string;    // display label
  meta: string;        // file metadata (pages, size, etc.)
  desc: string;        // description
  filename: string;    // path under public/downloads/
  createdAt: Date;
  // Future extension fields:
  fileSize?: number;
  fileType?: string;
  downloadCount?: number;
}

export type AnnouncementKind = "urgent" | "info" | "ramadan" | "moon" | "eid" | "hajj";

export interface Announcement {
  id: number;
  title: string;
  body: string;
  date: string;        // display date
  kind: AnnouncementKind;
  createdAt: Date;
  // Future extension fields:
  expiresAt?: Date;    // auto-expiry date
  pinned?: boolean;    // pin to top
}

export interface Hadith {
  id: number;
  text: string;
  source: string;      // citation (e.g. "Ṣaḥīḥ al-Bukhārī 1")
  createdAt: Date;
  // Future extension fields:
  theme?: string;      // e.g. "fasting", "patience"
  arabic?: string;
}

export interface Dyk {
  id: number;
  text: string;
  createdAt: Date;
  // Future extension fields:
  source?: string;
}

export interface PrayerSchedule {
  id: number;
  name: string;        // Fajr | Sunrise | Dhuhr | Asr | Maghrib | Isha
  start: string;       // HH:MM (azaan time)
  end: string;         // HH:MM (jama'ah time)
  order: number;
}

// ─── Category Model (for dynamic category management) ────────────────────────

export interface Category {
  key: string;         // machine key (e.g. "fiqh")
  label: string;       // display label (e.g. "Fiqh & Ijtihād")
  arabic?: string;     // Arabic label
  entityType: "article" | "fatwa" | "download";
  order: number;
  count?: number;      // number of items in this category (derived)
}

// ─── Admin Form Schema (drives the AdminPanel edit form) ─────────────────────

export type FieldType = "text" | "textarea" | "select" | "date" | "number" | "checkbox" | "tags";

export interface AdminFieldSchema {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];  // for select type
  helpText?: string;
  rows?: number;       // for textarea
  multiline?: boolean;
}

export type AdminEntityType =
  | "articles" | "fatwas" | "downloads" | "announcements"
  | "hadiths" | "dyks" | "prayer" | "categories" | "links" | "financials";

export interface AdminTabConfig {
  id: AdminEntityType;
  label: string;
  icon: string;        // icon name
  entityName: string;  // singular display name
  searchable: boolean;
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface BulkImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: { row: number; error: string }[];
}

// ─── Search Types ────────────────────────────────────────────────────────────

export type SearchableEntityType =
  | "article" | "fatwa" | "download" | "announcement"
  | "hadith" | "dyk" | "link";

export interface SearchResult {
  type: SearchableEntityType;
  id: number;
  title: string;
  excerpt: string;
  meta?: string;
  score: number;       // relevance score
}

// ─── Page Registry Types ─────────────────────────────────────────────────────

export interface PageRegistryEntry {
  id: string;
  label: string;
  arabic: string;
  icon: string;
  component: string;       // component name/path for lazy loading
  searchable: boolean;
  showInNav: boolean;
  showInFooter?: "knowledge" | "organisation";
}
