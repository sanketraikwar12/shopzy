// convert-to-pptx.mjs — Creates a professional PowerPoint presentation for SHOPZY hackathon
import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';

const OUTPUT_DIR = path.resolve('hackathon-docs/ppt');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const pptx = new PptxGenJS();
pptx.author = 'Team SHOPZY';
pptx.company = 'MPOnline Hackathon 2026';
pptx.subject = 'SHOPZY — Local Business Discovery & Price Comparison';
pptx.title = 'SHOPZY Hackathon Presentation';
pptx.layout = 'LAYOUT_WIDE'; // 16:9

// ── Color Palette ──
const C = {
  bg: '0F1B2D',          // dark navy
  bgAlt: '142338',       // slightly lighter navy
  primary: '2E86C1',     // bright blue
  accent: '1ABC9C',      // teal green
  warning: 'F39C12',     // amber
  danger: 'E74C3C',      // red
  success: '27AE60',     // green
  white: 'FFFFFF',
  light: 'D5D8DC',
  muted: '85929E',
  cardBg: '1A2942',      // card surface
  tableBg: '162032',
  tableHead: '1B4F72',
  tableAlt: '1E3A5F',
};

function addSlide(opts = {}) {
  const slide = pptx.addSlide();
  slide.background = { fill: opts.bg || C.bg };
  
  // Bottom accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.2, w: 13.33, h: 0.05, fill: { color: C.primary },
  });
  
  // Footer text
  slide.addText('SHOPZY — MPOnline Hackathon 2026', {
    x: 0.4, y: 7.15, w: 5, h: 0.3, fontSize: 8, color: C.muted, fontFace: 'Calibri',
  });
  
  return slide;
}

function addTitle(slide, title, subtitle, opts = {}) {
  slide.addText(title, {
    x: opts.x || 0.6, y: opts.y || 0.3, w: 12, h: 0.7,
    fontSize: opts.fontSize || 32, fontFace: 'Calibri', bold: true, color: C.white,
  });
  
  if (subtitle) {
    slide.addText(subtitle, {
      x: opts.x || 0.6, y: (opts.y || 0.3) + 0.65, w: 12, h: 0.4,
      fontSize: 16, fontFace: 'Calibri', color: C.muted, italic: true,
    });
  }
  
  // Title underline
  slide.addShape(pptx.ShapeType.rect, {
    x: opts.x || 0.6, y: (opts.y || 0.3) + (subtitle ? 1.1 : 0.75), w: 2.5, h: 0.04, fill: { color: C.accent },
  });
}

function addTable(slide, headers, rows, opts = {}) {
  const allRows = [headers, ...rows];
  const tableData = allRows.map((row, rIdx) => 
    row.map(cell => ({
      text: cell,
      options: {
        fontSize: rIdx === 0 ? 11 : 10,
        fontFace: 'Calibri',
        color: C.white,
        bold: rIdx === 0,
        fill: { color: rIdx === 0 ? C.tableHead : (rIdx % 2 === 0 ? C.tableAlt : C.tableBg) },
        border: { type: 'solid', pt: 0.5, color: '2C3E50' },
        margin: [4, 6, 4, 6],
        valign: 'middle',
      },
    }))
  );
  
  slide.addTable(tableData, {
    x: opts.x || 0.6, y: opts.y || 1.8, w: opts.w || 12.1,
    colW: opts.colW,
    autoPage: false,
  });
}

function _addBullets(slide, items, opts = {}) {
  const textItems = items.map(item => ({
    text: item, options: { fontSize: 13, fontFace: 'Calibri', color: C.light, bullet: { code: '25CF', color: C.accent }, breakType: 'none', paraSpaceBefore: 6, paraSpaceAfter: 4, indentLevel: 0 },
  }));
  
  slide.addText(textItems, {
    x: opts.x || 0.8, y: opts.y || 1.8, w: opts.w || 11.5, h: opts.h || 5,
    valign: 'top',
  });
}

