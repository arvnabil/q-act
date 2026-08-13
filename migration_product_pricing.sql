-- Migration: Tambah kolom harga distributor ke tabel products
-- dan kolom hpp ke quotation_items
-- Jalankan di Supabase SQL Editor

-- 1. Kolom di tabel products (data tetap per produk dari distributor)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS pricelist_distributor BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS diskon_distributor DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS modal BIGINT DEFAULT 0;

-- 2. Kolom hpp (HPP/modal) di tabel quotation_items
--    Agar HPP per-item tersimpan sebagai snapshot saat penawaran dibuat
ALTER TABLE public.quotation_items
ADD COLUMN IF NOT EXISTS hpp BIGINT DEFAULT 0;

-- Verifikasi
SELECT 'products' AS tbl, column_name, data_type FROM information_schema.columns 
WHERE table_name = 'products' AND column_name IN ('pricelist_distributor','diskon_distributor','modal')
UNION ALL
SELECT 'quotation_items', column_name, data_type FROM information_schema.columns 
WHERE table_name = 'quotation_items' AND column_name = 'hpp';
