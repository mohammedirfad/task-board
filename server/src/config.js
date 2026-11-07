import "dotenv/config";

const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET"];
if (process.env.NODE_ENV === "production") {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length)
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  if ((process.env.JWT_SECRET ?? "").length < 32)
    throw new Error("JWT_SECRET must contain at least 32 characters");
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:4200",
  jwtSecret:
    process.env.JWT_SECRET ??
    "local-only-secret-change-before-deployment-32chars",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "30m",
  database: {
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    database: process.env.DB_NAME ?? "taskboard",
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    connectionLimit: 10,
    waitForConnections: true,
  },
};
