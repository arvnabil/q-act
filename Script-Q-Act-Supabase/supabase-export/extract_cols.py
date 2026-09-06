
allowed = [
    "business_units", "business_unit_members", "customers", "customer_pics",
    "brands", "products", "quotations", "quotation_items", "quotation_sales_notes"
]
with open("supabase_data-new-v2.sql", "r", encoding="utf-8") as f:
    for line in f:
        if line.startswith("INSERT INTO \"public\".\""):
            start = line.find("\"public\".\"") + 10
            end = line.find("\"", start)
            table_name = line[start:end]
            if table_name in allowed:
                col_start = line.find("(")
                col_end = line.find(") VALUES")
                print(f"{table_name} COLUMNS: {line[col_start:col_end]}")

