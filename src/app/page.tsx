import { db } from "@/lib/db";
import HomeClient from "@/components/HomeClient";

// Server Component — fetches all data from the mini-database once on page load.
async function getData() {
  const [articles, fatwas, downloads, announcements, hadiths, dyks] = await Promise.all([
    db.article.findMany({ orderBy: { id: "asc" } }),
    db.fatwa.findMany({ orderBy: { id: "asc" } }),
    db.download.findMany({ orderBy: { id: "asc" } }),
    db.announcement.findMany({ orderBy: { id: "asc" } }),
    db.hadith.findMany({ orderBy: { id: "asc" } }),
    db.dyk.findMany({ orderBy: { id: "asc" } }),
  ]);

  return {
    articles: articles.map(a => ({ id: a.id, title: a.title, cat: a.cat, catLabel: a.catLabel, date: a.date, excerpt: a.excerpt, body: a.body })),
    fatwas: fatwas.map(f => ({ id: f.id, q: f.q, cat: f.cat, answer: f.answer, source: f.source })),
    downloads: downloads.map(d => ({ id: d.id, title: d.title, cat: d.cat, catLabel: d.catLabel, meta: d.meta, desc: d.desc, filename: d.filename })),
    announcements: announcements.map(a => ({ id: a.id, title: a.title, body: a.body, date: a.date, kind: a.kind })),
    hadiths: hadiths.map(h => ({ id: h.id, text: h.text, source: h.source })),
    dyks: dyks.map(d => ({ id: d.id, text: d.text })),
  };
}

export default async function Page() {
  const data = await getData();
  return <HomeClient {...data} />;
}
