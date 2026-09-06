


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."quotation_status" AS ENUM (
    'draft',
    'sent',
    'approved',
    'rejected',
    'expired',
    'created'
);


ALTER TYPE "public"."quotation_status" OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_logs" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "action" character varying(255) NOT NULL,
    "entity_type" character varying(100),
    "entity_id" character varying(100),
    "description" "text"
);


ALTER TABLE "public"."activity_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" bigint NOT NULL,
    "name" character varying(100) NOT NULL,
    "color_hex" character varying(10) DEFAULT '#6B7280'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."brands" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."brands_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."brands_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."brands_id_seq" OWNED BY "public"."brands"."id";



CREATE TABLE IF NOT EXISTS "public"."business_unit_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_unit_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role_in_bu" "text" DEFAULT 'member'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."business_unit_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "color" "text" DEFAULT '#6366f1'::"text",
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."business_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."company_bank_accounts" (
    "id" "text" DEFAULT ("gen_random_uuid"())::"text" NOT NULL,
    "bank_name" "text" NOT NULL,
    "account_number" "text" NOT NULL,
    "account_name" "text" NOT NULL,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."company_bank_accounts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_pics" (
    "id" bigint NOT NULL,
    "customer_id" character varying(10),
    "name" character varying(100) NOT NULL,
    "phone" character varying(30),
    "email" character varying(100),
    "is_primary" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "sales_id" "uuid",
    "created_by" "uuid"
);


ALTER TABLE "public"."customer_pics" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."customer_pics_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."customer_pics_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."customer_pics_id_seq" OWNED BY "public"."customer_pics"."id";



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" character varying(10) NOT NULL,
    "name" character varying(150) NOT NULL,
    "total_spend" bigint DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "address" "text",
    "bu_id" "uuid",
    "created_by" "uuid"
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "title" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "link" character varying(255),
    "is_read" boolean DEFAULT false
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "sku" character varying(100) NOT NULL,
    "brand_id" bigint,
    "name" character varying(200) NOT NULL,
    "description" "text",
    "price" bigint NOT NULL,
    "image_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "pricelist_distributor" bigint DEFAULT 0,
    "diskon_distributor" numeric(5,2) DEFAULT 0,
    "modal" bigint DEFAULT 0,
    "margin_sales" numeric(5,2) DEFAULT 0
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotation_items" (
    "id" bigint NOT NULL,
    "quotation_id" character varying(20),
    "sku" character varying(100),
    "qty" integer NOT NULL,
    "price" bigint NOT NULL,
    "margin" numeric(5,2) DEFAULT 0,
    "sort_order" integer DEFAULT 0,
    "hpp" bigint DEFAULT 0,
    "is_pph_applied" boolean DEFAULT false,
    CONSTRAINT "quotation_items_qty_check" CHECK (("qty" > 0))
);


ALTER TABLE "public"."quotation_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."quotation_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."quotation_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quotation_items_id_seq" OWNED BY "public"."quotation_items"."id";



CREATE TABLE IF NOT EXISTS "public"."quotation_sales_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "quotation_id" "text" NOT NULL,
    "adjustments" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quotation_sales_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotation_terms" (
    "id" bigint NOT NULL,
    "quotation_id" character varying(20),
    "term_text" "text" NOT NULL,
    "sort_order" integer DEFAULT 0
);


ALTER TABLE "public"."quotation_terms" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."quotation_terms_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."quotation_terms_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quotation_terms_id_seq" OWNED BY "public"."quotation_terms"."id";



CREATE TABLE IF NOT EXISTS "public"."quotations" (
    "id" character varying(50) NOT NULL,
    "customer_id" character varying(10),
    "pic_id" bigint,
    "sales_id" "uuid",
    "bank_account_id" "text",
    "status" "public"."quotation_status" DEFAULT 'draft'::"public"."quotation_status",
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "expired" "date" NOT NULL,
    "calc_tax" boolean DEFAULT true,
    "show_tax" boolean DEFAULT true,
    "ppn_rate" numeric(5,4) DEFAULT 0.11,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "terms" "text"[],
    "is_deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "bu_id" "uuid",
    "calc_pph" boolean DEFAULT false,
    "show_pph" boolean DEFAULT false,
    "pph_rate" numeric DEFAULT 0.02
);


ALTER TABLE "public"."quotations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "id" bigint NOT NULL,
    "role" "text" NOT NULL,
    "permissions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


