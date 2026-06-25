// GET /api/admin/analytics — catalog analytics for the admin dashboard.
import { getSql, requireAdmin } from "../_db.js";

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;
  if (req.method !== "GET") { res.status(405).json({ error: "Method not allowed" }); return; }
  try {
    const sql = getSql();
    const totalsRows = await sql`
      select
        count(*)::int                                            as total,
        (count(*) filter (where in_stock))::int                  as in_stock,
        (count(*) filter (where not in_stock))::int              as out_of_stock,
        (count(*) filter (where is_service))::int                as services,
        (count(*) filter (where original_price is not null
                                 and original_price > price))::int as discounted,
        coalesce(sum(price), 0)::int                             as inventory_value,
        coalesce(round(avg(price))::int, 0)                      as avg_price
      from products`;
    const byCategory = await sql`
      select category, count(*)::int as count, coalesce(sum(price),0)::int as value
      from products group by category order by count desc`;
    const bySubcategory = await sql`
      select subcategory, count(*)::int as count
      from products group by subcategory order by count desc`;
    res.status(200).json({
      totals: totalsRows[0] || {},
      byCategory,
      bySubcategory,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
