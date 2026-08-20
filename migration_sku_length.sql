-- Migration: Perbesar tipe data SKU dari VARCHAR(30) menjadi VARCHAR(100)
-- Jalankan di Supabase SQL Editor

BEGIN;

-- 1. Ubah tipe data kolom sku di tabel products
ALTER TABLE public.products 
ALTER COLUMN sku TYPE VARCHAR(100);

-- 2. Ubah tipe data kolom sku di tabel quotation_items yang mereferensikannya
ALTER TABLE public.quotation_items 
ALTER COLUMN sku TYPE VARCHAR(100);

COMMIT;