function addCard(slide, x, y, w, h, title, body, iconColor) {
  // Card background
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.1, fill: { color: C.cardBg },
    shadow: { type: 'outer', blur: 6, offset: 2, color: '000000', opacity: 0.3 },
  });
  
  // Accent top bar
  slide.addShape(pptx.ShapeType.rect, {
    x: x + 0.05, y, w: w - 0.1, h: 0.04, fill: { color: iconColor || C.accent },
  });
  
  // Title
  slide.addText(title, {
    x: x + 0.2, y: y + 0.15, w: w - 0.4, h: 0.35,
    fontSize: 13, fontFace: 'Calibri', bold: true, color: C.white,
  });
  
  // Body
  slide.addText(body, {
    x: x + 0.2, y: y + 0.5, w: w - 0.4, h: h - 0.7,
    fontSize: 10, fontFace: 'Calibri', color: C.light, valign: 'top',
  });
}

// ═══════════════════════════════════════════════
// SLIDE 1: TITLE SLIDE
// ═══════════════════════════════════════════════
(() => {
  const slide = addSlide();
  
  // Large accent shape behind title
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.33, h: 7.5, fill: { color: C.bg },
  });
  
  // Gradient-like accent element
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 2.5, w: 0.08, h: 3, fill: { color: C.accent },
  });
  
  slide.addText('SHOPZY', {
    x: 0.6, y: 1.8, w: 12, h: 1.2,
    fontSize: 60, fontFace: 'Calibri', bold: true, color: C.white,
  });
  
  slide.addText('Local Business Discovery & Price Comparison Platform', {
    x: 0.6, y: 3.0, w: 10, h: 0.6,
    fontSize: 22, fontFace: 'Calibri', color: C.primary,
  });
  
  slide.addText('Empowering Citizens  •  Digitising Local Commerce  •  Building Viksit Madhya Pradesh', {
    x: 0.6, y: 3.7, w: 10, h: 0.5,
    fontSize: 14, fontFace: 'Calibri', color: C.muted, italic: true,
  });
  
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 4.4, w: 3, h: 0.04, fill: { color: C.accent },
  });
  
  slide.addText([
    { text: 'Team: ', options: { color: C.muted, fontSize: 14, fontFace: 'Calibri' } },
    { text: '[TEAM_NAME]', options: { color: C.white, fontSize: 14, fontFace: 'Calibri', bold: true } },
  ], { x: 0.6, y: 4.7, w: 10, h: 0.4 });
  
  slide.addText([
    { text: 'College: ', options: { color: C.muted, fontSize: 14, fontFace: 'Calibri' } },
    { text: '[COLLEGE_NAME]', options: { color: C.white, fontSize: 14, fontFace: 'Calibri', bold: true } },
  ], { x: 0.6, y: 5.1, w: 10, h: 0.4 });
  
  slide.addText('MPOnline Idea & Innovation Hackathon 2026  |  October 9–10, Bhopal', {
    x: 0.6, y: 5.8, w: 10, h: 0.4,
    fontSize: 12, fontFace: 'Calibri', color: C.warning,
  });
})();

