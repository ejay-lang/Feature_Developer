-- Apply once to an existing HOPE database created with the original starter schema.
-- Existing accounts receive must_change_password = 1 and must update their password
-- after their first successful login. Review that policy before deploying.

ALTER TABLE users
  MODIFY status ENUM('pending', 'active', 'blocked', 'disabled') NOT NULL DEFAULT 'pending',
  ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN session_version INT UNSIGNED NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  expires INT UNSIGNED NOT NULL,
  data MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (session_id),
  KEY idx_sessions_expires (expires)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_bin;
