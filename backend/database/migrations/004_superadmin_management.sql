-- Apply once after migrations 001_auth_sessions.sql, 002_password_reset_tokens.sql,
-- and 003_user_management_rbac.sql.
ALTER TABLE users
  MODIFY status ENUM('pending', 'active', 'blocked', 'disabled', 'rejected')
    NOT NULL DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS user_management_audit (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  target_user_id BIGINT UNSIGNED NULL,
  action VARCHAR(32) NOT NULL,
  previous_role VARCHAR(32) NULL,
  new_role VARCHAR(32) NOT NULL,
  previous_status VARCHAR(16) NULL,
  new_status VARCHAR(16) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user_management_audit_target_created (target_user_id, created_at),
  KEY idx_user_management_audit_actor_created (actor_user_id, created_at),
  CONSTRAINT fk_user_management_audit_actor
    FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_user_management_audit_target
    FOREIGN KEY (target_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
