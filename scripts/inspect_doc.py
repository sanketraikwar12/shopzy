import sys
import docx

sys.stdout.reconfigure(encoding='utf-8')

doc = docx.Document('doc/SHOPZY_Project_Synopsis (1).docx')
print("Document elements:")
for i, el in enumerate(doc._body._body):
    tag = el.tag.split('}')[-1]
    if tag == 'p':
        p = docx.text.paragraph.Paragraph(el, doc)
        t = p.text.strip()
        drawings = el.xpath('.//w:drawing')
        print(f"[{i:3d}] P: drawings={len(drawings)} text={repr(t[:60])}")
    elif tag == 'tbl':
        tbl = docx.table.Table(el, doc)
        print(f"[{i:3d}] TABLE: {len(tbl.rows)} rows, {len(tbl.columns)} cols. First row: {[c.text.strip() for c in tbl.rows[0].cells]}")
    elif tag == 'sectPr':
        print(f"[{i:3d}] sectPr")
    else:
        print(f"[{i:3d}] OTHER: {tag}")
