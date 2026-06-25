// POST /api/auth/role — let a signed-in user switch between buyer and seller.
// Body: { role }. Returns a fresh { token, user } so the new role takes effect.
import { getSql, getAuthUser, userPublic, signToken, readJsonBody } from "../_db.js";

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "PATCH") { res.status(405).json({ error: "Method not allowed" }); return; }
  const auth = getAuthUser(req);
  if (!auth) { res.status(401).json({ error: "Not authenticated" }); return; }
  try {
    const { role } = await readJsonBody(req);
    if (role !== "buyer" && role !== "seller") { res.status(400).json({ error: "Role must be buyer or seller." }); return; }

    const sql = getSql();
    const current = await sql`select role from users where id = ${auth.id}`;
    if (!current.length) { res.status(401).json({ error: "User not found" }); return; }
    if (current[0].role === "admin") { res.status(403).json({ error: "The admin role cannot be changed here." }); return; }

    const rows = await sql`update users set role = ${role}, updated_at = now() where id = ${auth.id} returning *`;
    const user = userPublic(rows[0]);
    res.status(200).json({ token: signToken(user), user });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
