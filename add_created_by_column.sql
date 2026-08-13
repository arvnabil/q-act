-- Optional Migration SQL: Add created_by column to customers & customer_pics tables
ALTER TABLE IF EXISTS customers 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS customer_pics 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
