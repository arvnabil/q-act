-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.users (
  id uuid NOT NULL,
  sales_code character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['Administrator'::character varying, 'admin'::character varying, 'Manager'::character varying, 'Sales Manager'::character varying, 'Sales'::character varying, 'Presales'::character varying, 'Finance'::character varying]::text[])),
  email character varying NOT NULL UNIQUE,
  mobile character varying,
  avatar_initials character varying,
  avatar_url text,
  signature_url text,
  target_sales bigint DEFAULT 0,
  achieved_sales bigint DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.customers (
  id character varying NOT NULL,
  name character varying NOT NULL,
  total_spend bigint DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  address text,
  bu_id uuid,
  created_by uuid,
  CONSTRAINT customers_pkey PRIMARY KEY (id),
  CONSTRAINT customers_bu_id_fkey FOREIGN KEY (bu_id) REFERENCES public.business_units(id),
  CONSTRAINT customers_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.customer_pics (
  id bigint NOT NULL DEFAULT nextval('customer_pics_id_seq'::regclass),
  customer_id character varying,
  name character varying NOT NULL,
  phone character varying,
  email character varying,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  sales_id uuid,
  created_by uuid,
  CONSTRAINT customer_pics_pkey PRIMARY KEY (id),
  CONSTRAINT customer_pics_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT customer_pics_sales_id_fkey FOREIGN KEY (sales_id) REFERENCES public.users(id),
  CONSTRAINT customer_pics_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
CREATE TABLE public.brands (
  id bigint NOT NULL DEFAULT nextval('brands_id_seq'::regclass),
  name character varying NOT NULL UNIQUE,
  color_hex character varying NOT NULL DEFAULT '#6B7280'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT brands_pkey PRIMARY KEY (id)
);
CREATE TABLE public.products (
  sku character varying NOT NULL,
  brand_id bigint,
  name character varying NOT NULL,
  description text,
  price bigint NOT NULL,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  pricelist_distributor bigint DEFAULT 0,
  diskon_distributor numeric DEFAULT 0,
  modal bigint DEFAULT 0,
  margin_sales numeric DEFAULT 0,
  CONSTRAINT products_pkey PRIMARY KEY (sku),
  CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id)
);
CREATE TABLE public.company_bank_accounts (
  id text NOT NULL DEFAULT (gen_random_uuid())::text,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT company_bank_accounts_pkey PRIMARY KEY (id)
);
CREATE TABLE public.quotations (
  id character varying NOT NULL,
  customer_id character varying,
  pic_id bigint,
  sales_id uuid,
  bank_account_id text,
  status USER-DEFINED DEFAULT 'draft'::quotation_status,
  date date NOT NULL DEFAULT CURRENT_DATE,
  expired date NOT NULL,
  calc_tax boolean DEFAULT true,
  show_tax boolean DEFAULT true,
  ppn_rate numeric DEFAULT 0.11,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  terms ARRAY,
  is_deleted boolean DEFAULT false,
  deleted_at timestamp with time zone,
  bu_id uuid,
  calc_pph boolean DEFAULT false,
  show_pph boolean DEFAULT false,
  pph_rate numeric DEFAULT 0.02,
  CONSTRAINT quotations_pkey PRIMARY KEY (id),
  CONSTRAINT quotations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id),
  CONSTRAINT quotations_pic_id_fkey FOREIGN KEY (pic_id) REFERENCES public.customer_pics(id),
  CONSTRAINT quotations_sales_id_fkey FOREIGN KEY (sales_id) REFERENCES public.users(id),
  CONSTRAINT quotations_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.company_bank_accounts(id),
  CONSTRAINT quotations_bu_id_fkey FOREIGN KEY (bu_id) REFERENCES public.business_units(id)
);
CREATE TABLE public.quotation_items (
  id bigint NOT NULL DEFAULT nextval('quotation_items_id_seq'::regclass),
  quotation_id character varying,
  sku character varying,
  qty integer NOT NULL CHECK (qty > 0),
  price bigint NOT NULL,
  margin numeric DEFAULT 0,
  sort_order integer DEFAULT 0,
  hpp bigint DEFAULT 0,
  is_pph_applied boolean DEFAULT false,
  CONSTRAINT quotation_items_pkey PRIMARY KEY (id),
  CONSTRAINT quotation_items_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id),
  CONSTRAINT quotation_items_sku_fkey FOREIGN KEY (sku) REFERENCES public.products(sku)
);
CREATE TABLE public.quotation_terms (
  id bigint NOT NULL DEFAULT nextval('quotation_terms_id_seq'::regclass),
  quotation_id character varying,
  term_text text NOT NULL,
  sort_order integer DEFAULT 0,
  CONSTRAINT quotation_terms_pkey PRIMARY KEY (id),
  CONSTRAINT quotation_terms_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id)
);
CREATE TABLE public.role_permissions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  role text NOT NULL UNIQUE,
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT role_permissions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.system_settings (
  key character varying NOT NULL,
  value jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);
CREATE TABLE public.business_units (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  color text DEFAULT '#6366f1'::text,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_units_pkey PRIMARY KEY (id)
);
CREATE TABLE public.business_unit_members (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  business_unit_id uuid NOT NULL,
  user_id uuid NOT NULL UNIQUE,
  role_in_bu text NOT NULL DEFAULT 'member'::text,
  joined_at timestamp with time zone DEFAULT now(),
  CONSTRAINT business_unit_members_pkey PRIMARY KEY (id),
  CONSTRAINT business_unit_members_business_unit_id_fkey FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id),
  CONSTRAINT business_unit_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  action character varying NOT NULL,
  entity_type character varying,
  entity_id character varying,
  description text,
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  title character varying NOT NULL,
  message text NOT NULL,
  link character varying,
  is_read boolean DEFAULT false,
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.sales_orders (
  id text NOT NULL,
  quotation_id text,
  date date NOT NULL,
  customer_id text,
  sales_id text,
  bu_id text,
  status text NOT NULL DEFAULT 'Dibuat Sales'::text,
  total_item_value numeric NOT NULL DEFAULT 0,
  total_cost numeric NOT NULL DEFAULT 0,
  grand_total numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sales_orders_pkey PRIMARY KEY (id),
  CONSTRAINT sales_orders_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id),
  CONSTRAINT sales_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id)
);
CREATE TABLE public.sales_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  so_id text,
  sku text,
  qty numeric NOT NULL DEFAULT 1,
  price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sales_order_items_pkey PRIMARY KEY (id),
  CONSTRAINT sales_order_items_so_id_fkey FOREIGN KEY (so_id) REFERENCES public.sales_orders(id)
);
CREATE TABLE public.sales_order_costs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  so_id text,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sales_order_costs_pkey PRIMARY KEY (id),
  CONSTRAINT sales_order_costs_so_id_fkey FOREIGN KEY (so_id) REFERENCES public.sales_orders(id)
);
CREATE TABLE public.quotation_sales_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quotation_id text NOT NULL UNIQUE,
  adjustments jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quotation_sales_notes_pkey PRIMARY KEY (id),
  CONSTRAINT quotation_sales_notes_quotation_id_fkey FOREIGN KEY (quotation_id) REFERENCES public.quotations(id)
);