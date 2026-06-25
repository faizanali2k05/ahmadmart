// Admin product writes — POST (create), PUT (update), DELETE.
// Protected by the x-admin-key header (checked against ADMIN_PASSWORD).
import { getSql, rowToProduct, requireAdmin, readJsonBody } from "../_db.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  try {
    const sql = getSql();

    if (req.method === "POST") {
      const p = await readJsonBody(req);
      if (!p.name || p.price == null) { res.status(400).json({ error: "Name and price are required." }); return; }
      const rows = await sql`
        insert into products
          (name, price, original_price, price_note, category, subcategory, image, images,
           rating, reviews, badge, in_stock, is_service, description, specs)
        values
          (${p.name}, ${p.price}, ${p.originalPrice ?? null}, ${p.priceNote ?? null},
           ${p.category ?? ""}, ${p.subcategory ?? ""}, ${p.image ?? ""},
           ${JSON.stringify(p.images ?? [])}::jsonb, ${p.rating ?? 0}, ${p.reviews ?? 0},
           ${p.badge ?? null}, ${p.inStock ?? true}, ${p.isService ?? false},
           ${p.description ?? ""}, ${JSON.stringify(p.specs ?? {})}::jsonb)
        returning *`;
      res.status(201).json({ product: rowToProduct(rows[0]) });
      return;
    }

    if (req.method === "PUT") {
      const p = await readJsonBody(req);
      if (!p.id) { res.status(400).json({ error: "Missing product id." }); return; }
      const rows = await sql`
        update products set
          name=${p.name}, price=${p.price}, original_price=${p.originalPrice ?? null},
          price_note=${p.priceNote ?? null}, category=${p.category ?? ""}, subcategory=${p.subcategory ?? ""},
          image=${p.image ?? ""}, images=${JSON.stringify(p.images ?? [])}::jsonb,
          rating=${p.rating ?? 0}, reviews=${p.reviews ?? 0}, badge=${p.badge ?? null},
          in_stock=${p.inStock ?? true}, is_service=${p.isService ?? false},
          description=${p.description ?? ""}, specs=${JSON.stringify(p.specs ?? {})}::jsonb,
          updated_at=now()
        where id=${p.id}
        returning *`;
      if (!rows.length) { res.status(404).json({ error: "Product not found." }); return; }
      res.status(200).json({ product: rowToProduct(rows[0]) });
      return;
    }

    if (req.method === "DELETE") {
      const body = await readJsonBody(req);
      const id = body.id ?? req.query?.id;
      if (!id) { res.status(400).json({ error: "Missing product id." }); return; }
      await sql`delete from products where id=${id}`;
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
