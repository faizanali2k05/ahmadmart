// Deprecated. Admin authentication now goes through /api/auth/login (email +
// password) and is authorized by a JWT with role "admin". Kept only to return a
// clear message if anything still calls the old endpoint.
export default function handler(req, res) {
  res.status(410).json({ error: "Use POST /api/auth/login with the admin email and password." });
}
