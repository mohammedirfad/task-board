import bcrypt from 'bcryptjs';
import app from './app.js';
import { config } from './config.js';
import { initializeDatabase, pool } from './db/pool.js';

async function start() {
  await initializeDatabase();
  if (config.nodeEnv !== 'production') {
    const email = (process.env.DEMO_EMAIL ?? 'admin@test.com').toLowerCase();
    const password = process.env.DEMO_PASSWORD ?? 'Admin@123';
    const [users] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (!users.length) await pool.execute('INSERT INTO users (email, password_hash) VALUES (?, ?)', [email, await bcrypt.hash(password, 12)]);
  }
  await pool.execute('DELETE FROM revoked_tokens WHERE expires_at <= UTC_TIMESTAMP()');
  const revocationCleanup = setInterval(() => { pool.execute('DELETE FROM revoked_tokens WHERE expires_at <= UTC_TIMESTAMP()').catch((error) => console.error('Unable to clean expired sessions:', error.message)); }, 60 * 60 * 1000);
  revocationCleanup.unref();
  const server = app.listen(config.port, () => console.log(`Task Board API ready at http://localhost:${config.port} (Swagger: /api-docs)`));
  const shutdown = () => { clearInterval(revocationCleanup); server.close(async () => { await pool.end(); process.exit(0); }); };
  process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
}

start().catch((error) => { console.error('Unable to start Task Board API:', error.message); process.exit(1); });
