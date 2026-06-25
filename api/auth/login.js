// POST /api/auth/login — verify email + password, return { token, user }.
// The admin account is bootstrapped here on first login: if no user exists for
// ADMIN_EMAIL and the submitted password matches ADMIN_PASSWORD, an admin user
// is created in the database (with a hashed password).
import bcrypt from "bcryptjs";
import { getSql, signToken, userPublic, readJsonBody } from "../_db.js";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "ahmadmart@mail.com").toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ahmadmart@123";

export default async function handler(req, res) {
  if (req.method !== "POST") { res.status(405).json({ error: "Method not allowed" }); return; }
  try {
    const { email, password } = await readJsonBody(req);
    if (!email || !password) { res.status(400).json({ error: "Email and password are required." }); return; }

    const sql = getSql();
    const emailLc = String(email).toLowerCase();
    let rows = await sql`select * from users where lower(email) = ${emailLc}`;
    let row = rows[0];

    // First-time admin bootstrap.
    if (!row && emailLc === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);
      const ins = await sql`
        insert into users (name, email, password_hash, role)
        values ('Administrator', ${ADMIN_EMAIL}, ${hash}, 'admin')
        on conflict (email) do update set role = 'admin'
        returning *`;
      row = ins[0];
    }

    if (!row) { res.status(401).json({ error: "Invalid email or password." }); return; }
    const ok = await bcrypt.compare(String(password), row.password_hash);
    if (!ok) { res.status(401).json({ error: "Invalid email or password." }); return; }

    const user = userPublic(row);
    res.status(200).json({ token: signToken(user), user });
  } catch (e) {
    res.status(500).json({ error: e.message || "Database error" });
  }
}
