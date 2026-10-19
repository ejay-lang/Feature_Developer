-- Apply once after the existing HOPE users/auth schema has been migrated.
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

ALTER TABLE users
  ADD COLUMN role_id INT UNSIGNED NOT NULL DEFAULT 3,
  ADD KEY idx_users_role_status (role_id, status),
  ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles (id);
