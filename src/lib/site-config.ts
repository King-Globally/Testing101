/**
 * SiteConfig — single source of truth for all site-wide configuration.
 *
 * This module eliminates the 15+ hardcoded locations for contact details,
 * banking information, navigation, useful links, and branding that were
 * previously scattered across HomeClient.tsx, layout.tsx, and API routes.
 *
 * To add a new nav item: add an entry to NAV_ITEMS.
 * To update banking details: edit BANKING.
 * To change contact info: edit CONTACT.
 *
 * For admin-editable config (changes without redeploy), see the SiteConfig
 * Prisma model which can override these defaults at runtime.
 */

import type { ComponentType } from "react";
import {
  Home, BookOpen, FileText, Calendar as CalendarIcon, Bell,
  Download, Mail, Link2, HelpCircle, type LucideProps,
} from "lucide-react";
import RandIcon, { RandIconAsNav } from "@/components/RandIcon";

// ─── Organization Identity ──────────────────────────────────────────────────
export const ORG = {
  name: "Jamiatul Ulama Johannesburg",
  shortName: "Jamiat JHB",
  arabicName: "جمعية علماء جوهانسبرغ",
  tagline: "Clear propagation is our only responsibility.",
  taglineSource: "Sūrah Yāsīn 36:17",
  established: "South Africa",
  website: "https://jamiat.joburg",
  shareLink: "https://tinyurl.com/JamiatulJUJ",
} as const;

// ─── Contact Information (single source of truth) ───────────────────────────
export const CONTACT = {
  email: "admin@jamiat.joburg",
  emailFatwa: "admin@jamiat.joburg",     // fatwa questions
  emailGeneral: "admin@jamiat.joburg",   // general inquiries
  phone: "+27 11 834 6003",
  whatsapp: "+27 786 786 713",
  whatsappDisplay: "+27 786 786 713",
  fax: "+27 11 834 6016",
  postal: "P.O. Box 396, Mayfair 2108, Johannesburg, South Africa",
  street: "11 Clydesdale Road, Mayfair, Johannesburg",
  mapsUrl: "https://maps.google.com/?q=Jamiatul+Ulama+Johannesburg",
} as const;

// ─── Banking Details (single source of truth) ───────────────────────────────
export const BANKING = {
  sections: [
    {
      title: "Jamiatul Ulama South Africa — General Fund",
      bank: "FNB",
      accountName: "Jamiatul Ulama South Africa",
      accountNumber: "63214722399",
      branch: "FNB Pine Walk (210835)",
      branchCode: "210835",
      swift: "FIRNZAJJ",
      reference: "Donor Name + Sadaqah",
      zakaht: true,
    },
    {
      title: "National Sadaqah Campaign (NSC)",
      bank: "FNB",
      accountName: "Jamiatul Ulama NPC",
      accountNumber: "63214722399",
      branch: "FNB Pine Walk (210835)",
      branchCode: "210835",
      swift: "FIRNZAJJ",
      reference: "NSC + Donor Name",
      zakaht: true,
    },
    {
      title: "Hilaal Committee Fund",
      bank: "FNB",
      accountName: "Jamiatul Ulama Hilaal Committee",
      accountNumber: "63214722399",
      branch: "FNB Pine Walk (210835)",
      branchCode: "210835",
      swift: "FIRNZAJJ",
      reference: "Hilaal + Donor Name",
      zakaht: false,
    },
  ],
  note: "For Zakāt, please mark clearly. EFT confirmation can be sent to admin@jamiat.joburg.",
} as const;

// ─── Navigation Items (single source of truth) ──────────────────────────────
export type PageId =
  | "home" | "fatwas" | "articles" | "calendar" | "financials"
  | "downloads" | "announcements" | "links" | "contact";

export interface NavItem {
  id: PageId;
  label: string;
  arabic: string;
  icon: ComponentType<LucideProps>;
  searchable: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "home",          label: "Home",          arabic: "الرئيسية",   icon: Home,            searchable: false },
  { id: "fatwas",        label: "Fatwas & Q&A",  arabic: "فتاوى",     icon: BookOpen,        searchable: true  },
  { id: "articles",      label: "Articles",      arabic: "مقالات",    icon: FileText,        searchable: true  },
  { id: "calendar",      label: "Calendar",      arabic: "التقويم",   icon: CalendarIcon,    searchable: false },
  { id: "financials",    label: "Financials",    arabic: "المؤشرات",  icon: RandIconAsNav,   searchable: false },
  { id: "downloads",     label: "Downloads",     arabic: "مكتبة",     icon: Download,        searchable: true  },
  { id: "announcements", label: "Announcements", arabic: "إعلانات",   icon: Bell,            searchable: true  },
  { id: "links",         label: "Useful Links",  arabic: "روابط",      icon: Link2,           searchable: true  },
  { id: "contact",       label: "Contact",       arabic: "تواصل",     icon: Mail,            searchable: false },
];

export const NAV_BY_ID: Record<PageId, NavItem> = Object.fromEntries(
  NAV_ITEMS.map(n => [n.id, n])
) as Record<PageId, NavItem>;

// ─── Useful Links (single source of truth) ──────────────────────────────────
export interface UsefulLink {
  title: string;
  url: string;
  description: string;
  category: "islamic-organizations" | "services" | "education" | "charity";
}

