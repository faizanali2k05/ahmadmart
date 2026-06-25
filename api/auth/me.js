// GET /api/auth/me — return the signed-in user from the Bearer token.
import { getSql, getAuthUser, userPublic } from "../_db.js";

export default async function handler(req, res) {
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const sql = getSql();
    const rows = await sql`select * from users where id = ${auth.id}`;
    if (!rows.length) { res.status(401).json({ error: "User not found" }); return; }
    res.status(200).json({ user: userPublic(rows[0]) });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
