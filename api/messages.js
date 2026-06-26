// /api/messages — in-app buyer ↔ seller chat.
//   GET  ?unread=1                                  -> { unread }
//   GET  ?productId=&buyerId=&sellerId=             -> { messages } (marks read)
//   GET  (no params)                                -> { conversations } (summaries)
//   POST { productId, buyerId, sellerId, body }     -> { message }
// A thread is identified by (product_id, buyer_id, seller_id). The signed-in user
// must be either the buyer or the seller of the thread.
import { getSql, getAuthUser, readJsonBody } from "./_db.js";

const toMsg = (m) => ({
  id: m.id,
  productId: m.product_id ?? undefined,
  buyerId: m.buyer_id,
  sellerId: m.seller_id,
  senderId: m.sender_id,
  body: m.body,
  read: m.read,
  createdAt: new Date(m.created_at).getTime(),
});

export default async function handler(req, res) {
  const me = getAuthUser(req);
  if (!me) { res.status(401).json({ error: "Please sign in to use messages." }); return; }
  try {
    const sql = getSql();

    if (req.method === "GET") {
      // Unread count for the notification badge.
      if (req.query?.unread) {
        const [{ n }] = await sql`
          select count(*)::int as n from messages
          where read = false and sender_id <> ${me.id} and (buyer_id = ${me.id} or seller_id = ${me.id})`;
        res.status(200).json({ unread: n });
        return;
      }

      const productId = req.query?.productId;
      const buyerId = req.query?.buyerId;
      const sellerId = req.query?.sellerId;
      if (productId && buyerId && sellerId) {
        // A single thread — only the buyer or seller may read it.
        if (Number(buyerId) !== me.id && Number(sellerId) !== me.id) {
          res.status(403).json({ error: "Not your conversation." }); return;
        }
        const rows = await sql`
          select * from messages
          where product_id = ${productId} and buyer_id = ${buyerId} and seller_id = ${sellerId}
          order by created_at asc`;
        await sql`
          update messages set read = true
          where product_id = ${productId} and buyer_id = ${buyerId} and seller_id = ${sellerId}
            and sender_id <> ${me.id} and read = false`;
        res.status(200).json({ messages: rows.map(toMsg) });
        return;
      }

      // Conversation summaries for this user (latest message per thread).
      const rows = await sql`
        select distinct on (m.product_id, m.buyer_id, m.seller_id)
          m.product_id, m.buyer_id, m.seller_id,
          m.body as last_body, m.created_at as last_at, m.sender_id as last_sender,
          p.name as product_name, p.image as product_image,
          bu.name as buyer_name, su.store_name as seller_store, su.name as seller_name,
          (select count(*)::int from messages mm
             where mm.product_id = m.product_id and mm.buyer_id = m.buyer_id and mm.seller_id = m.seller_id
               and mm.read = false and mm.sender_id <> ${me.id}) as unread
        from messages m
        join products p  on p.id  = m.product_id
        join users    bu on bu.id = m.buyer_id
        join users    su on su.id = m.seller_id
        where m.buyer_id = ${me.id} or m.seller_id = ${me.id}
        order by m.product_id, m.buyer_id, m.seller_id, m.created_at desc`;
      const conversations = rows.map(r => ({
        productId: r.product_id,
        buyerId: r.buyer_id,
        sellerId: r.seller_id,
        productName: r.product_name,
        productImage: r.product_image,
        buyerName: r.buyer_name,
        sellerStore: r.seller_store || r.seller_name,
        lastBody: r.last_body,
        lastSenderId: r.last_sender,
        lastAt: new Date(r.last_at).getTime(),
        unread: r.unread,
      })).sort((a, b) => b.lastAt - a.lastAt);
      res.status(200).json({ conversations });
      return;
    }

    if (req.method === "POST") {
      const { productId, buyerId, sellerId, body } = await readJsonBody(req);
      if (!productId || !buyerId || !sellerId || !body || !String(body).trim()) {
        res.status(400).json({ error: "Missing message details." }); return;
      }
      if (Number(buyerId) !== me.id && Number(sellerId) !== me.id) {
        res.status(403).json({ error: "Not your conversation." }); return;
      }
      if (Number(buyerId) === Number(sellerId)) {
        res.status(400).json({ error: "You can't message your own store." }); return;
      }
      const rows = await sql`
        insert into messages (product_id, buyer_id, seller_id, sender_id, body)
        values (${productId}, ${buyerId}, ${sellerId}, ${me.id}, ${String(body).trim()})
        returning *`;
      res.status(201).json({ message: toMsg(rows[0]) });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
