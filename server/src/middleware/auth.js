import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { AppError } from "./errors.js";
import { pool } from "../db/pool.js";

export async function authenticate(req, _res, next) {
  const header = req.get("authorization") ?? "";
  if (!header.startsWith("Bearer "))
    return next(new AppError(401, "Sign in to access this resource"));
  let payload;
  try {
    payload = jwt.verify(header.slice(7), config.jwtSecret, {
      algorithms: ["HS256"],
      issuer: "taskboard-api",
      audience: "taskboard-client",
    });
  } catch {
    return next(
      new AppError(
        401,
        "Your session is invalid or expired. Please sign in again.",
      ),
    );
  }
  if (
    typeof payload !== "object" ||
    !payload.jti ||
    !payload.sub ||
    !payload.exp
  )
    return next(
      new AppError(
        401,
        "Your session is invalid or expired. Please sign in again.",
      ),
    );
  try {
    const [revoked] = await pool.execute(
      "SELECT jti FROM revoked_tokens WHERE jti = ? AND expires_at > UTC_TIMESTAMP()",
      [payload.jti],
    );
    if (revoked.length)
      return next(
        new AppError(
          401,
          "This session has been signed out. Please sign in again.",
        ),
      );
    req.user = {
      id: Number(payload.sub),
      email: payload.email,
      tokenId: payload.jti,
      expiresAt: new Date(payload.exp * 1000),
    };
    next();
  } catch (error) {
    next(error);
  }
}
