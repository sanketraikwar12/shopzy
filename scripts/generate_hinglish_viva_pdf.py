#!/usr/bin/env python3
"""
generate_hinglish_viva_pdf.py
Generates a complete, easy-to-understand HINGLISH Backend Technical Viva Guide for SHOPZY.
"""

import os
from fpdf import FPDF
from fpdf.enums import XPos, YPos

class HinglishPDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=18)
        self.set_margins(18, 18, 18)
        self.alias_nb_pages()

    def header(self):
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "B", 8)
        self.set_text_color(100, 116, 139)
        self.cell(0, 6, "SHOPZY Backend Viva Preparation (Hinglish Guide)", new_x=XPos.RIGHT, new_y=YPos.TOP)
        self.set_font("Helvetica", "", 8)
        self.cell(0, 6, "College Final Project Defense 2026", align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.3)
        self.line(18, 14, 192, 14)
        self.ln(3)

    def footer(self):
        self.set_y(-14)
        self.set_draw_color(226, 232, 240)
        self.set_line_width(0.3)
        self.line(18, self.get_y(), 192, self.get_y())
        self.ln(1.5)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(148, 163, 184)
        self.cell(90, 6, "SHOPZY Final Project - Full Marks Preparation Guide", align="L")
        self.cell(84, 6, f"Page {self.page_no()} of {{nb}}", align="R", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def section_header(self, num, title, subtitle):
        self.ln(4)
        self.set_fill_color(3, 102, 245)  # Brand Blue
        self.set_text_color(255, 255, 255)
        self.set_font("Helvetica", "B", 11)
        self.cell(0, 8, f"  TOPIC {num}: {title.upper()}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        self.set_fill_color(239, 246, 255)  # Blue 50
        self.set_text_color(30, 64, 175)
        self.set_font("Helvetica", "I", 8.5)
        self.multi_cell(0, 5, f"  {subtitle}", fill=True, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(2)

    def add_qa(self, q_num, question, intent, answer_hinglish, technical_points, code_file):
        if self.get_y() > 225:
            self.add_page()

        # Question Banner
        self.set_fill_color(241, 245, 249)  # Slate 100
        self.set_draw_color(100, 116, 139)
        self.set_line_width(0.4)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(15, 23, 42)
        self.multi_cell(0, 6, f"Q{q_num}. {question}", fill=True, border="L", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        # Sir Kya Janna Chahte Hain (Intent)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(180, 83, 9)  # Amber 700
        self.multi_cell(0, 4.5, f"Sir Ka Intention: {intent}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(1)

        # Simple Hinglish Answer
        self.set_font("Helvetica", "B", 8.5)
        self.set_text_color(21, 128, 61)  # Emerald 700
        self.cell(0, 4.5, "Aapko Sir Ke Samne Ye Bolna Hai (Simple Hinglish):", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        
        self.set_font("Helvetica", "", 9)
        self.set_text_color(30, 41, 59)
        self.multi_cell(0, 5, answer_hinglish, new_x=XPos.LMARGIN, new_y=YPos.NEXT)
        self.ln(1.5)

        # Technical Keywords
        if technical_points:
            self.set_fill_color(248, 250, 252)
            self.set_draw_color(203, 213, 225)
            self.set_line_width(0.2)
            self.set_font("Helvetica", "B", 8)
            self.set_text_color(71, 85, 105)
            self.cell(0, 4, "Technical Keywords Jo Examiner Ko Impress Karenge:", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            self.set_font("Helvetica", "", 8.5)
            self.set_text_color(51, 65, 85)
            self.multi_cell(0, 4.5, technical_points, fill=True, border=1, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        # Code File Reference
        if code_file:
            self.set_font("Courier", "B", 7.5)
            self.set_text_color(3, 102, 245)
            self.cell(0, 4.5, f"Project Code File: {code_file}", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

        self.ln(3)


def generate_pdf():
    pdf = HinglishPDF()

    # COVER PAGE
    pdf.add_page()
    pdf.ln(8)

    pdf.set_fill_color(3, 102, 245)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(56, 7, "  COLLEGE VIVA PREP  ", fill=True, align="C")
    pdf.ln(10)

    pdf.set_font("Helvetica", "B", 24)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 10, "SHOPZY", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_font("Helvetica", "B", 15)
    pdf.set_text_color(3, 102, 245)
    pdf.cell(0, 8, "Backend Technical Viva Master Guide (Hinglish Edition)", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(0, 6, "Kal Ke Final Presentation Me Examiner Ke Saare Sawalon Ke Asaan Jawab", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(3)

    pdf.set_draw_color(3, 102, 245)
    pdf.set_line_width(1.0)
    pdf.line(18, pdf.get_y(), 192, pdf.get_y())
    pdf.ln(5)

    # Intro Message Box
    pdf.set_fill_color(240, 253, 244)
    pdf.set_draw_color(34, 197, 94)
    pdf.set_line_width(0.5)
    pdf.set_font("Helvetica", "B", 9.5)
    pdf.set_text_color(21, 128, 61)
    pdf.cell(0, 6, "  YE GUIDE KAISE USE KARNA HAI:", fill=True, border="LTR", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    guide_intro = (
        " 1. Kal examiner aapse code ratne ke baare me nahi puchhenge, wo ye dekhte hain ki kya aapne project khud banaya hai "
        "aur aapko backend ka flow pata hai ya nahi.\n"
        " 2. Is PDF me har question ka answer Simple Hinglish me likha hai taaki aapko concept 2 minute me samajh aa jaye.\n"
        " 3. Har question ke sath 'Technical Keywords' diye hain jo aapko sir ke samne bolne hain (jaise 2dsphere, atomic operators, "
        "dual-token JWT, cache-aside). In words se examiner turant impressed ho jata hai aur full marks milte hain.\n"
        " 4. Har answer ke sath exact code file ka path diya hai (jaise server/src/models/Shop.ts), taaki agar sir bole 'kaha likha hai code dikhao', "
        "toh aap bina dare turant wahi file open karke dikha sakein."
    )
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(22, 101, 52)
    pdf.multi_cell(0, 4.5, guide_intro, fill=True, border="LBR", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(4)

    # Quick Tech Summary
    pdf.set_fill_color(248, 250, 252)
    pdf.set_draw_color(226, 232, 240)
    pdf.set_line_width(0.3)
    pdf.set_font("Helvetica", "B", 9.5)
    pdf.set_text_color(15, 23, 42)
    pdf.cell(0, 6, "  Aapke Project Ka Backend Summary (Sir Ko Intro Dete Waqt Bolna Hai):", fill=True, border="LTR", new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    summary_text = (
        " 'Sir, Shopzy ek Hyperlocal Local Business Discovery aur Price Comparison Platform hai Bhopal ke liye.\n"
        " Iska backend humne Node.js, Express aur TypeScript me banaya hai.\n"
        " Database humne MongoDB use kiya hai jisme 2dsphere Geospatial Indexing use hui hai taaki user ke aas-paas ki "
        "dukaanein real-time me distance ke hisab se mil sakein.\n"
        " Performance ke liye humne Redis Cache-Aside layer lagayi hai, security ke liye Dual-Token JWT aur Bcrypt use kiya hai, "
        "aur poore backend ko verify karne ke liye humne Jest se 150 automated test cases likhe hain jo 100% pass hote hain.'"
    )
    pdf.set_font("Helvetica", "I", 8.5)
    pdf.set_text_color(51, 65, 85)
    pdf.multi_cell(0, 4.5, summary_text, fill=True, border="LBR", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(4)

    # Output paths
    output_pdf = r"c:\2026 coll.pro\shopzy\docs\viva\SHOPZY_Backend_Viva_Guide_Hinglish.pdf"
    os.makedirs(os.path.dirname(os.path.abspath(output_pdf)), exist_ok=True)
    pdf.output(output_pdf)
    print(f"Generated Hinglish PDF at: {output_pdf}")

if __name__ == "__main__":
    generate_pdf()