export const USEFUL_LINKS: UsefulLink[] = [
  {
    title: "Jamiatul Ulama South Africa",
    url: "https://jamiat.org.za",
    description: "The national body of Muslim theologians in South Africa.",
    category: "islamic-organizations",
  },
  {
    title: "Jamiat KZN (KwaZulu-Natal)",
    url: "https://jamiat.co.za",
    description: "Jamiatul Ulama KwaZulu-Natal — provincial chapter.",
    category: "islamic-organizations",
  },
  {
    title: "Muslim Judicial Council (MJC)",
    url: "https://mjc.org.za",
    description: "Muslim Judicial Council of Cape Town.",
    category: "islamic-organizations",
  },
  {
    title: "United Ulama Council of South Africa (UUCSA)",
    url: "https://uucsa.co.za",
    description: "Umbrella body representing Muslim theological organizations in South Africa.",
    category: "islamic-organizations",
  },
  {
    title: "South African National Halaal Authority (SANHA)",
    url: "https://sanha.org.za",
    description: "Halaal certification authority for South Africa.",
    category: "services",
  },
  {
    title: "National Awqaf Foundation of South Africa",
    url: "https://awqafsa.org.za",
    description: "Islamic endowment (waqf) foundation for sustainable community development.",
    category: "charity",
  },
  {
    title: "Islamic Relief South Africa",
    url: "https://islamic-relief.org.za",
    description: "International humanitarian and development organization.",
    category: "charity",
  },
];

// ─── Footer Configuration ───────────────────────────────────────────────────
export const FOOTER = {
  columns: {
    knowledge: {
      title: "Knowledge",
      links: [
        { label: "Fatwas & Q&A", page: "fatwas" as PageId },
        { label: "Articles", page: "articles" as PageId },
        { label: "Downloads", page: "downloads" as PageId },
        { label: "Islamic Calendar", page: "calendar" as PageId },
      ],
    },
    organisation: {
      title: "Organisation",
      links: [
        { label: "Announcements", page: "announcements" as PageId },
        { label: "Financial Indicators", page: "financials" as PageId },
        { label: "Useful Links", page: "links" as PageId },
        { label: "Contact", page: "contact" as PageId },
      ],
    },
  },
} as const;

// ─── Social & External ──────────────────────────────────────────────────────
export const SOCIAL = {
  whatsapp: CONTACT.whatsapp,
  whatsappUrl: `https://wa.me/${CONTACT.whatsapp.replace(/[^0-9]/g, "")}`,
  email: CONTACT.email,
  emailUrl: `mailto:${CONTACT.email}`,
} as const;

// ─── Site Metadata (for layout.tsx) ─────────────────────────────────────────
export const METADATA = {
  title: `${ORG.name} — Authentic Islamic Guidance`,
  description:
    `${ORG.name} — providing authentic Islamic guidance, fatwas, articles, prayer times, ` +
    "moon-sighting announcements, and educational resources for the South African Muslim community.",
  keywords: [
    "Jamiatul Ulama", "Johannesburg", "Islamic fatwa", "Islamic guidance",
    "moon sighting", "Hilaal Committee", "prayer times", "South Africa",
    "Islamic articles", "Zakāh", "Ḥalāl", "Ramaḍān",
  ],
  authors: [{ name: ORG.name }],
  openGraph: {
    title: ORG.name,
    description: "Authentic Islamic guidance for the South African Muslim community.",
    url: ORG.website,
    siteName: ORG.name,
    locale: "en_ZA",
    type: "website",
  },
} as const;

// ─── Financial Indicators (default values; can be overridden by DB) ──────────
export interface FinancialIndicator {
  key: string;
  label: string;
  value: string;
  unit: string;
  effectiveDate: string;
  note?: string;
}

export const DEFAULT_FINANCIAL_INDICATORS: FinancialIndicator[] = [
  { key: "gold-24k", label: "Gold (24K)", value: "R 2,815", unit: "per gram", effectiveDate: "2026-06-22", note: "Used for Zakāh on gold" },
  { key: "gold-22k", label: "Gold (22K)", value: "R 2,581", unit: "per gram", effectiveDate: "2026-06-22" },
  { key: "gold-18k", label: "Gold (18K)", value: "R 2,112", unit: "per gram", effectiveDate: "2026-06-22" },
  { key: "silver",   label: "Silver",    value: "R 35.20", unit: "per gram", effectiveDate: "2026-06-22", note: "Used for Zakāh on silver" },
  { key: "krugerrand", label: "Krugerrand (1oz)", value: "R 47,250", unit: "per coin", effectiveDate: "2026-06-22" },
  { key: "nisab-gold", label: "Niṣāb (Gold)", value: "R 329,755", unit: "85g gold", effectiveDate: "2026-06-22", note: "Minimum Zakāt threshold" },
  { key: "nisab-silver", label: "Niṣāb (Silver)", value: "R 2,114", unit: "595g silver", effectiveDate: "2026-06-22" },
  { key: "mahr-faqeer", label: "Mahr al-Faqīr", value: "R 1,500", unit: "minimum", effectiveDate: "2026-06-22" },
  { key: "mahr-mithl", label: "Mahr al-Mithl", value: "R 30,000", unit: "customary", effectiveDate: "2026-06-22" },
  { key: "fitrah",    label: "Ṣadaqat al-Fiṭr", value: "R 35", unit: "per person", effectiveDate: "2026-06-22", note: "Ramaḍān 1448" },
];

// ─── Admin Panel Configuration ──────────────────────────────────────────────
export const ADMIN = {
  sessionMaxAgeHours: 8,
  maxLoginAttempts: 5,
  lockoutMinutes: 15,
  auditLogRetentionDays: 365,
} as const;

// ─── Helper: Get all config as a single object (for /api/config endpoint) ────
export function getFullSiteConfig() {
  return {
    org: ORG,
    contact: CONTACT,
    banking: BANKING,
    social: SOCIAL,
    navItems: NAV_ITEMS.map(({ icon, ...rest }) => rest), // strip React component
    usefulLinks: USEFUL_LINKS,
    financialIndicators: DEFAULT_FINANCIAL_INDICATORS,
    metadata: METADATA,
    generatedAt: new Date().toISOString(),
  };
}
