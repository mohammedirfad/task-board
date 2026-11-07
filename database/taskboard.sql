-- Task Board schema export
-- MySQL 8.0+ / InnoDB. Demo user is created with bcrypt by the API at local startup.
CREATE DATABASE IF NOT EXISTS taskboard CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE taskboard;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
  id TINYINT UNSIGNED NOT NULL,
  daily_story_point_limit DECIMAL(7,2) NOT NULL DEFAULT 8.00,
  weekly_story_point_limit DECIMAL(7,2) NOT NULL DEFAULT 40.00,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_settings_daily CHECK (daily_story_point_limit > 0),
  CONSTRAINT chk_settings_weekly CHECK (weekly_story_point_limit > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS revoked_tokens (
  jti CHAR(36) NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  revoked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (jti),
  CONSTRAINT fk_revoked_tokens_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_revoked_tokens_expiry (expires_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
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
  PRIMARY KEY (id),
  CONSTRAINT chk_task_points CHECK (story_points > 0),
  CONSTRAINT chk_task_dates CHECK (due_date >= planned_date),
  CONSTRAINT fk_tasks_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
  INDEX idx_tasks_status (status),
  INDEX idx_tasks_priority (priority),
  INDEX idx_tasks_planned_date (planned_date),
  INDEX idx_tasks_status_planned (status, planned_date),
  INDEX idx_tasks_title (title)
) ENGINE=InnoDB;

INSERT IGNORE INTO settings (id, daily_story_point_limit, weekly_story_point_limit)
VALUES (1, 8.00, 40.00);
