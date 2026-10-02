import docx
import sys

sys.stdout.reconfigure(encoding='utf-8')
doc = docx.Document('doc/SHOPZY_Project_Synopsis (1).docx')

for idx, t in enumerate(doc.tables):
    print(f"\n=== TABLE {idx} ({len(t.rows)} rows, {len(t.columns)} cols) ===")
    for r_idx, row in enumerate(t.rows):
        print(f"Row {r_idx}: {[c.text.strip().replace(chr(10), ' ') for c in row.cells]}")