ALTER TABLE "public"."role_permissions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."role_permissions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."sales_order_costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "so_id" "text",
    "description" "text" NOT NULL,
    "amount" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sales_order_costs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_order_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "so_id" "text",
    "sku" "text",
    "qty" numeric DEFAULT 1 NOT NULL,
    "price" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sales_order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sales_orders" (
    "id" "text" NOT NULL,
    "quotation_id" "text",
    "date" "date" NOT NULL,
    "customer_id" "text",
    "sales_id" "text",
    "bu_id" "text",
    "status" "text" DEFAULT 'Dibuat Sales'::"text" NOT NULL,
    "total_item_value" numeric DEFAULT 0 NOT NULL,
    "total_cost" numeric DEFAULT 0 NOT NULL,
    "grand_total" numeric DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sales_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "key" character varying(50) NOT NULL,
    "value" "jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "sales_code" character varying(10) NOT NULL,
    "name" character varying(100) NOT NULL,
    "role" character varying(50) NOT NULL,
    "email" character varying(100) NOT NULL,
    "mobile" character varying(20),
    "avatar_initials" character varying(5),
    "avatar_url" "text",
    "signature_url" "text",
    "target_sales" bigint DEFAULT 0,
    "achieved_sales" bigint DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_role_check" CHECK ((("role")::"text" = ANY ((ARRAY['Administrator'::character varying, 'admin'::character varying, 'Manager'::character varying, 'Sales Manager'::character varying, 'Sales'::character varying, 'Presales'::character varying, 'Finance'::character varying])::"text"[])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."brands" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."brands_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."customer_pics" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."customer_pics_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quotation_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quotation_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quotation_terms" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quotation_terms_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_unit_members"
    ADD CONSTRAINT "business_unit_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_unit_members"
    ADD CONSTRAINT "business_unit_members_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."business_units"
    ADD CONSTRAINT "business_units_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."business_units"
    ADD CONSTRAINT "business_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_bank_accounts"
    ADD CONSTRAINT "company_bank_accounts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_pics"
    ADD CONSTRAINT "customer_pics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("sku");



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotation_sales_notes"
    ADD CONSTRAINT "quotation_sales_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotation_sales_notes"
    ADD CONSTRAINT "quotation_sales_notes_quotation_id_key" UNIQUE ("quotation_id");



ALTER TABLE ONLY "public"."quotation_terms"
    ADD CONSTRAINT "quotation_terms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_role_key" UNIQUE ("role");



ALTER TABLE ONLY "public"."sales_order_costs"
    ADD CONSTRAINT "sales_order_costs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_sales_code_key" UNIQUE ("sales_code");



CREATE INDEX "idx_bu_members_bu_id" ON "public"."business_unit_members" USING "btree" ("business_unit_id");



CREATE INDEX "idx_bu_members_user_id" ON "public"."business_unit_members" USING "btree" ("user_id");



CREATE INDEX "idx_customers_bu_id" ON "public"."customers" USING "btree" ("bu_id");



CREATE INDEX "idx_quotations_bu_id" ON "public"."quotations" USING "btree" ("bu_id");



CREATE INDEX "idx_quotations_is_deleted" ON "public"."quotations" USING "btree" ("is_deleted");



ALTER TABLE ONLY "public"."activity_logs"
    ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_unit_members"
    ADD CONSTRAINT "business_unit_members_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_unit_members"
    ADD CONSTRAINT "business_unit_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_pics"
    ADD CONSTRAINT "customer_pics_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customer_pics"
    ADD CONSTRAINT "customer_pics_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_pics"
    ADD CONSTRAINT "customer_pics_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_bu_id_fkey" FOREIGN KEY ("bu_id") REFERENCES "public"."business_units"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotation_items"
    ADD CONSTRAINT "quotation_items_sku_fkey" FOREIGN KEY ("sku") REFERENCES "public"."products"("sku");



ALTER TABLE ONLY "public"."quotation_sales_notes"
    ADD CONSTRAINT "quotation_sales_notes_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotation_terms"
    ADD CONSTRAINT "quotation_terms_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "public"."company_bank_accounts"("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_bu_id_fkey" FOREIGN KEY ("bu_id") REFERENCES "public"."business_units"("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_pic_id_fkey" FOREIGN KEY ("pic_id") REFERENCES "public"."customer_pics"("id");



ALTER TABLE ONLY "public"."quotations"
    ADD CONSTRAINT "quotations_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "public"."users"("id");



ALTER TABLE ONLY "public"."sales_order_costs"
    ADD CONSTRAINT "sales_order_costs_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "public"."sales_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_order_items"
    ADD CONSTRAINT "sales_order_items_so_id_fkey" FOREIGN KEY ("so_id") REFERENCES "public"."sales_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales_orders"
    ADD CONSTRAINT "sales_orders_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow auth write access to system_settings" ON "public"."system_settings" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow authenticated read on system_settings" ON "public"."system_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated write on system_settings" ON "public"."system_settings" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow public read access to system_settings" ON "public"."system_settings" FOR SELECT USING (true);



