import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { config } from "../config.js";
import { AppError } from "../middleware/errors.js";
import { authenticate } from "../middleware/auth.js";

const router = Router();
const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

/** @openapi
 * /login:
 *   post:
 *     tags: [Authentication]
 *     summary: Sign in and receive a short-lived JWT
 *     description: Submit the demo credentials admin@test.com / Admin@123 after initializing the database. Tokens expire according to JWT_EXPIRES_IN.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [email, password], properties: { email: { type: string, format: email, example: admin@test.com }, password: { type: string, example: Admin@123 } } }
 *     responses:
 *       200: { description: Signed in, content: { application/json: { schema: { type: object, properties: { token: { type: string }, expiresIn: { type: string }, user: { type: object } } } } } }
 *       401: { description: Invalid credentials }
 */
router.post("/login", async (req, res) => {
  const input = loginSchema.parse(req.body);
  const [users] = await pool.execute(
    "SELECT id, email, password_hash FROM users WHERE email = ?",
    [input.email.toLowerCase()],
  );
  const user = users[0];
  if (!user || !(await bcrypt.compare(input.password, user.password_hash)))
    throw new AppError(401, "Email or password is incorrect");
  const token = jwt.sign({ email: user.email }, config.jwtSecret, {
    subject: String(user.id),
    jwtid: randomUUID(),
    expiresIn: config.jwtExpiresIn,
    algorithm: "HS256",
    issuer: "taskboard-api",
    audience: "taskboard-client",
  });
  res.json({
    token,
    tokenType: "Bearer",
    expiresIn: config.jwtExpiresIn,
    user: { id: user.id, email: user.email },
  });
});

/** @openapi
 * /logout:
 *   post:
 *     tags: [Authentication]
 *     summary: Revoke the current JWT session
 *     description: Adds the current token ID to the revocation store until it expires. The same token cannot be used again after logout.
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       204: { description: Session revoked }
 *       401: { description: Session missing, invalid, expired, or previously revoked }
 */
router.post("/logout", authenticate, async (req, res) => {
  await pool.execute(
    "INSERT IGNORE INTO revoked_tokens (jti, user_id, expires_at) VALUES (?, ?, ?)",
    [req.user.tokenId, req.user.id, req.user.expiresAt],
  );
  res.status(204).end();
});

export default router;
