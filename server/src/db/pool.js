import mysql from 'mysql2/promise';
import { config } from '../config.js';

export const pool = mysql.createPool({ ...config.database, namedPlaceholders: true, decimalNumbers: true, timezone: 'Z' });

export async function initializeDatabase() {
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);
  await pool.query(`CREATE TABLE IF NOT EXISTS settings (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    daily_story_point_limit DECIMAL(7,2) NOT NULL DEFAULT 8,
    weekly_story_point_limit DECIMAL(7,2) NOT NULL DEFAULT 40,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_settings_daily CHECK (daily_story_point_limit > 0),
    CONSTRAINT chk_settings_weekly CHECK (weekly_story_point_limit > 0)
  ) ENGINE=InnoDB`);
  await pool.query(`CREATE TABLE IF NOT EXISTS revoked_tokens (
    jti CHAR(36) NOT NULL PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    expires_at DATETIME NOT NULL,
    revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_revoked_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_revoked_tokens_expiry (expires_at)
  ) ENGINE=InnoDB`);
  await pool.query(`CREATE TABLE IF NOT EXISTS tasks (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    description TEXT NOT NULL,
    story_points INT UNSIGNED NOT NULL,
    priority ENUM('Low','Medium','High','Critical') NOT NULL,
    status ENUM('Backlog','Planned','In Progress','Completed') NOT NULL DEFAULT 'Backlog',
    planned_date DATE NOT NULL,
    due_date DATE NOT NULL,
    created_by BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_task_points CHECK (story_points > 0),
    CONSTRAINT chk_task_dates CHECK (due_date >= planned_date),
    CONSTRAINT fk_tasks_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_tasks_status (status), INDEX idx_tasks_priority (priority),
    INDEX idx_tasks_planned_date (planned_date), INDEX idx_tasks_status_planned (status, planned_date), INDEX idx_tasks_title (title)
  ) ENGINE=InnoDB`);
  const [storyPointColumns] = await pool.query(`SELECT DATA_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'story_points'`);
  if (storyPointColumns[0]?.DATA_TYPE !== 'int') {
    const [[fractional]] = await pool.query('SELECT COUNT(*) AS total FROM tasks WHERE story_points <> FLOOR(story_points)');
    if (Number(fractional.total) > 0) {
      throw new Error('Existing tasks contain fractional story points. Convert them to whole numbers before restarting the API; no data was changed.');
    }
    await pool.query('ALTER TABLE tasks MODIFY story_points INT UNSIGNED NOT NULL');
  }
  await pool.query('INSERT IGNORE INTO settings (id, daily_story_point_limit, weekly_story_point_limit) VALUES (1, 8, 40)');
}
