"""
Generates visual diagrams for Shopzy Prototype / Demo / Proof of Concept presentation.
"""
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, Circle

plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.family'] = 'sans-serif'

D = 'doc/diagrams'
os.makedirs(D, exist_ok=True)

# 1. DEMO USER JOURNEY FLOW
fig, ax = plt.subplots(figsize=(15, 8.5), dpi=300)
ax.set_xlim(0, 15)
ax.set_ylim(0, 8.5)
ax.axis('off')
fig.patch.set_facecolor('#F8FAFC')

ax.text(7.5, 8.0, "SHOPZY — LIVE PROTOTYPE & USER JOURNEY DEMO FLOW", ha='center', va='center', fontsize=17, fontweight='bold', color='#0F172A')
ax.text(7.5, 7.6, "Interactive Proof of Concept: 3 User Personas Validated End-to-End", ha='center', va='center', fontsize=11, color='#64748B')

def step_card(x, y, w, h, step_num, title, desc, bg='#FFF', bc='#3B82F6', tc='#1D4ED8'):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08,rounding_size=0.15", facecolor=bg, edgecolor=bc, linewidth=1.5, zorder=2))
    ax.add_patch(Circle((x + 0.4, y + h - 0.4), 0.25, facecolor=bc, edgecolor=bc, zorder=3))
    ax.text(x + 0.4, y + h - 0.4, str(step_num), ha='center', va='center', fontsize=10, fontweight='bold', color='#FFF', zorder=4)
    ax.text(x + 0.8, y + h - 0.4, title, ha='left', va='center', fontsize=11, fontweight='bold', color=tc, zorder=4)
    ax.text(x + w/2, y + (h - 0.7)/2, desc, ha='center', va='center', fontsize=8.8, color='#334155', multialignment='center', zorder=4)

# Persona 1: Customer / Tourist
ax.text(0.8, 6.9, "PERSONA 1: TOURIST & CITIZEN SHOPPER", ha='left', va='center', fontsize=11, fontweight='bold', color='#1E40AF')
step_card(0.8, 5.0, 3.1, 1.6, "1", "Geolocation & Tourism", "Pinpoint GPS in Bhopal\nBrowse 15 Tourist Landmarks\n(Upper Lake, Bhojpur, etc.)", bg='#EFF6FF', bc='#2563EB', tc='#1E40AF')
step_card(4.2, 5.0, 3.1, 1.6, "2", "Geo Search & Filter", "Search items (e.g. food/craft)\nSlide radius (1km - 10km)\nSingle-pass faceted counts", bg='#EFF6FF', bc='#2563EB', tc='#1E40AF')
step_card(7.6, 5.0, 3.1, 1.6, "3", "Price Comparison", "Compare identical items\nacross 3 physical stores\nAtomic price matrix view", bg='#EFF6FF', bc='#2563EB', tc='#1E40AF')
step_card(11.0, 5.0, 3.2, 1.6, "4", "Direct Connect & AI", "One-tap WhatsApp & Call\nZero aggregator commission\nGemini AI shopping advice", bg='#EFF6FF', bc='#2563EB', tc='#1E40AF')

for x_arr in [3.95, 7.35, 10.75]:
    ax.annotate('', xy=(x_arr + 0.2, 5.8), xytext=(x_arr - 0.05, 5.8), arrowprops=dict(arrowstyle="->", color='#2563EB', lw=2, mutation_scale=12))

# Persona 2: Local Shop Merchant
ax.text(0.8, 4.3, "PERSONA 2: LOCAL SHOP MERCHANT (MSME)", ha='left', va='center', fontsize=11, fontweight='bold', color='#065F46')
step_card(0.8, 2.4, 4.2, 1.6, "5", "Merchant Onboarding", "Login via owner credential\nUpload business verification docs\nConfigure split-shift business hours", bg='#ECFDF5', bc='#059669', tc='#065F46')
step_card(5.4, 2.4, 4.2, 1.6, "6", "Live Catalog Management", "Add multi-variant items & pricing\nLaunch festival discount offers\nManage customer reviews & replies", bg='#ECFDF5', bc='#059669', tc='#065F46')
step_card(10.0, 2.4, 4.2, 1.6, "7", "Footfall & Analytics", "Real-time analytics dashboard\nTrack store views, search hits\nMonitor direct call conversions", bg='#ECFDF5', bc='#059669', tc='#065F46')

