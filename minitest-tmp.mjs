import http from "node:http";
import { neon } from "@neondatabase/serverless";
const sql = neon(process.env.DATABASE_URL);
const server = http.createServer(async (req, res) => {
  const start = Date.now();
  console.log("request received", req.url);
  try {
    const rows = await sql`
      select p.*,
             u.store_name as seller_store, u.whatsapp as seller_whatsapp, u.city as seller_city,
             u.jazzcash_number as seller_jazzcash_number, u.jazzcash_title as seller_jazzcash_title,
             u.account_type as seller_account_type, u.payment_methods as seller_payment_methods,
             coalesce(sold.qty, 0)::int as sold
      from products p
      left join users u on u.id = p.seller_id
      left join (
        select (item->>'id')::int as product_id, sum((item->>'qty')::int) as qty
        from orders o, jsonb_array_elements(o.items) as item
        where o.status in ('Payment Received', 'Confirmed (COD)', 'Shipped', 'Delivered')
        group by 1
      ) sold on sold.product_id = p.id
      order by p.id`;
    console.log("query done in", Date.now()-start, "ms, rows:", rows.length);
    res.end(JSON.stringify({count: rows.length}));
  } catch (e) {
    console.log("error after", Date.now()-start, "ms:", e.message);
    res.statusCode = 500;
    res.end(e.message);
  }
});
server.listen(3999, () => console.log("minitest listening on 3999"));