// ═══════════════════════════════════════════════
// SLIDE 2: THE PROBLEM
// ═══════════════════════════════════════════════
(() => {
  const slide = addSlide();
  addTitle(slide, 'The Problem', "India's Local Commerce Is Invisible & Unfair");
  
  // Left column — Citizens
  addCard(slide, 0.6, 1.5, 5.7, 2.8, '😤  Citizens Face...', 
    '• No way to discover nearby shops beyond asking neighbours\n• Same service costs ₹100 at one shop, ₹300 at another 500m away\n• Google Maps dominated by chains, not local shops\n• JustDial = phone spam, not genuine discovery\n• No price comparison exists for local services',
    C.danger);
  
  // Right column — Shop Owners
  addCard(slide, 6.8, 1.5, 5.7, 2.8, '😞  Shop Owners Face...',
    '• 95% of local shops have ZERO online presence\n• Platform fees: ₹5,000–15,000/month (Swiggy/Zomato)\n• No customer insights or analytics\n• No way to build online reputation\n• Competition pricing is invisible',
    C.warning);
  
  // Bottom highlight
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 4.7, w: 12.1, h: 1.3, rectRadius: 0.1, fill: { color: C.cardBg },
  });
  slide.addText('The Hard Truth', {
    x: 1.0, y: 4.85, w: 11, h: 0.35, fontSize: 14, fontFace: 'Calibri', bold: true, color: C.danger,
  });
  slide.addText('In Madhya Pradesh, ~35 lakh small businesses serve 8 crore citizens daily — yet there is NO unified platform to discover, compare, and connect with them. No platform in India offers real-time price comparison for local shops.', {
    x: 1.0, y: 5.25, w: 11, h: 0.6, fontSize: 12, fontFace: 'Calibri', color: C.light,
  });
})();

// ═══════════════════════════════════════════════
// SLIDE 3: OUR SOLUTION
// ═══════════════════════════════════════════════
(() => {
  const slide = addSlide();
  addTitle(slide, 'Our Solution: SHOPZY', 'A Platform Where Every Local Shop Gets a Digital Identity');
  
  addCard(slide, 0.6, 1.5, 3.8, 3.2, '👤  For Citizens (Free)',
    '• Search shops by location, category, or item\n• Compare real-time prices across shops\n• Read verified reviews\n• Check if shop is open NOW\n• One-tap call or navigation',
    C.primary);
  
  addCard(slide, 4.7, 1.5, 3.8, 3.2, '🏪  For Shop Owners (Free)',
    '• Create rich digital profile\n• Price list, offers, photos, hours\n• Get verified badge from admin\n• View analytics & insights\n• Respond to reviews',
    C.accent);
  
  addCard(slide, 8.8, 1.5, 3.8, 3.2, '🏛️  For Government',
    '• City-wide price trend data\n• Zero-result search analysis\n• Verification workflow\n• Consumer protection\n• DPDP Act compliant',
    C.warning);
  
  // Bottom tagline
  slide.addText('Think of it as  Google Maps × JustDial × PriceCompare  — tailor-made for local Indian businesses.', {
    x: 0.6, y: 5.2, w: 12, h: 0.5,
    fontSize: 14, fontFace: 'Calibri', color: C.accent, italic: true, align: 'center',
  });
})();

