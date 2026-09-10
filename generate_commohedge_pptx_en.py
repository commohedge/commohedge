"""Generate CommoHedge commercial pitch deck (English) with landing screenshots."""
from pathlib import Path

from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN
from pptx.util import Inches, Pt

# Brand colors
NAVY_DEEP = RGBColor(0x07, 0x0E, 0x1D)
NAVY_CARD = RGBColor(0x14, 0x1B, 0x2B)
LIME = RGBColor(0xAE, 0xF8, 0x33)
LIME_DARK = RGBColor(0x21, 0x36, 0x00)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
MUTED = RGBColor(0xC1, 0xCA, 0xAF)
SOFT = RGBColor(0xDC, 0xE2, 0xF7)
BORDER = RGBColor(0x42, 0x4A, 0x35)

SLIDE_W = Inches(13.333)
SLIDE_H = Inches(7.5)

ROOT = Path(__file__).resolve().parent
IMG = ROOT / "public" / "landing-page"
OUT = ROOT / "CommoHedge_Commercial_Presentation.pptx"

# Landing screenshot map (same as LandingPage.tsx)
IMG_PRICERS = IMG / "{BD890DA4-B338-426F-AF12-226DB77D343E}.png"
IMG_EXPOSURES = IMG / "{F1A55C30-CD9B-40E8-9A47-A6EDC89E953B}.png"
IMG_STRATEGY = IMG / "{C1E340B5-B17B-400D-848A-51DCD5A9E18C}.png"
IMG_HEDGING = IMG / "{C2D43F25-4D48-4D40-A313-FFFCD731F493}.png"
IMG_FUTURES = IMG / "{EB2283AC-646C-48BA-A8BE-1C2323DC58F4}.png"
IMG_VOL = IMG / "image.png"

TOTAL = 16


def set_run(run, size=18, bold=False, color=WHITE, font="Calibri"):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color
    run.font.name = font


def add_text_box(slide, left, top, width, height, text, size=18, bold=False, color=WHITE, align=PP_ALIGN.LEFT):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    set_run(run, size=size, bold=bold, color=color)
    return box


def fill_shape(shape, color):
    shape.fill.solid()
    shape.fill.fore_color.rgb = color
    shape.line.fill.background()


def card(slide, left, top, width, height, fill=NAVY_CARD):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    fill_shape(shape, fill)
    shape.adjustments[0] = 0.06
    shape.line.color.rgb = BORDER
    shape.line.width = Pt(1)
    return shape


def accent_bar(slide, left, top, width, height=Inches(0.07)):
    bar = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    fill_shape(bar, LIME)
    return bar


def footer(slide, page):
    add_text_box(
        slide,
        Inches(0.5),
        Inches(7.1),
        Inches(9),
        Inches(0.3),
        "COMMOHEDGE  ·  Commodity hedging & intelligence terminal  ·  Confidential",
        size=10,
        color=MUTED,
    )
    add_text_box(
        slide,
        Inches(11.4),
        Inches(7.1),
        Inches(1.4),
        Inches(0.3),
        f"{page} / {TOTAL}",
        size=10,
        color=MUTED,
        align=PP_ALIGN.RIGHT,
    )


def bg(slide):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, SLIDE_W, SLIDE_H)
    fill_shape(shape, NAVY_DEEP)
    spTree = slide.shapes._spTree
    sp = shape._element
    spTree.remove(sp)
    spTree.insert(2, sp)


def section_title(slide, title, subtitle=None):
    accent_bar(slide, Inches(0.55), Inches(0.38), Inches(0.85))
    add_text_box(slide, Inches(0.55), Inches(0.5), Inches(12), Inches(0.5), title, size=26, bold=True, color=WHITE)
    if subtitle:
        add_text_box(slide, Inches(0.55), Inches(1.0), Inches(12), Inches(0.35), subtitle, size=13, color=MUTED)


def new_slide(prs):
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    bg(slide)
    return slide


