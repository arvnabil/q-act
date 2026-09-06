#!/usr/bin/env python3
"""
Convert Supabase PostgreSQL dump to MySQL-compatible SQL.
Usage: python convert_supabase.py supabase_data.sql output_mysql.sql
"""

import re
import sys
import json

ALLOWED_TABLES = [
    'business_units',
    'business_unit_members',
    'users',
    'customers',
    'customer_pics',
    'brands',
    'products',
    'company_bank_accounts',
    'quotations',
    'quotation_items',
    'quotation_sales_notes',
    'sales_orders',
    'sales_order_items',
    'system_settings',
    'sales_targets',
]


def pg_array_to_json(value):
    """Convert PostgreSQL array string like {"a","b","c"} to JSON array ["a","b","c"]."""
    if value is None or not isinstance(value, str):
        return value
    stripped = value.strip()
    if stripped.startswith('{') and stripped.endswith('}'):
        # It's a PG array
        inner = stripped[1:-1]
        try:
            # Try parsing as JSON first (it might already be valid JSON-like)
            items = []
            # Split by comma but respect quoted strings
            in_quote = False
            current = ''
            for ch in inner:
                if ch == '"' and not in_quote:
                    in_quote = True
                    current += ch
                elif ch == '"' and in_quote:
                    in_quote = False
                    current += ch
                elif ch == ',' and not in_quote:
                    items.append(current.strip())
                    current = ''
                else:
                    current += ch
            if current.strip():
                items.append(current.strip())
            
            # Parse each item
            parsed = []
            for item in items:
                item = item.strip()
                if item.startswith('"') and item.endswith('"'):
                    # Quoted string
                    parsed.append(item[1:-1])
                elif item == 'NULL' or item == 'null':
                    parsed.append(None)
                elif item.lower() in ('true', 'false'):
                    parsed.append(item.lower() == 'true')
                else:
                    try:
                        parsed.append(int(item))
                    except ValueError:
                        try:
                            parsed.append(float(item))
                        except ValueError:
                            parsed.append(item)
            return json.dumps(parsed, ensure_ascii=False)
        except Exception as e:
            print(f"  Warning: Could not convert array {stripped[:50]}: {e}")
            return json.dumps([stripped])
    return value


def parse_pg_row(row_str):
    """Parse a PostgreSQL VALUES row like ('a', 'b', NULL, true, 42) into a list of values."""
    row_str = row_str.strip()
    if row_str.startswith('('):
        row_str = row_str[1:]
    if row_str.endswith(')'):
        row_str = row_str[:-1]
    
    values = []
    i = 0
    n = len(row_str)
    
    while i < n:
        # Skip whitespace
        while i < n and row_str[i] in ' \t\n\r':
            i += 1
        if i >= n:
            break
        
        if row_str[i] == "'":
            # String value - find closing quote (handle escaped quotes '')
            i += 1
            val = ''
            while i < n:
                if row_str[i] == "'" and i + 1 < n and row_str[i+1] == "'":
                    val += "'"
                    i += 2
                elif row_str[i] == "'":
                    i += 1
                    break
                else:
                    val += row_str[i]
                    i += 1
            values.append(('string', val))
        elif row_str[i:i+4] == 'NULL':
            values.append(('null', None))
            i += 4
        elif row_str[i:i+4] == 'true':
            values.append(('bool', True))
            i += 4
        elif row_str[i:i+5] == 'false':
            values.append(('bool', False))
            i += 5
        elif row_str[i] in '0123456789-':
            # Number
            j = i
            while j < n and row_str[j] not in ',)':
                j += 1
            num_str = row_str[i:j].strip()
            if '.' in num_str:
                values.append(('float', float(num_str)))
            else:
                values.append(('int', int(num_str)))
            i = j
        else:
            # Unknown, treat as raw
            j = i
            while j < n and row_str[j] not in ',':
                j += 1
            values.append(('raw', row_str[i:j].strip()))
            i = j
        
        # Skip comma
        while i < n and row_str[i] in ' \t':
            i += 1
        if i < n and row_str[i] == ',':
            i += 1
    
    return values


def format_value_for_mysql(typ, val, col_name=None):
    """Format a parsed value for MySQL INSERT."""
    if typ == 'null':
        return 'NULL'
    elif typ == 'bool':
        return '1' if val else '0'
    elif typ in ('int', 'float'):
        return str(val)
    elif typ == 'string':
        # Check if this might be a PG array that should be JSON
        if val.startswith('{') and val.endswith('}') and col_name and col_name in ('terms', 'adjustments', 'allowed_mime_types'):
            val = pg_array_to_json(val)
        # Strip timezone from timestamps
        val = re.sub(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.\d+[+-]\d{2}', r'\1', val)
        val = re.sub(r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})[+-]\d{2}', r'\1', val)
        # Escape backslashes and single quotes for MySQL
        val = val.replace('\\', '\\\\')
        val = val.replace("'", "\\'")
        return f"'{val}'"
    elif typ == 'raw':
        return val
    return 'NULL'


