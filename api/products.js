// GET /api/products — public list of all products for the storefront.
import { getSql, rowToProduct } from "./_db.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  try {
    const sql = getSql();
    const rows = await sql`select * from products order by id`;
    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({ products: rows.map(rowToProduct) });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