def add_picture_fit(slide, path, left, top, max_w, max_h):
    """Insert picture scaled to fit inside max box, preserving aspect ratio."""
    from PIL import Image

    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(path)
    with Image.open(path) as im:
        iw, ih = im.size
    max_w_in = max_w / 914400  # EMU to inches if needed — pptx uses EMU
    # left/top/max_w/max_h are already Length objects (EMU). Use float inches.
    mw = float(max_w)
    mh = float(max_h)
    aspect = iw / ih
    box_aspect = mw / mh
    if aspect >= box_aspect:
        w = max_w
        h = int(mw / aspect)
    else:
        h = max_h
        w = int(mh * aspect)
    # center inside box
    x = left + (max_w - w) // 2
    y = top + (max_h - h) // 2
    return slide.shapes.add_picture(str(path), x, y, width=w, height=h)


def add_shot(slide, path, left, top, width, height):
    """Picture inside a framed card-like area."""
    # dark frame behind
    frame = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left - Inches(0.04), top - Inches(0.04), width + Inches(0.08), height + Inches(0.08))
    fill_shape(frame, NAVY_CARD)
    frame.adjustments[0] = 0.04
    frame.line.color.rgb = BORDER
    frame.line.width = Pt(1)
    return add_picture_fit(slide, path, left, top, width, height)


