CREATE TABLE IF NOT EXISTS roles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(32) NOT NULL,
  description VARCHAR(255) NOT NULL DEFAULT '',
  PRIMARY KEY (id),
  CONSTRAINT uq_roles_name UNIQUE (name)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

INSERT INTO roles (id, name, description)
VALUES
  (1, 'superadmin', 'Full access to all user accounts and role assignments.'),
  (2, 'admin', 'Manages regular user accounts.'),
  (3, 'user', 'Regular account without user-management access.')
ON DUPLICATE KEY UPDATE
  description = VALUES(description);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('pending', 'active', 'blocked', 'disabled', 'rejected') NOT NULL DEFAULT 'pending',
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  session_version INT UNSIGNED NOT NULL DEFAULT 0,
  role_id INT UNSIGNED NOT NULL DEFAULT 3,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT uq_users_email UNIQUE (email),
  KEY idx_users_role_status (role_id, status),
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

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

CREATE TABLE IF NOT EXISTS permissions (
  id SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
  module_key VARCHAR(32) NOT NULL,
  module_name VARCHAR(64) NOT NULL,
  action_name ENUM('view', 'create', 'edit', 'delete') NOT NULL,
  permission_code VARCHAR(64) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT uq_permissions_code UNIQUE (permission_code),
  CONSTRAINT uq_permissions_module_action UNIQUE (module_key, action_name)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

INSERT INTO permissions (module_key, module_name, action_name, permission_code)
VALUES
  ('customer', 'Customer', 'view', 'customer.view'),
  ('customer', 'Customer', 'create', 'customer.create'),
  ('customer', 'Customer', 'edit', 'customer.edit'),
  ('customer', 'Customer', 'delete', 'customer.delete'),
  ('product', 'Product', 'view', 'product.view'),
  ('product', 'Product', 'create', 'product.create'),
  ('product', 'Product', 'edit', 'product.edit'),
  ('product', 'Product', 'delete', 'product.delete'),
  ('human_resources', 'Human Resources', 'view', 'human_resources.view'),
  ('human_resources', 'Human Resources', 'create', 'human_resources.create'),
  ('human_resources', 'Human Resources', 'edit', 'human_resources.edit'),
  ('human_resources', 'Human Resources', 'delete', 'human_resources.delete'),
  ('sales', 'Sales', 'view', 'sales.view'),
  ('sales', 'Sales', 'create', 'sales.create'),
  ('sales', 'Sales', 'edit', 'sales.edit'),
  ('sales', 'Sales', 'delete', 'sales.delete'),
  ('reports', 'Reports', 'view', 'reports.view'),
  ('reports', 'Reports', 'create', 'reports.create'),
  ('reports', 'Reports', 'edit', 'reports.edit'),
  ('reports', 'Reports', 'delete', 'reports.delete')
ON DUPLICATE KEY UPDATE
  module_name = VALUES(module_name),
  action_name = VALUES(action_name);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id BIGINT UNSIGNED NOT NULL,
  permission_id SMALLINT UNSIGNED NOT NULL,
  granted_by BIGINT UNSIGNED NULL,
  granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  KEY idx_user_permissions_permission (permission_id),
  CONSTRAINT fk_user_permissions_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_permissions_permission
    FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_permissions_granted_by
    FOREIGN KEY (granted_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL,
  target_user_id BIGINT UNSIGNED NULL,
  event_type VARCHAR(64) NOT NULL,
  before_permissions JSON NOT NULL,
  after_permissions JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_log_target_created (target_user_id, created_at),
  KEY idx_audit_log_actor_created (actor_user_id, created_at),
  CONSTRAINT fk_audit_log_actor
    FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_log_target
    FOREIGN KEY (target_user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  expires INT UNSIGNED NOT NULL,
  data MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (session_id),
  KEY idx_sessions_expires (expires)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_bin;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (token_hash),
  CONSTRAINT uq_password_reset_tokens_user UNIQUE (user_id),
  KEY idx_password_reset_tokens_expires (expires_at),
  CONSTRAINT fk_password_reset_tokens_user
    FOREIGN KEY (user_id) REFERENCES users (id)
    ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