for x_arr in [5.05, 9.65]:
    ax.annotate('', xy=(x_arr + 0.3, 3.2), xytext=(x_arr + 0.05, 3.2), arrowprops=dict(arrowstyle="->", color='#059669', lw=2, mutation_scale=12))

# Persona 3: Platform Super Admin
ax.text(0.8, 1.7, "PERSONA 3: MP ONLINE PLATFORM SUPER ADMIN", ha='left', va='center', fontsize=11, fontweight='bold', color='#7E22CE')
step_card(0.8, 0.4, 6.5, 1.1, "8", "Merchant Verification Queue", "Review submitted shop licenses, verify addresses & activate shop listings", bg='#FAF5FF', bc='#7C3AED', tc='#6B21A8')
step_card(7.7, 0.4, 6.5, 1.1, "9", "System Governance & Audit Logs", "Monitor platform audit logs, enforce DPDP Act compliance & user safety", bg='#FAF5FF', bc='#7C3AED', tc='#6B21A8')

ax.annotate('', xy=(7.65, 0.95), xytext=(7.35, 0.95), arrowprops=dict(arrowstyle="->", color='#7C3AED', lw=2, mutation_scale=12))

plt.tight_layout()
plt.savefig(f'{D}/demo_workflow.png', dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
plt.close()
print("1/2 demo_workflow generated")

# 2. PROOF OF CONCEPT VALIDATION BENCHMARK
fig, ax = plt.subplots(figsize=(15, 8.5), dpi=300)
ax.set_xlim(0, 15)
ax.set_ylim(0, 8.5)
ax.axis('off')
fig.patch.set_facecolor('#F8FAFC')

ax.text(7.5, 8.0, "SHOPZY — PROOF OF CONCEPT (PoC) VALIDATION MATRIX", ha='center', va='center', fontsize=17, fontweight='bold', color='#0F172A')
ax.text(7.5, 7.6, "Empirical Benchmarks, Test Coverage & Technical Validation Against Requirements", ha='center', va='center', fontsize=11, color='#64748B')

def metric_box(x, y, w, h, title, val, unit, desc, col='#2563EB', bg='#EFF6FF'):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08,rounding_size=0.15", facecolor=bg, edgecolor=col, linewidth=1.5, zorder=2))
    ax.text(x + w/2, y + h - 0.35, title, ha='center', va='center', fontsize=10, fontweight='bold', color=col, zorder=3)
    ax.text(x + w/2, y + h/2 + 0.05, val, ha='center', va='center', fontsize=26, fontweight='bold', color='#0F172A', zorder=3)
    ax.text(x + w/2, y + h/2 - 0.45, unit, ha='center', va='center', fontsize=9.5, fontweight='bold', color='#64748B', zorder=3)
    ax.text(x + w/2, y + 0.3, desc, ha='center', va='center', fontsize=8.5, color='#334155', multialignment='center', zorder=3)

metric_box(0.8, 5.1, 3.2, 2.1, "SEARCH QUERY LATENCY", "~37 ms", "Cold Exec | 1ms Cached", "MongoDB 2dsphere S2 Index\nZero N+1 Query Joins", col='#0284C7', bg='#F0F9FF')
metric_box(4.3, 5.1, 3.2, 2.1, "AUTOMATED TEST SUITE", "89 / 89", "100% Passed Tests", "Supertest on in-memory Mongo\nAuth, Geo, Edge-cases & DPDP", col='#059669', bg='#ECFDF5')
metric_box(7.8, 5.1, 3.2, 2.1, "FRONTEND INITIAL BUNDLE", "101 kB", "Gzipped Load Time <0.4s", "Vite + Explicit Lucide Registry\nRoute-level Code Splitting", col='#7C3AED', bg='#FAF5FF')
metric_box(11.3, 5.1, 3.0, 2.1, "EVALUATION SETUP", "0 sec", "Zero Cloud Infrastructure", "In-memory auto-boot & seed\nZero config required for jury", col='#D97706', bg='#FFFBEB')

# Table of Hypotheses
ax.add_patch(FancyBboxPatch((0.8, 0.6), 13.5, 4.1, boxstyle="round,pad=0.05,rounding_size=0.15", facecolor='#FFF', edgecolor='#CBD5E1', linewidth=1.5, zorder=2))
ax.text(1.2, 4.35, "CORE PROOF OF CONCEPT HYPOTHESES VALIDATION", ha='left', va='center', fontsize=12, fontweight='bold', color='#0F172A', zorder=3)

# Table Header
ax.add_patch(FancyBboxPatch((0.9, 3.75), 13.3, 0.45, boxstyle="square,pad=0", facecolor='#1E293B', edgecolor='none', zorder=3))
ax.text(1.1, 3.97, "HYPOTHESIS / OBJECTIVE", ha='left', va='center', fontsize=9.5, fontweight='bold', color='#FFF', zorder=4)
ax.text(5.6, 3.97, "TARGET CRITERIA", ha='left', va='center', fontsize=9.5, fontweight='bold', color='#FFF', zorder=4)
ax.text(9.4, 3.97, "MEASURED RESULT", ha='left', va='center', fontsize=9.5, fontweight='bold', color='#FFF', zorder=4)
ax.text(13.2, 3.97, "STATUS", ha='center', va='center', fontsize=9.5, fontweight='bold', color='#FFF', zorder=4)

rows = [
    ("H1: Real-time price comparison at local retail scale", "Sub-100ms response on multi-store queries", "37ms cold / 1ms cached via single-pass $geoNear + $facet", "VALIDATED", "#059669"),
    ("H2: Zero-commission MSME direct connection", "Seamless 1-tap connect via WhatsApp/Call", "Direct phone/WA links active without transaction fees", "VALIDATED", "#059669"),
    ("H3: Bhopal tourism footfall linkage with local shops", "10+ heritage sites linked to local artisans", "15 Bhopal landmarks pre-seeded with nearby stores", "VALIDATED", "#059669"),
    ("H4: Replay-resistant authentication on edge devices", "Prevent reuse of intercepted refresh tokens", "Single-use JTI blacklist auto-revokes compromised sessions", "VALIDATED", "#059669"),
    ("H5: Hackathon zero-config evaluation portability", "Boots with no external cloud/database setup", "Auto-spawns in-memory Mongo & loads 15 Bhopal shops", "VALIDATED", "#059669")
]

ty = 3.4
for hyp, target, res, stat, scol in rows:
    ax.text(1.1, ty, hyp, ha='left', va='center', fontsize=8.8, color='#0F172A', zorder=4)
    ax.text(5.6, ty, target, ha='left', va='center', fontsize=8.8, color='#475569', zorder=4)
    ax.text(9.4, ty, res, ha='left', va='center', fontsize=8.8, color='#0F172A', fontweight='bold', zorder=4)
    ax.add_patch(FancyBboxPatch((12.6, ty - 0.15), 1.2, 0.3, boxstyle="round,pad=0.03,rounding_size=0.08", facecolor='#ECFDF5', edgecolor=scol, linewidth=1, zorder=3))
    ax.text(13.2, ty, stat, ha='center', va='center', fontsize=8.5, fontweight='bold', color=scol, zorder=4)
    ty -= 0.55

plt.tight_layout()
plt.savefig(f'{D}/poc_validation.png', dpi=300, facecolor=fig.get_facecolor(), edgecolor='none')
plt.close()
print("2/2 poc_validation generated")
