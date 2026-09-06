-- ============================================================
-- MySQL 8.0+ version of the Postgres schema
-- Notes / assumptions made during conversion:
--   * uuid                -> CHAR(36), default via UUID() (or generate in app layer)
--   * character varying   -> VARCHAR(255) unless a shorter/longer length was obvious
--   * boolean              -> TINYINT(1) (MySQL's BOOLEAN alias)
--   * timestamptz          -> TIMESTAMP (MySQL has no separate tz-aware type)
--   * jsonb                -> JSON
--   * ARRAY (quotations.terms) -> converted to JSON (MySQL has no native array type)
--   * USER-DEFINED enum (quotation_status) -> native MySQL ENUM
--   * SERIAL/IDENTITY/nextval -> AUTO_INCREMENT
--   * auth.users (Supabase-specific) has no MySQL equivalent -> FK removed,
--     column kept as plain CHAR(36); manage the relationship in the app layer
--   * CHECK constraints kept (supported MySQL 8.0.16+)
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- business_units (created early: referenced by customers, quotations)
-- ------------------------------------------------------------
CREATE TABLE business_units (
  id CHAR(36) NOT NULL, -- generate with UUID() in app or a BEFORE INSERT trigger
  name TEXT NOT NULL,
  code VARCHAR(255) NOT NULL UNIQUE,
  color VARCHAR(20) DEFAULT '#6366f1',
  description TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- users  (auth.users FK removed – no Supabase auth schema in plain MySQL)
-- ------------------------------------------------------------
CREATE TABLE users (
  id CHAR(36) NOT NULL,
  sales_code VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  mobile VARCHAR(50),
  avatar_initials VARCHAR(10),
  avatar_url TEXT,
  signature_url TEXT,
  target_sales BIGINT DEFAULT 0,
  achieved_sales BIGINT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_users_role CHECK (role IN ('Administrator','admin','Manager','Sales Manager','Sales','Presales','Finance'))
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- customers
-- ------------------------------------------------------------
CREATE TABLE customers (
  id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  total_spend BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  address TEXT,
  bu_id CHAR(36),
  created_by CHAR(36),
  PRIMARY KEY (id),
  CONSTRAINT fk_customers_bu FOREIGN KEY (bu_id) REFERENCES business_units(id),
  CONSTRAINT fk_customers_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- customer_pics
-- ------------------------------------------------------------
CREATE TABLE customer_pics (
  id BIGINT NOT NULL AUTO_INCREMENT,
  customer_id VARCHAR(64),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  email VARCHAR(255),
  is_primary TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sales_id CHAR(36),
  created_by CHAR(36),
  PRIMARY KEY (id),
  CONSTRAINT fk_pics_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_pics_sales FOREIGN KEY (sales_id) REFERENCES users(id),
  CONSTRAINT fk_pics_created_by FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- brands
-- ------------------------------------------------------------
CREATE TABLE brands (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  color_hex VARCHAR(20) NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- products
-- ------------------------------------------------------------
CREATE TABLE products (
  sku VARCHAR(64) NOT NULL,
  brand_id BIGINT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price BIGINT NOT NULL,
  image_url TEXT,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  pricelist_distributor BIGINT DEFAULT 0,
  diskon_distributor DECIMAL(10,2) DEFAULT 0,
  modal BIGINT DEFAULT 0,
  margin_sales DECIMAL(10,2) DEFAULT 0,
  PRIMARY KEY (sku),
  CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- company_bank_accounts
-- ------------------------------------------------------------
CREATE TABLE company_bank_accounts (
  id VARCHAR(64) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(64) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  is_default TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- quotations  (status enum, terms array -> JSON)
-- ------------------------------------------------------------
CREATE TABLE quotations (
  id VARCHAR(64) NOT NULL,
  customer_id VARCHAR(64),
  pic_id BIGINT,
  sales_id CHAR(36),
  bank_account_id VARCHAR(64),
  status ENUM('draft','sent','accepted','rejected','expired') DEFAULT 'draft',
  date DATE NOT NULL DEFAULT (CURRENT_DATE),
  expired DATE NOT NULL,
  calc_tax TINYINT(1) DEFAULT 1,
  show_tax TINYINT(1) DEFAULT 1,
  ppn_rate DECIMAL(5,4) DEFAULT 0.11,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  terms JSON,
  is_deleted TINYINT(1) DEFAULT 0,
  deleted_at TIMESTAMP NULL,
  bu_id CHAR(36),
  calc_pph TINYINT(1) DEFAULT 0,
  show_pph TINYINT(1) DEFAULT 0,
  pph_rate DECIMAL(5,4) DEFAULT 0.02,
  PRIMARY KEY (id),
  CONSTRAINT fk_quotations_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
  CONSTRAINT fk_quotations_pic FOREIGN KEY (pic_id) REFERENCES customer_pics(id),
  CONSTRAINT fk_quotations_sales FOREIGN KEY (sales_id) REFERENCES users(id),
  CONSTRAINT fk_quotations_bank FOREIGN KEY (bank_account_id) REFERENCES company_bank_accounts(id),
  CONSTRAINT fk_quotations_bu FOREIGN KEY (bu_id) REFERENCES business_units(id)
) ENGINE=InnoDB;
-- NOTE: adjust the ENUM values above to match your actual quotation_status list in Postgres.

-- ------------------------------------------------------------
-- quotation_items
-- ------------------------------------------------------------
CREATE TABLE quotation_items (
  id BIGINT NOT NULL AUTO_INCREMENT,
  quotation_id VARCHAR(64),
  sku VARCHAR(64),
  qty INT NOT NULL,
  price BIGINT NOT NULL,
  margin DECIMAL(10,2) DEFAULT 0,
  sort_order INT DEFAULT 0,
  hpp BIGINT DEFAULT 0,
  is_pph_applied TINYINT(1) DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT chk_qty_positive CHECK (qty > 0),
  CONSTRAINT fk_qitems_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id),
  CONSTRAINT fk_qitems_sku FOREIGN KEY (sku) REFERENCES products(sku)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- quotation_terms
-- ------------------------------------------------------------
CREATE TABLE quotation_terms (
  id BIGINT NOT NULL AUTO_INCREMENT,
  quotation_id VARCHAR(64),
  term_text TEXT NOT NULL,
  sort_order INT DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_qterms_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- role_permissions
-- ------------------------------------------------------------
CREATE TABLE role_permissions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  role VARCHAR(50) NOT NULL UNIQUE,
  permissions JSON NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- system_settings
-- ------------------------------------------------------------
CREATE TABLE system_settings (
  `key` VARCHAR(255) NOT NULL,
  value JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- business_unit_members
-- ------------------------------------------------------------
CREATE TABLE business_unit_members (
  id CHAR(36) NOT NULL,
  business_unit_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL UNIQUE,
  role_in_bu VARCHAR(50) NOT NULL DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_bum_bu FOREIGN KEY (business_unit_id) REFERENCES business_units(id),
  CONSTRAINT fk_bum_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- activity_logs
-- ------------------------------------------------------------
CREATE TABLE activity_logs (
  id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id CHAR(36),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  description TEXT,
  PRIMARY KEY (id),
  CONSTRAINT fk_logs_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
CREATE TABLE notifications (
  id CHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  user_id CHAR(36),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(255),
  is_read TINYINT(1) DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- sales_orders
-- ------------------------------------------------------------
CREATE TABLE sales_orders (
  id VARCHAR(64) NOT NULL,
  quotation_id VARCHAR(64),
  date DATE NOT NULL,
  customer_id VARCHAR(64),
  sales_id VARCHAR(64),
  bu_id VARCHAR(64),
  status VARCHAR(50) NOT NULL DEFAULT 'Dibuat Sales',
  total_item_value DECIMAL(18,2) NOT NULL DEFAULT 0,
  total_cost DECIMAL(18,2) NOT NULL DEFAULT 0,
  grand_total DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_so_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id),
  CONSTRAINT fk_so_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- sales_order_items
-- ------------------------------------------------------------
CREATE TABLE sales_order_items (
  id CHAR(36) NOT NULL,
  so_id VARCHAR(64),
  sku VARCHAR(64),
  qty DECIMAL(18,2) NOT NULL DEFAULT 1,
  price DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_soi_so FOREIGN KEY (so_id) REFERENCES sales_orders(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- sales_order_costs
-- ------------------------------------------------------------
CREATE TABLE sales_order_costs (
  id CHAR(36) NOT NULL,
  so_id VARCHAR(64),
  description TEXT NOT NULL,
  amount DECIMAL(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_soc_so FOREIGN KEY (so_id) REFERENCES sales_orders(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- quotation_sales_notes
-- ------------------------------------------------------------
CREATE TABLE quotation_sales_notes (
  id CHAR(36) NOT NULL,
  quotation_id VARCHAR(64) NOT NULL UNIQUE,
  adjustments JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_qsn_quotation FOREIGN KEY (quotation_id) REFERENCES quotations(id)
) ENGINE=InnoDB;

SET FOREIGN_KEY_CHECKS = 1;