CREATE POLICY "Authenticated can read all users" ON "public"."users" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can manage sales notes" ON "public"."quotation_sales_notes" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Enable delete for authenticated users" ON "public"."users" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."customer_pics" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."customers" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."quotation_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."quotations" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."users" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."users" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Hanya admin yang bisa ubah permissions" ON "public"."role_permissions" USING ((("auth"."jwt"() ->> 'role'::"text") = ANY (ARRAY['admin'::"text", 'Administrator'::"text"])));



CREATE POLICY "Semua user bisa baca permissions" ON "public"."role_permissions" FOR SELECT USING (true);



CREATE POLICY "System can insert notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can insert activity logs" ON "public"."activity_logs" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own profile" ON "public"."users" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own activity logs" ON "public"."activity_logs" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."users"
  WHERE (("users"."id" = "auth"."uid"()) AND (("users"."role")::"text" = ANY ((ARRAY['admin'::character varying, 'Administrator'::character varying])::"text"[])))))));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."activity_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "allow_auth_delete_bank_accounts" ON "public"."company_bank_accounts" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "allow_auth_insert_bank_accounts" ON "public"."company_bank_accounts" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "allow_auth_select_bank_accounts" ON "public"."company_bank_accounts" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "allow_auth_update_bank_accounts" ON "public"."company_bank_accounts" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can manage bu_members" ON "public"."business_unit_members" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can manage business_units" ON "public"."business_units" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "authenticated can read bu_members" ON "public"."business_unit_members" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "authenticated can read business_units" ON "public"."business_units" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."business_unit_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."company_bank_accounts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_sales_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotation_terms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_order_costs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_order_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "so_costs_delete" ON "public"."sales_order_costs" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "so_costs_insert" ON "public"."sales_order_costs" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "so_costs_select" ON "public"."sales_order_costs" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "so_costs_update" ON "public"."sales_order_costs" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "so_delete" ON "public"."sales_orders" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "so_insert" ON "public"."sales_orders" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "so_items_delete" ON "public"."sales_order_items" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "so_items_insert" ON "public"."sales_order_items" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "so_items_select" ON "public"."sales_order_items" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "so_items_update" ON "public"."sales_order_items" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "so_select" ON "public"."sales_orders" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "so_update" ON "public"."sales_orders" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



ALTER TABLE "public"."system_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT ALL ON TABLE "public"."activity_logs" TO "anon";
GRANT ALL ON TABLE "public"."activity_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_logs" TO "service_role";



GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";



GRANT ALL ON SEQUENCE "public"."brands_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."brands_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."brands_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."business_unit_members" TO "anon";
GRANT ALL ON TABLE "public"."business_unit_members" TO "authenticated";
GRANT ALL ON TABLE "public"."business_unit_members" TO "service_role";



GRANT ALL ON TABLE "public"."business_units" TO "anon";
GRANT ALL ON TABLE "public"."business_units" TO "authenticated";
GRANT ALL ON TABLE "public"."business_units" TO "service_role";



GRANT ALL ON TABLE "public"."company_bank_accounts" TO "anon";
GRANT ALL ON TABLE "public"."company_bank_accounts" TO "authenticated";
GRANT ALL ON TABLE "public"."company_bank_accounts" TO "service_role";



GRANT ALL ON TABLE "public"."customer_pics" TO "anon";
GRANT ALL ON TABLE "public"."customer_pics" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_pics" TO "service_role";



GRANT ALL ON SEQUENCE "public"."customer_pics_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customer_pics_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customer_pics_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."quotation_items" TO "anon";
GRANT ALL ON TABLE "public"."quotation_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quotation_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quotation_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quotation_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quotation_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quotation_sales_notes" TO "anon";
GRANT ALL ON TABLE "public"."quotation_sales_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotation_sales_notes" TO "service_role";



GRANT ALL ON TABLE "public"."quotation_terms" TO "anon";
GRANT ALL ON TABLE "public"."quotation_terms" TO "authenticated";
GRANT ALL ON TABLE "public"."quotation_terms" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quotation_terms_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quotation_terms_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quotation_terms_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quotations" TO "anon";
GRANT ALL ON TABLE "public"."quotations" TO "authenticated";
GRANT ALL ON TABLE "public"."quotations" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."role_permissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."role_permissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."role_permissions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sales_order_costs" TO "anon";
GRANT ALL ON TABLE "public"."sales_order_costs" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_order_costs" TO "service_role";



GRANT ALL ON TABLE "public"."sales_order_items" TO "anon";
GRANT ALL ON TABLE "public"."sales_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_order_items" TO "service_role";



GRANT ALL ON TABLE "public"."sales_orders" TO "anon";
GRANT ALL ON TABLE "public"."sales_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_orders" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