def build():
    # Pillow helps aspect-fit; fall back if missing
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        import subprocess
        import sys

        subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow", "-q"])

    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    # ── 1 Cover ───────────────────────────────────────────────
    s = new_slide(prs)
    strip = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.18), SLIDE_H)
    fill_shape(strip, LIME)

    add_text_box(s, Inches(0.65), Inches(0.9), Inches(6.5), Inches(0.35), "COMMERCIAL PITCH  ·  2026", size=13, bold=True, color=LIME)
    add_text_box(s, Inches(0.65), Inches(1.35), Inches(6.5), Inches(0.85), "COMMOHEDGE", size=48, bold=True, color=WHITE)
    add_text_box(
        s,
        Inches(0.65),
        Inches(2.2),
        Inches(6.5),
        Inches(0.45),
        "Commodity hedging & intelligence terminal",
        size=18,
        color=LIME,
    )
    add_text_box(
        s,
        Inches(0.65),
        Inches(2.85),
        Inches(6.3),
        Inches(1.3),
        "Price, hedge, monitor and contextualize commodity\n"
        "(and FX) risk in one professional workstation.",
        size=15,
        color=SOFT,
    )
    add_text_box(
        s,
        Inches(0.65),
        Inches(4.4),
        Inches(6.3),
        Inches(0.7),
        "For corporate treasurers · commodity desks · brokers · shipping",
        size=12,
        color=MUTED,
    )
    # Hero product shot
    add_shot(s, IMG_PRICERS, Inches(7.15), Inches(1.15), Inches(5.7), Inches(5.2))
    footer(s, 1)

    # ── 2 Agenda ──────────────────────────────────────────────
    s = new_slide(prs)
    section_title(s, "Agenda", "Presentation roadmap")
    items = [
        ("01", "The problem"),
        ("02", "The CommoHedge solution"),
        ("03", "Product walkthrough (live UI)"),
        ("04", "Instruments, models & coverage"),
        ("05", "Buyers & competitive edge"),
        ("06", "Demo script & packaging"),
        ("07", "Closing & next steps"),
    ]
    for i, (num, label) in enumerate(items):
        y = Inches(1.55) + Inches(i * 0.7)
        nbox = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.7), y, Inches(0.7), Inches(0.5))
        fill_shape(nbox, LIME)
        nbox.adjustments[0] = 0.2
        add_text_box(s, Inches(0.7), y + Inches(0.08), Inches(0.7), Inches(0.35), num, size=14, bold=True, color=LIME_DARK, align=PP_ALIGN.CENTER)
        add_text_box(s, Inches(1.7), y + Inches(0.08), Inches(9), Inches(0.4), label, size=18, bold=True, color=WHITE)
    footer(s, 2)

    # ── 3 Problem ─────────────────────────────────────────────
    s = new_slide(prs)
    section_title(s, "The problem", "Why mid-market risk teams stay fragile")
    problems = [
        ("Terminal cost", "Bloomberg / Murex / full quant stacks are too expensive and heavy for many corporates."),
        ("Fragmented tools", "Pricing in Excel, exposures elsewhere, news elsewhere, freight elsewhere — no unified loop."),
        ("Opaque risk", "Barriers & digitals mispriced, approximate VaR, no path from strategy → book → committee."),
    ]
    for i, (title, body) in enumerate(problems):
        x = Inches(0.55) + Inches(i * 4.15)
        card(s, x, Inches(1.7), Inches(3.95), Inches(4.5))
        accent_bar(s, x + Inches(0.3), Inches(2.05), Inches(0.7))
        add_text_box(s, x + Inches(0.3), Inches(2.4), Inches(3.35), Inches(0.55), title, size=18, bold=True, color=WHITE)
        add_text_box(s, x + Inches(0.3), Inches(3.15), Inches(3.35), Inches(2.4), body, size=14, color=SOFT)
    footer(s, 3)

    # ── 4 Solution ────────────────────────────────────────────
    s = new_slide(prs)
    section_title(s, "The solution", "One-sentence pitch for the meeting open")
    card(s, Inches(0.55), Inches(1.55), Inches(12.2), Inches(2.0))
    add_text_box(
        s,
        Inches(0.9),
        Inches(1.85),
        Inches(11.5),
        Inches(1.4),
        "CommoHedge replaces the Excel + Bloomberg + bank-email patchwork\n"
        "with one terminal: desk-grade pricing, hedge book with live MTM,\n"
        "market data (futures / vol / freight) and geopolitical intelligence.",
        size=17,
        bold=True,
        color=WHITE,
    )
    pillars = [
        ("PRICE", "Black-76, barriers, MC, Greeks"),
        ("HEDGE", "Exposures → book → MTM"),
        ("MEASURE", "VaR, stress, PDF reports"),
        ("SENSE", "Data + Intel + AI"),
    ]
    for i, (t, b) in enumerate(pillars):
        x = Inches(0.55) + Inches(i * 3.15)
        card(s, x, Inches(3.9), Inches(3.0), Inches(2.3))
        add_text_box(s, x + Inches(0.2), Inches(4.2), Inches(2.6), Inches(0.4), t, size=16, bold=True, color=LIME)
        add_text_box(s, x + Inches(0.2), Inches(4.75), Inches(2.6), Inches(1.0), b, size=13, color=SOFT)
    footer(s, 4)

    # ── 5 Product: Pricers ────────────────────────────────────
    s = new_slide(prs)
    section_title(s, "Commodity Pricers", "Desk-grade pricing with payoff & Greeks")
    add_text_box(
        s,
        Inches(0.55),
        Inches(1.4),
        Inches(4.3),
        Inches(4.8),
        "Price vanillas, knock-outs, digitals and more.\n\n"
        "• Closed-form & Monte Carlo engines\n"
        "• Live Greeks (Δ Γ Θ Vega Rho)\n"
        "• Cost-of-carry forwards\n"
        "• Interactive payoff charts\n"
        "• Feed from Market / Data Terminal\n\n"
        "Show the client a knock-out call on WTI\n"
        "in under a minute.",
        size=14,
        color=SOFT,
    )
    add_shot(s, IMG_PRICERS, Inches(5.0), Inches(1.35), Inches(7.8), Inches(5.3))
    footer(s, 5)

    # ── 6 Product: Strategy Builder ───────────────────────────
    s = new_slide(prs)
    section_title(s, "Strategy Builder", "Design multi-month hedges with real terminal data")
    add_shot(s, IMG_STRATEGY, Inches(0.55), Inches(1.4), Inches(8.0), Inches(5.2))
    add_text_box(
        s,
        Inches(8.85),
        Inches(1.55),
        Inches(4.0),
        Inches(4.8),
        "Build full hedge programs:\n\n"
        "• Commodity + horizon + volume\n"
        "• Long / short positioning\n"
        "• Black-Scholes or Monte Carlo\n"
        "• Barrier simulation controls\n"
        "• Spot + IV from Data Terminal\n"
        "• Stress & historical backtest\n"
        "• Export into the hedge book\n\n"
        "From idea → structure → book.",
        size=13,
        color=SOFT,
    )
    footer(s, 6)

    # ── 7 Product: Exposures + Hedging ────────────────────────
    s = new_slide(prs)
    section_title(s, "Exposures & Hedge Book", "Operational loop: exposure → instrument → MTM")
    add_shot(s, IMG_EXPOSURES, Inches(0.45), Inches(1.45), Inches(6.15), Inches(3.55))
    add_shot(s, IMG_HEDGING, Inches(6.75), Inches(1.45), Inches(6.15), Inches(3.55))
    add_text_box(
        s,
        Inches(0.55),
        Inches(5.2),
        Inches(12.2),
        Inches(1.4),
        "Exposures: long/short volumes, hedge ratios, auto-link from instruments, CSV export.\n"
        "Hedging Instruments: notional, live MTM, near-maturity alerts, hedge-accounting flags, filters by strategy / portfolio.",
        size=13,
        color=SOFT,
    )
    footer(s, 7)

    # ── 8 Product: Data Terminal ──────────────────────────────
    s = new_slide(prs)
    section_title(s, "Data Terminal", "Futures chain + 3D implied volatility surface")
    add_shot(s, IMG_FUTURES, Inches(0.45), Inches(1.4), Inches(6.15), Inches(4.0))
    add_shot(s, IMG_VOL, Inches(6.75), Inches(1.4), Inches(6.15), Inches(4.0))
    add_text_box(
        s,
        Inches(0.55),
        Inches(5.55),
        Inches(12.2),
        Inches(1.1),
        "Futures curve with DTE interpolation · Vol & Greeks · IV Matrix · Vol Surface 3D — feeding Pricers and Strategy Builder.",
        size=13,
        color=SOFT,
    )
    footer(s, 8)

    # ── 9 Value ───────────────────────────────────────────────
    s = new_slide(prs)
    section_title(s, "Value proposition", "What the client gains")
    vals = [
        ("Reduce", "Cost & dependency", "Fewer terminal licenses and unmanaged spreadsheets."),
        ("Accelerate", "Hedge decisions", "From structure idea to committee PDF in one session."),
        ("Secure", "Risk governance", "Roles, cloud sync, MTM, VaR / stress that audit."),
    ]
    for i, (k, t, b) in enumerate(vals):
        y = Inches(1.65) + Inches(i * 1.6)
        card(s, Inches(0.55), y, Inches(12.2), Inches(1.45))
        badge = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.85), y + Inches(0.4), Inches(1.9), Inches(0.55))
        fill_shape(badge, LIME)
        badge.adjustments[0] = 0.2
        add_text_box(s, Inches(0.85), y + Inches(0.48), Inches(1.9), Inches(0.4), k, size=14, bold=True, color=LIME_DARK, align=PP_ALIGN.CENTER)
        add_text_box(s, Inches(3.1), y + Inches(0.35), Inches(9), Inches(0.4), t, size=18, bold=True, color=WHITE)
        add_text_box(s, Inches(3.1), y + Inches(0.85), Inches(9), Inches(0.4), b, size=14, color=SOFT)
    footer(s, 9)

    # ── 10 Modules ────────────────────────────────────────────
    s = new_slide(prs)
    section_title(s, "Product map", "6 modules · 20+ business pages")
    modules = [
        ("Pricing & Strategy", "Pricers, Strategy Builder", "Multi-leg structures, stress, backtest"),
        ("Risk Operations", "Exposures, Hedging, Positions", "Exposure → hedge → MTM loop"),
        ("Risk Analytics", "Risk, Regression, Reports", "VaR / ES, stress, PDF & CSV"),
        ("Market Data", "Market, Terminal, Rates", "Futures, options, vol surface, curves"),
        ("Intelligence", "Intel Workspace, Map, News", "Geopolitics, AIS, macro context"),
        ("AI & Admin", "Hedge Assistant, Users, Settings", "AI advice, roles, white-label, sync"),
    ]
    for i, (title, pages, value) in enumerate(modules):
        col, row = i % 3, i // 3
        x = Inches(0.55) + Inches(col * 4.15)
        y = Inches(1.55) + Inches(row * 2.5)
        card(s, x, y, Inches(3.95), Inches(2.3))
        add_text_box(s, x + Inches(0.25), y + Inches(0.3), Inches(3.4), Inches(0.4), title, size=14, bold=True, color=LIME)
        add_text_box(s, x + Inches(0.25), y + Inches(0.85), Inches(3.4), Inches(0.4), pages, size=12, bold=True, color=WHITE)
        add_text_box(s, x + Inches(0.25), y + Inches(1.35), Inches(3.4), Inches(0.7), value, size=12, color=SOFT)
    footer(s, 10)

    # ── 11 Instruments ────────────────────────────────────────
    s = new_slide(prs)
    section_title(s, "Instruments & models", "Desk credibility — beyond Excel")
    left = [
        "Forwards & Swaps",
        "Vanilla Calls / Puts",
        "Barriers KO / KI (single, reverse, double)",
        "Digitals & touches (one-touch, no-touch, range)",
        "Multi-leg & zero-cost structures",
    ]
    right = [
        "Black-76 (options on forward)",
        "Black-Scholes & Garman-Kohlhagen (FX)",
        "Closed-form barriers + Monte Carlo",
        "Greeks: Δ Γ Θ Vega Rho + IV solver",
        "Cost of carry · interest-rate curves",
    ]
    card(s, Inches(0.55), Inches(1.55), Inches(6.0), Inches(4.7))
    add_text_box(s, Inches(0.85), Inches(1.8), Inches(5.4), Inches(0.4), "Instrument catalog", size=16, bold=True, color=LIME)
    for i, t in enumerate(left):
        add_text_box(s, Inches(0.85), Inches(2.45) + Inches(i * 0.6), Inches(5.4), Inches(0.45), f"▸  {t}", size=14, color=SOFT)

    card(s, Inches(6.8), Inches(1.55), Inches(6.0), Inches(4.7))
    add_text_box(s, Inches(7.1), Inches(1.8), Inches(5.4), Inches(0.4), "Pricing engine", size=16, bold=True, color=LIME)
    for i, t in enumerate(right):
        add_text_box(s, Inches(7.1), Inches(2.45) + Inches(i * 0.6), Inches(5.4), Inches(0.45), f"▸  {t}", size=14, color=SOFT)
    footer(s, 11)

    # ── 12 Coverage ───────────────────────────────────────────
    s = new_slide(prs)
    section_title(s, "Coverage universe", "26+ commodities · FX · rates · freight")
    cats = [
        ("ENERGY", "WTI · Brent · NatGas · Heating Oil · RBOB"),
        ("METALS", "Gold · Silver · Platinum · Palladium · Cu · Al · Zn · Ni"),
        ("AGRI / LIVESTOCK", "Corn · Wheat · Soy · Coffee · Sugar · Cotton · Cattle · Hogs"),
        ("FREIGHT / BUNKER", "Baltic / container & dirty routes · Ship & Bunker"),
        ("FX & RATES", "Garman-Kohlhagen · USD EUR GBP JPY CHF CAD SGD"),
    ]
    for i, (title, body) in enumerate(cats):
        y = Inches(1.55) + Inches(i * 0.95)
        card(s, Inches(0.55), y, Inches(12.2), Inches(0.85))
        add_text_box(s, Inches(0.85), y + Inches(0.22), Inches(2.9), Inches(0.4), title, size=13, bold=True, color=LIME)
        add_text_box(s, Inches(3.9), y + Inches(0.22), Inches(8.5), Inches(0.45), body, size=14, color=SOFT)
    footer(s, 12)

    # ── 13 Buyers ─────────────────────────────────────────────
    s = new_slide(prs)
    section_title(s, "Who buys", "Priority segments & pitch angles")
    buyers = [
        ("Corporate treasury", "Hedge energy / metals / agri without a full bank desk", "Bloomberg-light workstation, decisions in minutes"),
        ("Trading houses / brokers", "Client-facing pricers + hedge book", "Desk terminal + commercial PDF packs"),
        ("Freight & shipping", "Bunker, freight and energy on one screen", "Rare edge vs metals/oil-only tools"),
        ("Consultancies / white-label", "Client-branded platform + governance", "Logo, company settings, Admin → Viewer roles"),
    ]
    add_text_box(s, Inches(0.7), Inches(1.5), Inches(3.2), Inches(0.3), "SEGMENT", size=11, bold=True, color=MUTED)
    add_text_box(s, Inches(4.0), Inches(1.5), Inches(4.5), Inches(0.3), "NEED", size=11, bold=True, color=MUTED)
    add_text_box(s, Inches(8.6), Inches(1.5), Inches(4.2), Inches(0.3), "PITCH ANGLE", size=11, bold=True, color=MUTED)
    for i, (seg, need, pitch) in enumerate(buyers):
        y = Inches(1.9) + Inches(i * 1.15)
        card(s, Inches(0.55), y, Inches(12.2), Inches(1.05))
        add_text_box(s, Inches(0.75), y + Inches(0.28), Inches(3.1), Inches(0.5), seg, size=13, bold=True, color=WHITE)
        add_text_box(s, Inches(4.0), y + Inches(0.28), Inches(4.4), Inches(0.55), need, size=12, color=SOFT)
        add_text_box(s, Inches(8.6), y + Inches(0.28), Inches(3.9), Inches(0.55), pitch, size=12, color=LIME)
    footer(s, 13)

    # ── 14 Competition ────────────────────────────────────────
    s = new_slide(prs)
    section_title(s, "Competitive edge", "Why CommoHedge wins mid-market")
    comps = [
        ("vs Bloomberg / Refinitiv", "Cost & complexity too high", "~80% of hedge-desk value at a fraction of the cost"),
        ("vs Excel + VBA", "Fragile, unauditable, no book", "Institutional models + exposures / MTM workflow"),
        ("vs Bank pricers", "Opaque, slow, FX vs commodity silos", "FX + commodity DNA in one terminal"),
        ("vs Pure risk tools", "Analytics without data or intel", "Pricing + data + intel + AI together"),
    ]
    for i, (vs, limit, edge) in enumerate(comps):
        y = Inches(1.55) + Inches(i * 1.2)
        card(s, Inches(0.55), y, Inches(12.2), Inches(1.1))
        add_text_box(s, Inches(0.8), y + Inches(0.3), Inches(3.5), Inches(0.5), vs, size=13, bold=True, color=WHITE)
        add_text_box(s, Inches(4.4), y + Inches(0.3), Inches(3.8), Inches(0.55), limit, size=12, color=MUTED)
        add_text_box(s, Inches(8.4), y + Inches(0.3), Inches(4.1), Inches(0.55), edge, size=12, color=LIME)
    footer(s, 14)

    # ── 15 Demo + Packaging ───────────────────────────────────
    s = new_slide(prs)
    section_title(s, "Demo script & packaging", "20–25 min walkthrough · 3 commercial tiers")
    steps = [
        ("01", "Landing + Access", "Positioning & funnel"),
        ("02", "Market / Terminal", "Data credibility"),
        ("03", "Strategy + Pricers", "Core product wow"),
        ("04", "Exposures → MTM", "Operational proof"),
        ("05", "Risk + PDF", "Committee language"),
        ("06", "Intel + AI", "Geopolitics & advice"),
    ]
    for i, (num, title, goal) in enumerate(steps):
        x = Inches(0.5) + Inches(i * 2.1)
        card(s, x, Inches(1.5), Inches(2.0), Inches(2.15))
        add_text_box(s, x + Inches(0.12), Inches(1.65), Inches(1.75), Inches(0.35), num, size=16, bold=True, color=LIME)
        add_text_box(s, x + Inches(0.12), Inches(2.1), Inches(1.75), Inches(0.7), title, size=11, bold=True, color=WHITE)
        add_text_box(s, x + Inches(0.12), Inches(2.85), Inches(1.75), Inches(0.55), goal, size=11, color=SOFT)

    packs = [
        ("ESSENTIAL", "Core Hedge", "Dashboard, Exposures, Hedging,\nStrategy, Pricers, Risk, Reports.\nBest for treasury.", False),
        ("RECOMMENDED", "Desk Pro", "Core + Market + Data Terminal\n+ Rate Explorer + Hedge Assistant.\nFor desks & brokers.", True),
        ("PREMIUM", "Intelligence", "Desk Pro + Intel Workspace,\nWorld Map, news, white-label,\nadvanced admin / SSO.", False),
    ]
    for i, (tag, name, body, featured) in enumerate(packs):
        x = Inches(0.55) + Inches(i * 4.15)
        card(s, x, Inches(3.95), Inches(3.95), Inches(2.55))
        if featured:
            top = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, x, Inches(3.95), Inches(3.95), Inches(0.1))
            fill_shape(top, LIME)
        add_text_box(s, x + Inches(0.25), Inches(4.15), Inches(3.45), Inches(0.3), tag, size=11, bold=True, color=LIME)
        add_text_box(s, x + Inches(0.25), Inches(4.45), Inches(3.45), Inches(0.35), name, size=16, bold=True, color=WHITE)
        add_text_box(s, x + Inches(0.25), Inches(4.9), Inches(3.45), Inches(1.35), body, size=12, color=SOFT)
    footer(s, 15)

    # ── 16 Closing ────────────────────────────────────────────
    s = new_slide(prs)
    strip = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.18), SLIDE_H)
    fill_shape(strip, LIME)
    add_text_box(s, Inches(0.7), Inches(0.9), Inches(11), Inches(0.35), "CLOSING", size=13, bold=True, color=LIME)
    add_text_box(s, Inches(0.7), Inches(1.35), Inches(11.5), Inches(0.6), "Three lines to remember", size=30, bold=True, color=WHITE)

    closings = [
        "A commodity hedge terminal (and FX) — not a toolbox of calculators.",
        "From exotic pricing to committee reporting, in one workflow.",
        "Market data + freight + geopolitical intel: the mid-market edge.",
    ]
    for i, t in enumerate(closings):
        y = Inches(2.3) + Inches(i * 0.85)
        num = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(0.75), y, Inches(0.45), Inches(0.45))
        fill_shape(num, LIME)
        add_text_box(s, Inches(0.75), y + Inches(0.05), Inches(0.45), Inches(0.35), str(i + 1), size=14, bold=True, color=LIME_DARK, align=PP_ALIGN.CENTER)
        add_text_box(s, Inches(1.45), y + Inches(0.05), Inches(10.5), Inches(0.5), t, size=16, color=SOFT)

    # small product strip at bottom
    add_shot(s, IMG_HEDGING, Inches(0.7), Inches(5.1), Inches(4.0), Inches(1.55))
    add_shot(s, IMG_VOL, Inches(4.9), Inches(5.1), Inches(4.0), Inches(1.55))
    add_shot(s, IMG_PRICERS, Inches(9.1), Inches(5.1), Inches(3.7), Inches(1.55))

    add_text_box(
        s,
        Inches(0.7),
        Inches(6.75),
        Inches(11.5),
        Inches(0.3),
        "Next step: 25-min guided demo  ·  request access  ·  POC on your book",
        size=13,
        bold=True,
        color=LIME,
    )
    # custom page footer without overlapping strip images — already near bottom
    add_text_box(s, Inches(11.5), Inches(7.1), Inches(1.3), Inches(0.25), f"16 / {TOTAL}", size=10, color=MUTED, align=PP_ALIGN.RIGHT)

    prs.save(OUT)
    print(f"Saved: {OUT}")
    for p in [IMG_PRICERS, IMG_EXPOSURES, IMG_STRATEGY, IMG_HEDGING, IMG_FUTURES, IMG_VOL]:
        print(f"  OK image: {p.name}" if p.exists() else f"  MISSING: {p}")


if __name__ == "__main__":
    build()
