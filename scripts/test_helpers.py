import docx
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml, OxmlElement

doc = docx.Document()
section = doc.sections[0]
section.different_first_page_header_footer = True

footer = section.footer
p = footer.paragraphs[0]
p.alignment = WD_ALIGN_PARAGRAPH.RIGHT

run = p.add_run("Page ")
run.font.name = "Calibri"
run.font.size = Pt(9)
run.font.color.rgb = RGBColor(120, 120, 120)

fldChar1 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls('w'))
instrText = parse_xml(r'<w:instrText %s xml:space="preserve"> PAGE </w:instrText>' % nsdecls('w'))
fldChar2 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls('w'))
fldChar3 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls('w'))

p._p.append(fldChar1)
p._p.append(instrText)
p._p.append(fldChar2)
p._p.append(fldChar3)

run2 = p.add_run(" of ")
run2.font.name = "Calibri"
run2.font.size = Pt(9)
run2.font.color.rgb = RGBColor(120, 120, 120)

fldChar4 = parse_xml(r'<w:fldChar %s w:fldCharType="begin"/>' % nsdecls('w'))
instrText2 = parse_xml(r'<w:instrText %s xml:space="preserve"> NUMPAGES </w:instrText>' % nsdecls('w'))
fldChar5 = parse_xml(r'<w:fldChar %s w:fldCharType="separate"/>' % nsdecls('w'))
fldChar6 = parse_xml(r'<w:fldChar %s w:fldCharType="end"/>' % nsdecls('w'))

p._p.append(fldChar4)
p._p.append(instrText2)
p._p.append(fldChar5)
p._p.append(fldChar6)

doc.save("test_page_output.docx")
print("Saved test docx with dynamic Page X of Y successfully!")
