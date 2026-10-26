// convert-to-docx.mjs — Converts all hackathon markdown documents to Word (.docx) files
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, TableLayoutType } from 'docx';
import fs from 'fs';
import path from 'path';

const INPUT_DIR = path.resolve('hackathon-docs');
const OUTPUT_DIR = path.resolve('hackathon-docs/word');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── Styling constants ──
const FONT = 'Calibri';
const HEADING_FONT = 'Calibri';
const PRIMARY_COLOR = '1B4F72';    // deep blue
const ACCENT_COLOR = '2E86C1';
const TEXT_COLOR = '2C3E50';
const LIGHT_BG = 'EBF5FB';
const TABLE_HEADER_BG = '1B4F72';
const TABLE_ALT_BG = 'F8F9FA';

function parseMarkdownLine(text) {
  // Parse bold, inline code, and italic from markdown text
  const runs = [];
  let remaining = text;
  
  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    // Inline code `text`
    const codeMatch = remaining.match(/^(.*?)`(.+?)`(.*)/s);
    
    let firstMatch = null;
    let matchType = null;
    
    if (boldMatch && (!codeMatch || boldMatch.index <= codeMatch.index)) {
      firstMatch = boldMatch;
      matchType = 'bold';
    } else if (codeMatch) {
      firstMatch = codeMatch;
      matchType = 'code';
    }
    
    if (firstMatch && firstMatch[1] !== remaining) {
      if (firstMatch[1]) {
        runs.push(new TextRun({ text: firstMatch[1], font: FONT, size: 22, color: TEXT_COLOR }));
      }
      if (matchType === 'bold') {
        runs.push(new TextRun({ text: firstMatch[2], bold: true, font: FONT, size: 22, color: TEXT_COLOR }));
      } else {
        runs.push(new TextRun({ text: firstMatch[2], font: 'Consolas', size: 20, color: '7B241C', shading: { type: ShadingType.CLEAR, fill: 'FDEBD0' } }));
      }
      remaining = firstMatch[3];
    } else {
      runs.push(new TextRun({ text: remaining, font: FONT, size: 22, color: TEXT_COLOR }));
      break;
    }
  }
  
  return runs;
}

function parseTable(lines, startIdx) {
  const rows = [];
  let i = startIdx;
  
  // Collect all table rows
  while (i < lines.length && lines[i].trim().startsWith('|')) {
    const cells = lines[i].trim().split('|').filter(c => c.trim() !== '').map(c => c.trim());
    // Skip separator row (|---|---|)
    if (!cells[0].match(/^[-:]+$/)) {
      rows.push(cells);
    }
    i++;
  }
  
  if (rows.length === 0) return { table: null, endIdx: startIdx };
  
  const maxCols = Math.max(...rows.map(r => r.length));
  
  const tableRows = rows.map((row, rowIdx) => {
    const cells = [];
    for (let c = 0; c < maxCols; c++) {
      const cellText = row[c] || '';
      const isHeader = rowIdx === 0;
      
      cells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: isHeader
                ? [new TextRun({ text: cellText, bold: true, font: FONT, size: 20, color: isHeader ? 'FFFFFF' : TEXT_COLOR })]
                : parseMarkdownLine(cellText),
              spacing: { before: 40, after: 40 },
              alignment: AlignmentType.LEFT,
            }),
          ],
          shading: {
            type: ShadingType.CLEAR,
            fill: isHeader ? TABLE_HEADER_BG : (rowIdx % 2 === 0 ? TABLE_ALT_BG : 'FFFFFF'),
          },
          margins: { top: 40, bottom: 40, left: 80, right: 80 },
        })
      );
    }
    return new TableRow({ children: cells });
  });
  
  const table = new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.AUTOFIT,
  });
  
  return { table, endIdx: i };
}