// ═══════════════════════════════════════════════
// SLIDE 4: LIVE DEMO FLOW
// ═══════════════════════════════════════════════
(() => {
  const slide = addSlide();
  addTitle(slide, 'How a Citizen Uses SHOPZY', 'Complete user journey in 6 steps');
  
  const steps = [
    { icon: '🏠', title: 'Home Page', desc: 'Browse 8 categories\n(Salon, Grocery, Gym, Restaurant...)', color: C.primary },
    { icon: '🔍', title: 'Search', desc: '"Haircut near MP Nagar"\nGeospatial results within 5 km', color: C.accent },
    { icon: '📊', title: 'Compare', desc: 'Min ₹100 / Avg ₹180 / Max ₹300\nacross 5 salons', color: C.warning },
    { icon: '⭐', title: 'Reviews', desc: '4.5★ rating, 47 reviews\nVerified feedback with photos', color: C.success },
    { icon: '📞', title: 'Call', desc: 'Direct phone connection\nNo spam, no middleman', color: C.danger },
    { icon: '🗺️', title: 'Navigate', desc: 'Opens Google Maps\nDoor-to-door directions', color: C.primary },
  ];
  
  steps.forEach((step, idx) => {
    const x = 0.6 + (idx % 6) * 2.1;
    const y = 1.7;
    
    slide.addShape(pptx.ShapeType.roundRect, {
      x, y, w: 1.9, h: 3.0, rectRadius: 0.1, fill: { color: C.cardBg },
    });
    
    // Top accent
    slide.addShape(pptx.ShapeType.rect, {
      x: x + 0.05, y, w: 1.8, h: 0.04, fill: { color: step.color },
    });
    
    // Step number
    slide.addText(`${idx + 1}`, {
      x, y: y + 0.15, w: 1.9, h: 0.35,
      fontSize: 12, fontFace: 'Calibri', color: step.color, align: 'center', bold: true,
    });
    
    // Icon
    slide.addText(step.icon, {
      x, y: y + 0.5, w: 1.9, h: 0.5,
      fontSize: 28, align: 'center',
    });
    
    // Title
    slide.addText(step.title, {
      x: x + 0.1, y: y + 1.1, w: 1.7, h: 0.35,
      fontSize: 12, fontFace: 'Calibri', color: C.white, bold: true, align: 'center',
    });
    
    // Description
    slide.addText(step.desc, {
      x: x + 0.1, y: y + 1.5, w: 1.7, h: 1.2,
      fontSize: 9, fontFace: 'Calibri', color: C.light, align: 'center', valign: 'top',
    });
    
    // Arrow between steps
    if (idx < 5) {
      slide.addText('→', {
        x: x + 1.85, y: y + 1.0, w: 0.3, h: 0.4,
        fontSize: 16, color: C.muted, align: 'center',
      });
    }
  });
  
  // Bottom highlight
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 2.5, y: 5.2, w: 8, h: 0.7, rectRadius: 0.1, fill: { color: C.cardBg },
  });
  slide.addText('Result: Citizen saves ₹200, discovers a better shop, helps others through reviews', {
    x: 2.5, y: 5.25, w: 8, h: 0.6,
    fontSize: 13, fontFace: 'Calibri', color: C.accent, align: 'center', bold: true,
  });
})();

// ═══════════════════════════════════════════════
// SLIDE 5: TECHNICAL ARCHITECTURE
// ═══════════════════════════════════════════════
(() => {
  const slide = addSlide();
  addTitle(slide, 'Technical Architecture', 'Production-grade three-tier stack');
  
  // Frontend box
  addCard(slide, 0.6, 1.5, 3.8, 1.8, '🖥️  Frontend — React + Vite + TypeScript',
    '• 9 pages, responsive 360px – 4K\n• 101 kB gzipped initial bundle\n• Route-level code splitting\n• Schema.org JSON-LD for SEO',
    C.primary);
  
  // Backend box
  addCard(slide, 4.8, 1.5, 3.8, 1.8, '⚙️  Backend — Express + TypeScript',
    '• 40+ REST API endpoints\n• JWT auth + RBAC (4 roles)\n• Zod validation on every input\n• OWASP Top 10 secured',
    C.accent);
  
  // Database box
  addCard(slide, 9.0, 1.5, 3.8, 1.8, '🗄️  Database — MongoDB + Redis',
    '• 2dsphere geospatial index\n• Sub-40ms search latency\n• In-process LRU cache fallback\n• 180-day TTL on analytics',
    C.warning);
  
  // Arrows
  slide.addText('REST API ──────────────────►', {
    x: 1.5, y: 3.3, w: 10, h: 0.4, fontSize: 10, color: C.muted, fontFace: 'Consolas',
  });
  
  // Pipeline
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 3.9, w: 12.1, h: 1.5, rectRadius: 0.1, fill: { color: C.cardBg },
  });
  
  slide.addText('Request Pipeline', {
    x: 1.0, y: 4.0, w: 5, h: 0.35, fontSize: 13, fontFace: 'Calibri', bold: true, color: C.white,
  });
  
  slide.addText('helmet → cors → body parsers → hpp → mongoSanitize → requestContext → rateLimit → route → validate(zod) → auth → rbac → controller → service → model → MongoDB → serializer → response', {
    x: 1.0, y: 4.4, w: 11.5, h: 0.8, fontSize: 10, fontFace: 'Consolas', color: C.primary,
  });
  
  // Key metrics
  addTable(slide, ['Metric', 'Value', 'Metric', 'Value'], [
    ['API Endpoints', '40+', 'Tests', '89 (all passing)'],
    ['Search Latency', '37ms cold / 1ms cached', 'Coverage', '78% lines'],
    ['Frontend Bundle', '101 kB gzipped', 'TypeScript', 'Strict, zero `any`'],
  ], { y: 5.7, colW: [2.5, 3.5, 2.5, 3.5] });
})();

