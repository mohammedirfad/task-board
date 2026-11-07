import bcrypt from "bcryptjs";
import { config } from "../config.js";
import { initializeDatabase, pool } from "../db/pool.js";

try {
  const email = (process.env.DEMO_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.DEMO_PASSWORD ?? "";
  if (!email || password.length < 12)
    throw new Error(
      "Set DEMO_EMAIL and a DEMO_PASSWORD of at least 12 characters in the server environment before seeding production.",
    );
  await initializeDatabase();
  const [existing] = await pool.execute(
    "SELECT id FROM users WHERE email = ?",
    [email],
  );
  if (existing.length)
    throw new Error(
      `Account ${email} already exists; no password was changed.`,
    );
  await pool.execute("INSERT INTO users (email, password_hash) VALUES (?, ?)", [
    email,
    await bcrypt.hash(password, 12),
  ]);
  console.log(`Created administrator ${email}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