function mdToDocx(mdContent, filename) {
  const lines = mdContent.split('\n');
  const children = [];
  
  let i = 0;
  let docTitle = filename.replace(/\.md$/, '').replace(/^\d+_/, '').replace(/_/g, ' ');
  
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines
    if (trimmed === '' || trimmed === '---') {
      i++;
      continue;
    }
    
    // Headings
    if (trimmed.startsWith('# ')) {
      docTitle = trimmed.replace(/^# /, '');
      children.push(new Paragraph({
        children: [new TextRun({ text: docTitle, font: HEADING_FONT, size: 40, bold: true, color: PRIMARY_COLOR })],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 200 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT_COLOR } },
      }));
      i++;
      continue;
    }
    
    if (trimmed.startsWith('## ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed.replace(/^## /, ''), font: HEADING_FONT, size: 32, bold: true, color: PRIMARY_COLOR })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 },
      }));
      i++;
      continue;
    }
    
    if (trimmed.startsWith('### ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed.replace(/^### /, ''), font: HEADING_FONT, size: 26, bold: true, color: ACCENT_COLOR })],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 100 },
      }));
      i++;
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed.replace(/^#### /, ''), font: HEADING_FONT, size: 24, bold: true, color: TEXT_COLOR })],
        heading: HeadingLevel.HEADING_4,
        spacing: { before: 200, after: 80 },
      }));
      i++;
      continue;
    }
    
    // Tables
    if (trimmed.startsWith('|')) {
      const { table, endIdx } = parseTable(lines, i);
      if (table) {
        children.push(new Paragraph({ spacing: { before: 100 } }));
        children.push(table);
        children.push(new Paragraph({ spacing: { after: 100 } }));
      }
      i = endIdx;
      continue;
    }
    
    // Code blocks
    if (trimmed.startsWith('```')) {
      i++;
      const codeLines = [];
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      
      // Render code block as shaded paragraph
      for (const codeLine of codeLines) {
        children.push(new Paragraph({
          children: [new TextRun({ text: codeLine || ' ', font: 'Consolas', size: 18, color: '1A5276' })],
          shading: { type: ShadingType.CLEAR, fill: 'F4F6F7' },
          spacing: { before: 0, after: 0 },
          indent: { left: 300 },
        }));
      }
      children.push(new Paragraph({ spacing: { after: 100 } }));
      continue;
    }
    
    // Blockquotes
    if (trimmed.startsWith('> ')) {
      const quoteText = trimmed.replace(/^>\s*/, '').replace(/\*\*/g, '');
      children.push(new Paragraph({
        children: [new TextRun({ text: quoteText, font: FONT, size: 22, italics: true, color: PRIMARY_COLOR })],
        indent: { left: 400 },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: ACCENT_COLOR } },
        spacing: { before: 120, after: 120 },
        shading: { type: ShadingType.CLEAR, fill: LIGHT_BG },
      }));
      i++;
      continue;
    }
    
    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletText = trimmed.replace(/^[-*]\s+/, '');
      children.push(new Paragraph({
        children: parseMarkdownLine(bulletText),
        bullet: { level: 0 },
        spacing: { before: 40, after: 40 },
        indent: { left: 400 },
      }));
      i++;
      continue;
    }
    
    // Numbered lists
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${numberedMatch[1]}. `, bold: true, font: FONT, size: 22, color: ACCENT_COLOR }),
          ...parseMarkdownLine(numberedMatch[2]),
        ],
        spacing: { before: 40, after: 40 },
        indent: { left: 400 },
      }));
      i++;
      continue;
    }
    
    // Metadata lines (bold key: value)
    if (trimmed.match(/^\*\*[^*]+\*\*:/)) {
      children.push(new Paragraph({
        children: parseMarkdownLine(trimmed),
        spacing: { before: 40, after: 40 },
      }));
      i++;
      continue;
    }
    
    // Regular paragraph
    if (trimmed.length > 0) {
      children.push(new Paragraph({
        children: parseMarkdownLine(trimmed),
        spacing: { before: 60, after: 60 },
      }));
    }
    
    i++;
  }
  
  // Add footer
  children.push(new Paragraph({ spacing: { before: 400 } }));
  children.push(new Paragraph({
    children: [new TextRun({ text: '— SHOPZY | MPOnline Idea & Innovation Hackathon 2026 —', font: FONT, size: 18, italics: true, color: '7F8C8D' })],
    alignment: AlignmentType.CENTER,
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'BDC3C7' } },
    spacing: { before: 200 },
  }));
  
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 22, color: TEXT_COLOR },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
        },
      },
      children,
    }],
  });
}

async function main() {
  const mdFiles = fs.readdirSync(INPUT_DIR).filter(f => f.endsWith('.md')).sort();
  
  console.log(`\n📄 Converting ${mdFiles.length} Markdown files to Word (.docx)...\n`);
  
  for (const file of mdFiles) {
    const mdContent = fs.readFileSync(path.join(INPUT_DIR, file), 'utf-8');
    const doc = mdToDocx(mdContent, file);
    const buffer = await Packer.toBuffer(doc);
    const outFile = file.replace('.md', '.docx');
    fs.writeFileSync(path.join(OUTPUT_DIR, outFile), buffer);
    console.log(`  ✅ ${outFile}`);
  }
  
  console.log(`\n✅ All Word files saved to: ${OUTPUT_DIR}\n`);
}

main().catch(console.error);