// ═══════════════════════════════════════════════
// SLIDE 6: PRICE COMPARISON ENGINE
// ═══════════════════════════════════════════════
(() => {
  const slide = addSlide();
  addTitle(slide, 'Price Comparison Engine', 'The headline feature no other platform offers');
  
  // Left: How it works
  addCard(slide, 0.6, 1.5, 6.0, 4.0, '⚡  How It Works',
    'User searches "Haircut"\n     ↓\nSHOPZY finds all shops within 5 km listing "Haircut"\n     ↓\nAggregation pipeline computes:\n  • Min Price: ₹100 (Ramesh Salon, Arera Colony)\n  • Avg Price: ₹180 (across 5 salons)\n  • Max Price: ₹300 (Urban Cuts, New Market)\n  • Your Savings: Up to ₹200 per visit\n     ↓\nResults sorted cheapest first with distance',
    C.accent);
  
  // Right: Why unique
  addCard(slide, 7.0, 1.5, 5.7, 2.0, '🏆  Why This Is Unique',
    '• NO other platform compares local shop prices\n• Works across ALL categories (salon, kirana, gym, pharmacy)\n• Flexible schema handles different price structures\n• Single database round trip — no N+1 queries',
    C.warning);
  
  addCard(slide, 7.0, 3.8, 5.7, 1.7, '⚡  Performance',
    '• Cold query: 37 ms (with geo filter + facets)\n• Cached query: 1 ms\n• Coordinates rounded to ~110m for cache sharing\n• Single aggregation: $unwind → $match → $group',
    C.primary);
  
  // Bottom callout
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 5.9, w: 12.1, h: 0.8, rectRadius: 0.1, fill: { color: '1A3C34' },
  });
  slide.addText('💰  A Bhopal household using SHOPZY for 3–4 purchases/month saves ₹200–500/month = ₹2,400–6,000/year', {
    x: 1.0, y: 5.95, w: 11.5, h: 0.7, fontSize: 13, fontFace: 'Calibri', color: C.accent, bold: true, align: 'center',
  });
})();

// ═══════════════════════════════════════════════
// SLIDE 7: SECURITY — OWASP TOP 10
// ═══════════════════════════════════════════════
(() => {
  const slide = addSlide();
  addTitle(slide, 'Enterprise-Grade Security', 'OWASP Top 10 + DPDP Act Compliance');
  
  addTable(slide, ['OWASP Risk', 'Our Mitigation'], [
    ['A01: Broken Access Control', 'RBAC (4 roles), ownership verification on every mutation'],
    ['A02: Crypto Failures', 'bcrypt cost 12, HMAC-stored OTPs, httpOnly secure cookies'],
    ['A03: Injection', 'Zod input validation, MongoDB operator stripping, regex escaping'],
    ['A04: Insecure Design', 'Token rotation with replay detection, OTP attempt caps'],
    ['A05: Misconfiguration', 'Helmet CSP + HSTS, boot fails on default secrets'],
    ['A06: Vulnerable Components', 'Automated npm audit in CI pipeline'],
    ['A07: Auth Failures', 'Identical error responses (prevents account enumeration)'],
    ['A08: Integrity Failures', 'MIME + extension allowlist, server-generated filenames'],
    ['A09: Logging Failures', 'Correlation ID per request, structured JSON logging'],
    ['A10: SSRF', 'No user-supplied URLs ever fetched server-side'],
  ], { y: 1.5, colW: [3.5, 8.5] });
  
  // DPDP callout
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 5.8, w: 12.1, h: 0.8, rectRadius: 0.1, fill: { color: C.cardBg },
  });
  slide.addText('🇮🇳  DPDP Act 2023 Compliant:  Data Export (GET /me/export)  +  Account Erasure (DELETE /me/account)  +  Explicit Consent', {
    x: 1.0, y: 5.85, w: 11.5, h: 0.7, fontSize: 12, fontFace: 'Calibri', color: C.warning, bold: true, align: 'center',
  });
})();