def process_table_block(table_name, block_str, output_lines):
    """Process a single INSERT block and write MySQL INSERT statements."""
    # Parse columns
    col_match = re.search(r'\("(.+?)"\)\s*VALUES', block_str, re.DOTALL)
    if not col_match:
        print(f"  Warning: Could not find columns for {table_name}")
        return 0

    raw_cols = col_match.group(1)
    columns = [c.strip().strip('"') for c in raw_cols.split('", "')]
    
    # Find start of VALUES data
    values_start = col_match.end()
    values_str = block_str[values_start:].strip()
    
    # Strip trailing comments and non-VALUES SQL
    # Remove everything after the last ); that is followed by --
    values_str = re.sub(r';\s*--[\s\S]*$', '', values_str)
    values_str = values_str.rstrip(';').strip()
    
    # Now parse rows - find each row starting with \t( or ,\n\t(
    # We need to parse carefully since strings can contain newlines
    rows = []
    i = 0
    n = len(values_str)
    
    while i < n:
        # Find start of a row: a '(' that's at the start of a line (possibly preceded by tab/comma/newline)
        # Skip whitespace and commas
        while i < n and values_str[i] in ' \t\n\r,':
            i += 1
        if i >= n:
            break
        
        if values_str[i] != '(':
            # Not a row start, skip
            i += 1
            continue
        
        # Find the matching closing ')'
        # We need to track nested parens and quoted strings
        depth = 0
        j = i
        in_str = False
        
        while j < n:
            c = values_str[j]
            if c == "'" and not in_str:
                in_str = True
                j += 1
            elif c == "'" and in_str:
                if j + 1 < n and values_str[j+1] == "'":
                    j += 2  # escaped quote
                else:
                    in_str = False
                    j += 1
            elif c == '(' and not in_str:
                depth += 1
                j += 1
            elif c == ')' and not in_str:
                depth -= 1
                j += 1
                if depth == 0:
                    break
            else:
                j += 1
        
        row_str = values_str[i:j]
        rows.append(row_str)
        i = j
    
    if not rows:
        print(f"  Warning: No rows parsed for {table_name}")
        return 0
    
    # Build MySQL INSERT statements (batch of 50 rows)
    col_list = '`' + '`, `'.join(columns) + '`'
    batch_size = 50
    count = 0
    
    for batch_start in range(0, len(rows), batch_size):
        batch = rows[batch_start:batch_start + batch_size]
        row_strings = []
        
        for row_str in batch:
            parsed = parse_pg_row(row_str)
            if len(parsed) != len(columns):
                print(f"  Warning: Column count mismatch in {table_name}: expected {len(columns)}, got {len(parsed)}")
                # Try to continue with what we have
                while len(parsed) < len(columns):
                    parsed.append(('null', None))
            
            vals = []
            for idx, (typ, val) in enumerate(parsed):
                col_name = columns[idx] if idx < len(columns) else None
                vals.append(format_value_for_mysql(typ, val, col_name))
            
            row_strings.append('(' + ', '.join(vals) + ')')
            count += 1
        
        output_lines.append(f"INSERT IGNORE INTO `{table_name}` ({col_list}) VALUES")
        output_lines.append(',\n'.join(row_strings) + ';')
    
    return count


def main():
    if len(sys.argv) < 3:
        print("Usage: python convert_supabase.py input.sql output.sql")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    print(f"Reading {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    output_lines = [
        "-- MySQL import from Supabase PostgreSQL dump",
        "-- Generated by convert_supabase.py",
        "",
        "SET FOREIGN_KEY_CHECKS=0;",
        "SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';",
        "SET NAMES utf8mb4;",
        "",
    ]
    
    # Split by INSERT INTO "public"."
    parts = content.split('INSERT INTO "public"."')
    parts = parts[1:]  # Skip header
    
    print(f"Found {len(parts)} table blocks")
    
    total_rows = 0
    for part in parts:
        # Extract table name
        table_end = part.find('"')
        if table_end == -1:
            continue
        table_name = part[:table_end]
        
        if table_name not in ALLOWED_TABLES:
            continue
        
        print(f"Processing: {table_name}...")
        output_lines.append(f"\n-- Table: {table_name}")
        
        count = process_table_block(table_name, part, output_lines)
        print(f"  -> {count} rows")
        total_rows += count
    
    output_lines.append("\nSET FOREIGN_KEY_CHECKS=1;")
    
    print(f"\nWriting {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write('\n'.join(output_lines))
    
    print(f"Done! Total rows processed: {total_rows}")


if __name__ == '__main__':
    main()
