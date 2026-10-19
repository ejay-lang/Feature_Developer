-- Apply after migrations 001_auth_sessions.sql through 004_superadmin_management.sql.
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