// ═══════════════════════════════════════════════
// SLIDE 8: IMPACT
// ═══════════════════════════════════════════════
(() => {
  const slide = addSlide();
  addTitle(slide, 'Impact & Benefits', 'Triple impact: Citizens save, businesses grow, government learns');
  
  addCard(slide, 0.6, 1.5, 3.8, 2.6, '👤  Citizens',
    '• ₹200–500/month savings via price comparison\n• 15–60 min saved per purchase decision\n• Verified reviews = trusted choices\n• No phone spam (unlike JustDial)\n• Works on 2G, 360px phones',
    C.primary);
  
  addCard(slide, 4.8, 1.5, 3.8, 2.6, '🏪  Businesses',
    '• 15–25% footfall increase from digital visibility\n• ₹0 cost (vs ₹5K–15K/month on Swiggy)\n• Customer analytics: views, calls, directions\n• Reputation management: reviews + replies\n• Competitive pricing intelligence',
    C.accent);
  
  addCard(slide, 9.0, 1.5, 3.8, 2.6, '🏛️  Government',
    '• Real-time price data by area\n• Zero-result search = underserved areas\n• Shop density by category by district\n• MSME policy insights\n• Consumer protection at scale',
    C.warning);
  
  // Government alignment
  addTable(slide, ['Government Initiative', 'SHOPZY Contribution'], [
    ['Digital India', 'Brings last-mile merchants online at zero cost'],
    ['Atmanirbhar Bharat', 'Strengthens local businesses against aggregator monopolies'],
    ['Viksit Bharat 2047', 'Real-time market intelligence for data-driven governance'],
    ['DPDP Act 2023', 'Privacy-first, compliance from day one'],
  ], { y: 4.5, colW: [3.5, 8.5] });
})();

// ═══════════════════════════════════════════════
// SLIDE 9: FEASIBILITY & SCALABILITY
// ═══════════════════════════════════════════════
(() => {
  const slide = addSlide();
  addTitle(slide, 'Implementation & Scalability', 'From hackathon demo to all 52 districts of MP');
  
  addTable(slide, ['Phase', 'Timeline', 'Investment', 'Target'], [
    ['Hackathon Demo', 'COMPLETED ✅', '₹0', '14 shops, 89 tests, live demo'],
    ['Bhopal Pilot', '3 months', '₹55,000', '500 shops, 10K users'],
    ['Bhopal City-Wide', '5 months', '₹4.25 lakh', '5,000 shops, 1 lakh users'],
    ['5 MP Cities', '9 months', '₹25 lakh', '25,000 shops, 5 lakh users'],
    ['State-Wide (52 districts)', '18 months', '₹60 lakh', 'Full coverage, self-sustaining'],
  ], { y: 1.5, colW: [3.0, 2.0, 2.5, 4.5] });
  
  // Scaling architecture
  addTable(slide, ['Scale Level', 'Infrastructure', 'Code Change'], [
    ['Demo', 'Laptop + in-memory DB', 'None (works as-is)'],
    ['Pilot', '1 server + MongoDB Atlas free tier', 'Change 1 env variable'],
    ['City-Wide', 'Docker + managed MongoDB + Redis', 'Change 2 env variables'],
    ['State-Wide', 'Kubernetes + Elasticsearch + ClickHouse', 'Swap 1 service file'],
  ], { y: 4.2, colW: [2.5, 4.5, 5.0] });
  
  slide.addText('Every scaling step is a contained change — the architecture was designed for this from day one.', {
    x: 0.6, y: 6.6, w: 12, h: 0.4, fontSize: 12, fontFace: 'Calibri', color: C.accent, italic: true, align: 'center',
  });
})();

