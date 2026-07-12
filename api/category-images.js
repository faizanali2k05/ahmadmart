// GET /api/category-images — public list of every category that has an
// admin-uploaded photo, as lazy /api/category-image URLs (same pattern as
// product photos: avoids embedding base64 in this JSON response).
import { getSql } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
  try {
    const sql = getSql();
    await sql`create table if not exists category_images (
      category   text primary key,
      image      text not null,
      updated_at timestamptz not null default now()
    )`;
    const rows = await sql`select category, updated_at from category_images`;
    const images = Object.fromEntries(rows.map(r => {
      const v = new Date(r.updated_at).getTime();
      return [r.category, `/api/category-image?cat=${encodeURIComponent(r.category)}&v=${v}`];
    }));
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=300");
    res.status(200).json({ images });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
