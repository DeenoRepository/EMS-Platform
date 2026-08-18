#!/usr/bin/env python3
import os
import re
import subprocess
import csv

def parse_and_export_dump(dump_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    dump_name = os.path.basename(dump_path)
    print(f"\nProcessing dump: {dump_name}")

    # Run pg_restore to get SQL stream
    cmd = ["pg_restore", "-a", "-f", "-", dump_path]
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, encoding="utf-8", errors="replace")

    current_table = None
    columns = []
    rows = []
    in_copy = False

    copy_regex = re.compile(r'^COPY\s+(?:public\.)?(?:"?(\w+)"?)\s*\((.*?)\)\s*FROM\s+stdin;', re.IGNORECASE)

    for line in process.stdout:
        line_strip = line.rstrip('\r\n')
        if in_copy:
            if line_strip == r'\.':
                in_copy = False
                # Write current table to CSV
                csv_filename = f"{current_table}.csv"
                csv_filepath = os.path.join(output_dir, csv_filename)
                with open(csv_filepath, 'w', newline='', encoding='utf-8-sig') as f:
                    writer = csv.writer(f, delimiter=';', quoting=csv.QUOTE_MINIMAL)
                    writer.writerow(columns)
                    for r in rows:
                        writer.writerow(r)
                print(f"  -> Exported '{current_table}' ({len(rows)} rows) to {csv_filepath}")
                current_table = None
                columns = []
                rows = []
            else:
                # Parse COPY tab-separated values
                raw_values = line_strip.split('\t')
                clean_values = []
                for val in raw_values:
                    if val == r'\N':
                        clean_values.append('')
                    else:
                        # unescape common pg copy sequences
                        val = val.replace(r'\t', '\t').replace(r'\n', '\n').replace(r'\r', '\r').replace(r'\\', '\\')
                        clean_values.append(val)
                rows.append(clean_values)
        else:
            match = copy_regex.match(line_strip)
            if match:
                current_table = match.group(1)
                raw_cols = match.group(2)
                # Parse column names (strip quotes and whitespace)
                cols = [c.strip().strip('"') for c in raw_cols.split(',')]
                columns = cols
                rows = []
                in_copy = True

    process.stdout.close()
    process.wait()

def main():
    base_dir = "/home/deeno/Public/Projects/EMS-Platform/temp"
    dumps = [
        ("deps_passport_backup.dump", os.path.join(base_dir, "csv_eps_passport")),
        ("dwms_backup.dump", os.path.join(base_dir, "csv_wms_stock")),
    ]

    for dump_file, out_dir in dumps:
        dump_path = os.path.join(base_dir, dump_file)
        if os.path.exists(dump_path):
            parse_and_export_dump(dump_path, out_dir)
        else:
            print(f"File not found: {dump_path}")

if __name__ == "__main__":
    main()