// ═══════════════════════════════════════════════
// SLIDE 10: COMPETITIVE DIFFERENTIATION
// ═══════════════════════════════════════════════
(() => {
  const slide = addSlide();
  addTitle(slide, 'Why SHOPZY Wins', 'No existing platform does what SHOPZY does');
  
  addTable(slide, ['Feature', 'Google Maps', 'JustDial', 'Swiggy/Zomato', 'SHOPZY'], [
    ['Local shop discovery', 'Limited', '✅', 'Restaurants only', '✅ All categories'],
    ['Real-time price comparison', '❌', '❌', '❌', '✅ Unique'],
    ['Free for shop owners', '✅', 'Paid leads', '₹5K–15K/month', '✅ 100% free'],
    ['Geospatial relevance scoring', 'Proprietary', '❌', '❌', '✅ Transparent'],
    ['Open-now with breaks/holidays', 'Partial', '❌', '✅', '✅ Full'],
    ['Owner analytics', '❌', 'Paid', 'Paid', '✅ Free'],
    ['Government admin panel', '❌', '❌', '❌', '✅ Built-in'],
    ['DPDP Act compliance', 'Unknown', 'Unknown', 'Unknown', '✅ Day one'],
    ['89 automated tests', 'N/A', 'Unknown', 'Unknown', '✅'],
  ], { y: 1.5, colW: [3.0, 2.0, 1.8, 2.3, 3.0] });
})();

// ═══════════════════════════════════════════════
// SLIDE 11: WHY SELECT US
// ═══════════════════════════════════════════════
(() => {
  const slide = addSlide();
  addTitle(slide, 'Why Should SHOPZY Be Selected?', '5 reasons this isn\'t just another hackathon project');
  
  const reasons = [
    { num: '1', title: "IT'S BUILT, NOT JUST DESIGNED", desc: '40+ APIs, 89 tests, live demo running right now. Run it on your laptop in 60 seconds.', color: C.primary },
    { num: '2', title: 'SOLVES A REAL, UNSOLVED PROBLEM', desc: 'No platform in India compares local shop prices. Zero. We are the first.', color: C.accent },
    { num: '3', title: 'PRODUCTION-GRADE SECURITY', desc: 'OWASP Top 10 ✅, DPDP Act ✅, JWT replay detection ✅, NoSQL injection prevention ✅', color: C.danger },
    { num: '4', title: 'SCALES FROM LAPTOP TO STATE-WIDE', desc: 'Docker → Kubernetes. Change 1 env variable to go from demo to production.', color: C.warning },
    { num: '5', title: 'GIVES GOVERNMENT REAL-TIME DATA', desc: 'Price trends, market gaps, zero-result analytics — intelligence that doesn\'t exist today.', color: C.success },
  ];
  
  reasons.forEach((r, idx) => {
    const y = 1.6 + idx * 1.1;
    
    // Number circle
    slide.addShape(pptx.ShapeType.ellipse, {
      x: 0.7, y: y + 0.05, w: 0.5, h: 0.5, fill: { color: r.color },
    });
    slide.addText(r.num, {
      x: 0.7, y: y + 0.05, w: 0.5, h: 0.5,
      fontSize: 16, fontFace: 'Calibri', bold: true, color: C.white, align: 'center', valign: 'middle',
    });
    
    // Title
    slide.addText(r.title, {
      x: 1.4, y: y, w: 4, h: 0.35,
      fontSize: 13, fontFace: 'Calibri', bold: true, color: r.color,
    });
    
    // Description
    slide.addText(r.desc, {
      x: 1.4, y: y + 0.35, w: 11, h: 0.45,
      fontSize: 11, fontFace: 'Calibri', color: C.light,
    });
  });
  
  // Bottom quote
  slide.addShape(pptx.ShapeType.roundRect, {
    x: 2, y: 6.6, w: 9, h: 0.7, rectRadius: 0.1, fill: { color: C.cardBg },
  });
  slide.addText('"We didn\'t build a prototype. We built a platform."', {
    x: 2, y: 6.6, w: 9, h: 0.7,
    fontSize: 16, fontFace: 'Calibri', color: C.accent, bold: true, italic: true, align: 'center', valign: 'middle',
  });
})();

