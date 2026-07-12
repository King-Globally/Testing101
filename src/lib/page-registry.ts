/**
 * Page Registry — makes adding a new page a one-line change.
 *
 * Previously, adding a page required editing 6 places:
 *   1. PageId type union
 *   2. NAV array
 *   3. 9-branch page render chain
 *   4. Footer links
 *   5. SearchOverlay props
 *   6. HomeView widget (if featured)
 *
 * Now, adding a page is a single entry in PAGES below, plus creating
 * the page component in src/components/pages/.
 *
 * The HomeClient.tsx reads from this registry and dynamically renders
 * the appropriate page component based on the current page state.
 */

import type { PageId } from "@/lib/site-config";

export interface PageConfig {
  id: PageId;
  label: string;
  arabic: string;
  /** Icon name from lucide-react */
  icon: string;
  /** Whether this page appears in the main navigation */
  showInNav: boolean;
  /** Whether this page appears in the footer */
  showInFooter?: "knowledge" | "organisation";
  /** Whether the search overlay should search this page's content */
  searchable: boolean;
  /** Whether this page is featured on the home view */
  featuredOnHome?: boolean;
  /** Sort order in navigation (lower = earlier) */
  navOrder: number;
}

/**
 * The page registry. To add a new page:
 *   1. Add the page id to PageId type in site-config.ts
 *   2. Add an entry here
 *   3. Create the page component in src/components/pages/<PageId>.tsx
 *   4. Add a case in HomeClient.tsx's renderPage() switch
 */
export const PAGES: Record<PageId, PageConfig> = {
  home: {
    id: "home",
    label: "Home",
    arabic: "الرئيسية",
    icon: "Home",
    showInNav: true,
    searchable: false,
    featuredOnHome: false,
    navOrder: 0,
  },
  fatwas: {
    id: "fatwas",
    label: "Fatwas & Q&A",
    arabic: "فتاوى",
    icon: "BookOpen",
    showInNav: true,
    showInFooter: "knowledge",
    searchable: true,
    featuredOnHome: true,
    navOrder: 1,
  },
  articles: {
    id: "articles",
    label: "Articles",
    arabic: "مقالات",
    icon: "FileText",
    showInNav: true,
    showInFooter: "knowledge",
    searchable: true,
    featuredOnHome: true,
    navOrder: 2,
  },
  calendar: {
    id: "calendar",
    label: "Calendar",
    arabic: "التقويم",
    icon: "Calendar",
    showInNav: true,
    showInFooter: "knowledge",
    searchable: false,
    featuredOnHome: true,
    navOrder: 3,
  },
  financials: {
    id: "financials",
    label: "Financials",
    arabic: "المؤشرات",
    icon: "RandIcon",
    showInNav: true,
    showInFooter: "organisation",
    searchable: false,
    featuredOnHome: true,
    navOrder: 4,
  },
  downloads: {
    id: "downloads",
    label: "Downloads",
    arabic: "مكتبة",
    icon: "Download",
    showInNav: true,
    showInFooter: "knowledge",
    searchable: true,
    featuredOnHome: true,
    navOrder: 5,
  },
  announcements: {
    id: "announcements",
    label: "Announcements",
    arabic: "إعلانات",
    icon: "Bell",
    showInNav: true,
    showInFooter: "organisation",
    searchable: true,
    featuredOnHome: true,
    navOrder: 6,
  },
  links: {
    id: "links",
    label: "Useful Links",
    arabic: "روابط",
    icon: "Link2",
    showInNav: true,
    showInFooter: "organisation",
    searchable: true,
    featuredOnHome: false,
    navOrder: 7,
  },
  contact: {
    id: "contact",
    label: "Contact",
    arabic: "تواصل",
    icon: "Mail",
    showInNav: true,
    showInFooter: "organisation",
    searchable: false,
    featuredOnHome: false,
    navOrder: 8,
  },
};

/**
 * Get all pages that should appear in navigation, sorted by navOrder.
 */
export function getNavPages(): PageConfig[] {
  return Object.values(PAGES)
    .filter(p => p.showInNav)
    .sort((a, b) => a.navOrder - b.navOrder);
}

/**
 * Get all pages that should appear in the footer, grouped by column.
 */
export function getFooterPages(): { knowledge: PageConfig[]; organisation: PageConfig[] } {
  const all = Object.values(PAGES);
  return {
    knowledge: all.filter(p => p.showInFooter === "knowledge").sort((a, b) => a.navOrder - b.navOrder),
    organisation: all.filter(p => p.showInFooter === "organisation").sort((a, b) => a.navOrder - b.navOrder),
  };
}

/**
 * Get all searchable pages.
 */
export function getSearchablePages(): PageConfig[] {
  return Object.values(PAGES).filter(p => p.searchable);
}

/**
 * Get all pages featured on home.
 */
export function getFeaturedPages(): PageConfig[] {
  return Object.values(PAGES).filter(p => p.featuredOnHome);
}
