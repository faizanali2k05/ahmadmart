// POST /api/admin/seed — one-time import of the built-in catalog into Neon.
// Body: { products: [...], force?: boolean }. Skips if the table already has
// rows (unless force=true, which clears the table first).
import { getSql, requireAdmin, readJsonBody } from "../_db.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  try {
    const sql = getSql();
    const body = await readJsonBody(req);
    const force = body.force === true;
    const products = Array.isArray(body.products) ? body.products : [];

    const [{ count }] = await sql`select count(*)::int as count from products`;
    if (count > 0 && !force) {
      res.status(200).json({ seeded: 0, skipped: true, message: "Products already exist. Pass force to replace." });
      return;
    }
    if (force) await sql`delete from products`;

    let seeded = 0;
    for (const p of products) {
      await sql`
        insert into products
          (id, name, price, original_price, price_note, category, subcategory, image, images,
           rating, reviews, badge, in_stock, is_service, description, specs)
        values
          (${p.id}, ${p.name}, ${p.price}, ${p.originalPrice ?? null}, ${p.priceNote ?? null},
           ${p.category ?? ""}, ${p.subcategory ?? ""}, ${p.image ?? ""},
           ${JSON.stringify(p.images ?? [])}::jsonb, ${p.rating ?? 0}, ${p.reviews ?? 0},
           ${p.badge ?? null}, ${p.inStock ?? true}, ${p.isService ?? false},
           ${p.description ?? ""}, ${JSON.stringify(p.specs ?? {})}::jsonb)
        on conflict (id) do nothing`;
      seeded++;
    }
    // Make sure new auto-generated ids start after the highest seeded id.
    await sql`select setval(pg_get_serial_sequence('products', 'id'), coalesce((select max(id) from products), 1))`;
    res.status(200).json({ seeded });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