// ═══════════════════════════════════════════════
// SLIDE 12: DEMO & THANK YOU
// ═══════════════════════════════════════════════
(() => {
  const slide = addSlide();
  
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 2.0, w: 0.08, h: 3, fill: { color: C.accent },
  });
  
  slide.addText('Thank You', {
    x: 0.6, y: 1.5, w: 12, h: 1, fontSize: 48, fontFace: 'Calibri', bold: true, color: C.white,
  });
  
  slide.addText('Live Demo Ready — Let Us Show You SHOPZY in Action', {
    x: 0.6, y: 2.5, w: 12, h: 0.5, fontSize: 20, fontFace: 'Calibri', color: C.primary,
  });
  
  slide.addShape(pptx.ShapeType.rect, {
    x: 0.6, y: 3.2, w: 3, h: 0.04, fill: { color: C.accent },
  });
  
  // Demo accounts table
  addTable(slide, ['Role', 'Email', 'Password'], [
    ['Super Admin', 'admin@shopzy.in', 'Admin@1234'],
    ['Shop Owner', 'owner1@shopzy.in', 'Password@123'],
    ['Customer', 'aditya.sharma@example.com', 'Password@123'],
  ], { y: 3.6, colW: [2.5, 5.0, 4.5] });
  
  slide.addText([
    { text: 'Web App: ', options: { color: C.muted, fontSize: 14 } },
    { text: 'http://localhost:5173', options: { color: C.primary, fontSize: 14, bold: true } },
    { text: '    |    ', options: { color: C.muted, fontSize: 14 } },
    { text: 'API: ', options: { color: C.muted, fontSize: 14 } },
    { text: 'http://localhost:4000/api/v1/health', options: { color: C.primary, fontSize: 14, bold: true } },
  ], { x: 0.6, y: 5.4, w: 12, h: 0.5, fontFace: 'Calibri' });
  
  slide.addText([
    { text: 'Run it yourself:  ', options: { color: C.muted, fontSize: 14, fontFace: 'Calibri' } },
    { text: 'npm install && npm run dev', options: { color: C.accent, fontSize: 14, fontFace: 'Consolas', bold: true } },
  ], { x: 0.6, y: 5.9, w: 12, h: 0.5 });
  
  slide.addText('Team [TEAM_NAME]  —  [COLLEGE_NAME]\nMPOnline Idea & Innovation Hackathon 2026', {
    x: 0.6, y: 6.4, w: 12, h: 0.7, fontSize: 13, fontFace: 'Calibri', color: C.muted, align: 'center',
  });
})();

// ═══════════════════════════════════════════════
// SAVE
// ═══════════════════════════════════════════════
const outPath = path.join(OUTPUT_DIR, 'SHOPZY_Hackathon_Presentation.pptx');
pptx.writeFile({ fileName: outPath }).then(() => {
  console.log(`\n✅ PowerPoint saved to: ${outPath}\n`);
  console.log('  📊 12 professional slides with dark theme');
  console.log('  🎨 Custom color palette, cards, tables, and icons');
  console.log('  📐 16:9 widescreen format\n');
}).catch(console.error);
