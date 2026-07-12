#!/usr/bin/env python3
"""
Generate real, downloadable PDF booklets for the Jamiatul Ulama Johannesburg
resource library. Each PDF is professionally typeset with:
- Forest-green + gold + parchment palette matching the website
- Amiri Arabic font (with proper reshaping + bidi for Arabic text)
- Spectral/Liberation Serif for English
- Geometric Islamic 8-point star pattern as page header/footer
- Bilingual centered titles
- Proper page numbers, headers, and footers
- Quranic verses and hadiths with full citations

Outputs to /home/z/my-project/public/downloads/<filename>.pdf
"""
import os
import sys
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether, Image, Flowable,
)
from reportlab.platypus.flowables import HRFlowable
from reportlab.pdfgen import canvas as canvaslib

import arabic_reshaper
from bidi.algorithm import get_display

# ─── Palette ──────────────────────────────────────────────────────────────────
FOREST       = HexColor('#0B3D2E')
FOREST_DEEP  = HexColor('#062920')
FOREST_LIGHT = HexColor('#1a6b48')
PARCHMENT    = HexColor('#F5EFE0')
PARCH_WARM   = HexColor('#EDE6D2')
PARCH_DARK   = HexColor('#D9D0B8')
GOLD         = HexColor('#B8921E')
GOLD_LIGHT   = HexColor('#D4A830')
GOLD_PALE    = HexColor('#E8D08A')
INK          = HexColor('#1A1C18')
INK_MID      = HexColor('#2E3228')
MAROON       = HexColor('#7A1F2B')

# ─── Font registration ────────────────────────────────────────────────────────
FONT_DIR = '/home/z/my-project/scripts/fonts'
pdfmetrics.registerFont(TTFont('Amiri',       os.path.join(FONT_DIR, 'Amiri-Regular.ttf')))
pdfmetrics.registerFont(TTFont('Amiri-Bold',  os.path.join(FONT_DIR, 'Amiri-Bold.ttf')))
pdfmetrics.registerFont(TTFont('AmiriQuran',  os.path.join(FONT_DIR, 'AmiriQuran.ttf')))
pdfmetrics.registerFont(TTFont('Serif',       '/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Serif-Bold',  '/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'))
pdfmetrics.registerFont(TTFont('Serif-Italic','/usr/share/fonts/truetype/liberation/LiberationSerif-Italic.ttf'))
pdfmetrics.registerFont(TTFont('Sans',        '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf'))
pdfmetrics.registerFont(TTFont('Sans-Bold',   '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'))

from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily('Serif', normal='Serif', bold='Serif-Bold', italic='Serif-Italic', boldItalic='Serif-Bold')
registerFontFamily('Amiri', normal='Amiri', bold='Amiri-Bold')

# ─── Arabic shaping helper ───────────────────────────────────────────────────
def ar(text: str) -> str:
    """Reshape + apply bidi to Arabic text for correct PDF rendering."""
    return get_display(arabic_reshaper.reshape(text))

# ─── Styles ──────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

style_title = ParagraphStyle(
    'BookTitle', parent=styles['Normal'],
    fontName='Serif-Bold', fontSize=22, leading=28,
    textColor=FOREST, alignment=TA_CENTER, spaceAfter=8,
)
style_subtitle = ParagraphStyle(
    'BookSubtitle', parent=styles['Normal'],
    fontName='Serif-Italic', fontSize=12, leading=16,
    textColor=GOLD, alignment=TA_CENTER, spaceAfter=18,
)
style_arabic_title = ParagraphStyle(
    'ArabicTitle', parent=styles['Normal'],
    fontName='Amiri', fontSize=20, leading=26,
    textColor=FOREST, alignment=TA_CENTER, spaceAfter=10,
)
style_h2 = ParagraphStyle(
    'H2', parent=styles['Normal'],
    fontName='Serif-Bold', fontSize=14, leading=18,
    textColor=FOREST, alignment=TA_LEFT, spaceBefore=14, spaceAfter=6,
)
style_body = ParagraphStyle(
    'Body', parent=styles['Normal'],
    fontName='Serif', fontSize=11, leading=17,
    textColor=INK, alignment=TA_JUSTIFY, spaceAfter=8,
    firstLineIndent=0,
)
style_quote = ParagraphStyle(
    'Quote', parent=styles['Normal'],
    fontName='Serif-Italic', fontSize=11, leading=17,
    textColor=INK_MID, alignment=TA_CENTER, spaceAfter=8,
    leftIndent=24, rightIndent=24,
)
style_arabic_body = ParagraphStyle(
    'ArabicBody', parent=styles['Normal'],
    fontName='Amiri', fontSize=14, leading=22,
    textColor=FOREST, alignment=TA_RIGHT, spaceAfter=8,
    rightIndent=0, leftIndent=0,
)
style_arabic_centered = ParagraphStyle(
    'ArabicCentered', parent=styles['Normal'],
    fontName='Amiri', fontSize=16, leading=24,
    textColor=FOREST, alignment=TA_CENTER, spaceAfter=8,
)
style_source = ParagraphStyle(
    'Source', parent=styles['Normal'],
    fontName='Sans', fontSize=9, leading=12,
    textColor=GOLD, alignment=TA_CENTER, spaceAfter=10,
)
style_footer = ParagraphStyle(
    'Footer', parent=styles['Normal'],
    fontName='Sans', fontSize=8, leading=10,
    textColor=PARCH_DARK, alignment=TA_CENTER,
)

# ─── Custom flowables ─────────────────────────────────────────────────────────
class GeometricDivider(Flowable):
    """A geometric Islamic-style divider with 8-point stars and diamonds."""
    def __init__(self, width=170*mm):
        Flowable.__init__(self)
        self.width = width
        self.height = 18*mm
    def draw(self):
        c = self.canv
        c.saveState()
        cy = self.height / 2
        # Lines
        c.setStrokeColor(GOLD_PALE)
        c.setLineWidth(0.5)
        c.line(0, cy, self.width/2 - 30, cy)
        c.line(self.width/2 + 30, cy, self.width, cy)
        # Diamond left
        c.setFillColor(GOLD_LIGHT)
        c.translate(self.width/2 - 20, cy)
        c.rotate(45)
        c.rect(-3, -3, 6, 6, fill=1, stroke=0)
        c.rotate(-45)
        c.translate(-(self.width/2 - 20), -cy)
        # 8-point star left (small)
        self._draw_star(c, self.width/2 - 10, cy, 5, GOLD)
        # 8-point star center (big)
        self._draw_star(c, self.width/2, cy, 8, GOLD)
        # 8-point star right (small)
        self._draw_star(c, self.width/2 + 10, cy, 5, GOLD)
        # Diamond right
        c.setFillColor(GOLD_LIGHT)
        c.translate(self.width/2 + 20, cy)
        c.rotate(45)
        c.rect(-3, -3, 6, 6, fill=1, stroke=0)
        c.rotate(-45)
        c.translate(-(self.width/2 + 20), -cy)
        c.restoreState()
    def _draw_star(self, c, x, y, r, color):
        """Draw an 8-point star (two overlapping squares)."""
        c.saveState()
        c.setFillColor(color)
        c.translate(x, y)
        c.rotate(0)
        c.rect(-r*0.7, -r*0.7, r*1.4, r*1.4, fill=1, stroke=0)
        c.rotate(45)
        c.rect(-r*0.7, -r*0.7, r*1.4, r*1.4, fill=1, stroke=0)
        c.restoreState()

class StarPattern(Flowable):
    """Small 8-point star pattern for ornament."""
    def __init__(self, size=12*mm):
        Flowable.__init__(self)
        self.width = size
        self.height = size
    def draw(self):
        c = self.canv
        c.saveState()
        c.setFillColor(GOLD)
        c.translate(self.width/2, self.height/2)
        c.rect(-self.width*0.35, -self.height*0.35, self.width*0.7, self.height*0.7, fill=1, stroke=0)
        c.rotate(45)
        c.rect(-self.width*0.35, -self.height*0.35, self.width*0.7, self.height*0.7, fill=1, stroke=0)
        c.restoreState()

# ─── Page templates ───────────────────────────────────────────────────────────
def _draw_page_chrome(canvas: canvaslib.Canvas, doc):
    """Draw the page header, footer, and decorative borders on every page."""
    canvas.saveState()
    w, h = A4
    # Top header band
    canvas.setFillColor(FOREST_DEEP)
    canvas.rect(0, h - 18*mm, w, 18*mm, fill=1, stroke=0)
    # Gold rule under header
    canvas.setFillColor(GOLD)
    canvas.rect(0, h - 18.5*mm, w, 0.5*mm, fill=1, stroke=0)
    # Header text
    canvas.setFillColor(GOLD_PALE)
    canvas.setFont('Sans', 8)
    canvas.drawString(15*mm, h - 10*mm, 'JAMIATUL ULAMA JOHANNESBURG')
    canvas.setFillColor(GOLD_LIGHT)
    canvas.setFont('Amiri', 11)
    canvas.drawRightString(w - 15*mm, h - 11*mm, ar('جمعية العلماء جوهانسبرغ'))
    # 8-point star pattern in header center
    canvas.setFillColor(GOLD)
    cx, cy = w/2, h - 9*mm
    canvas.saveState()
    canvas.translate(cx, cy)
    canvas.rect(-2, -2, 4, 4, fill=1, stroke=0)
    canvas.rotate(45)
    canvas.rect(-2, -2, 4, 4, fill=1, stroke=0)
    canvas.restoreState()

    # Bottom footer band
    canvas.setFillColor(FOREST_DEEP)
    canvas.rect(0, 0, w, 14*mm, fill=1, stroke=0)
    canvas.setFillColor(GOLD)
    canvas.rect(0, 14*mm, w, 0.5*mm, fill=1, stroke=0)
    # Footer text
    canvas.setFillColor(PARCH_DARK)
    canvas.setFont('Sans', 7.5)
    canvas.drawString(15*mm, 6*mm, 'Darul Iftā · Verified Resource · 1448 AH')
    canvas.drawRightString(w - 15*mm, 6*mm, f'Page {doc.page}')
    canvas.setFillColor(GOLD_LIGHT)
    canvas.setFont('Amiri', 9)
    canvas.drawCentredString(w/2, 5*mm, ar('وَمَا عَلَيْنَا إِلَّا الْبَلَاغُ الْمُبِينُ'))
    canvas.restoreState()

def _draw_cover(canvas: canvaslib.Canvas, doc):
    """Full-bleed cover page background."""
    canvas.saveState()
    w, h = A4
    # Deep forest background
    canvas.setFillColor(FOREST_DEEP)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    # 8-point star pattern overlay (subtle)
    canvas.setStrokeColor(HexColor('#1a4d3a'))
    canvas.setLineWidth(0.4)
    for xi in range(0, int(w) + 30, 30):
        for yi in range(0, int(h) + 30, 30):
            canvas.saveState()
            canvas.translate(xi, yi)
            canvas.rect(-6, -6, 12, 12, fill=0, stroke=1)
            canvas.rotate(45)
            canvas.rect(-6, -6, 12, 12, fill=0, stroke=1)
            canvas.restoreState()
    # Gold border frame
    canvas.setStrokeColor(GOLD)
    canvas.setLineWidth(2)
    canvas.rect(15*mm, 15*mm, w - 30*mm, h - 30*mm, fill=0, stroke=1)
    canvas.setStrokeColor(GOLD_PALE)
    canvas.setLineWidth(0.5)
    canvas.rect(17*mm, 17*mm, w - 34*mm, h - 34*mm, fill=0, stroke=1)
    canvas.restoreState()

# ─── Document builder ─────────────────────────────────────────────────────────
def build_pdf(out_path: str, title_en: str, title_ar: str, sections: list, meta: str = ''):
    """
    Build a PDF booklet.
    
    Args:
      out_path: output file path
      title_en: English title (for cover + first content page)
      title_ar: Arabic title (for cover)
      sections: list of dicts with keys:
        - heading_en (str)
        - heading_ar (str, optional)
        - body (str) — may contain \n\n for paragraph breaks
        - quote (str, optional) — a centered italic quote
        - arabic (str, optional) — Arabic text to render RTL
        - source (str, optional) — citation line
      meta: subtitle text (e.g. "PDF · 24 pages · Ḥanafī School")
    """
    doc = BaseDocTemplate(
        out_path, pagesize=A4,
        leftMargin=22*mm, rightMargin=22*mm,
        topMargin=28*mm, bottomMargin=22*mm,
        title=title_en, author='Jamiatul Ulama Johannesburg',
        subject='Islamic Guidance · ' + title_en,
    )

    # Cover frame (full page)
    cover_frame = Frame(0, 0, A4[0], A4[1], leftPadding=30*mm, rightPadding=30*mm,
                        topPadding=60*mm, bottomPadding=40*mm, id='cover')
    # Content frame (with margins for header/footer)
    content_frame = Frame(22*mm, 22*mm, A4[0] - 44*mm, A4[1] - 50*mm,
                          leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0,
                          id='content')

    doc.addPageTemplates([
        PageTemplate(id='cover', frames=[cover_frame], onPage=_draw_cover),
        PageTemplate(id='content', frames=[content_frame], onPage=_draw_page_chrome),
    ])

    story = []
    # ── Cover page ──
    story.append(Spacer(1, 60*mm))
    story.append(Paragraph('<font color="#E8D08A">Jamiatul Ulama Johannesburg</font>',
                           ParagraphStyle('CoverBrand', fontName='Sans', fontSize=11, alignment=TA_CENTER, textColor=GOLD_PALE)))
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(ar(title_ar),
                           ParagraphStyle('CoverAr', fontName='Amiri', fontSize=28, alignment=TA_CENTER, textColor=GOLD_LIGHT, leading=36)))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(f'<font color="#F5EFE0">{title_en}</font>',
                           ParagraphStyle('CoverEn', fontName='Serif-Bold', fontSize=24, alignment=TA_CENTER, textColor=PARCHMENT, leading=30)))
    if meta:
        story.append(Spacer(1, 6*mm))
        story.append(Paragraph(f'<font color="#D4A830">{meta}</font>',
                               ParagraphStyle('CoverMeta', fontName='Serif-Italic', fontSize=11, alignment=TA_CENTER, textColor=GOLD_LIGHT)))
    story.append(Spacer(1, 14*mm))
    story.append(GeometricDivider(width=120*mm))
    story.append(Spacer(1, 8*mm))
    story.append(Paragraph(ar('وَمَا عَلَيْنَا إِلَّا الْبَلَاغُ الْمُبِينُ'),
                           ParagraphStyle('CoverAyah', fontName='Amiri', fontSize=14, alignment=TA_CENTER, textColor=GOLD_PALE, leading=20)))
    story.append(Paragraph('<font color="#D4A830">"Clear propagation is our only responsibility." — Sūrah Yāsīn 36:17</font>',
                           ParagraphStyle('CoverAyahEn', fontName='Serif-Italic', fontSize=9, alignment=TA_CENTER, textColor=GOLD_LIGHT)))
    story.append(PageBreak())

    # ── Switch to content template ──
    from reportlab.platypus.doctemplate import NextPageTemplate
    story.insert(len(story) - 1, NextPageTemplate('content'))

    # ── Content pages ──
    for i, sec in enumerate(sections):
        if i > 0:
            story.append(Spacer(1, 6*mm))
            story.append(GeometricDivider())
            story.append(Spacer(1, 4*mm))

        if sec.get('heading_en'):
            story.append(Paragraph(sec['heading_en'], style_h2))
        if sec.get('heading_ar'):
            story.append(Paragraph(ar(sec['heading_ar']), style_arabic_centered))
            story.append(Spacer(1, 4*mm))

        if sec.get('quote'):
            story.append(Paragraph(f'"{sec["quote"]}"', style_quote))

        if sec.get('arabic'):
            story.append(Paragraph(ar(sec['arabic']), style_arabic_body))
            story.append(Spacer(1, 3*mm))

        if sec.get('body'):
            # Split body into paragraphs
            for para in sec['body'].split('\n\n'):
                para = para.strip()
                if not para:
                    continue
                story.append(Paragraph(para.replace('\n', '<br/>'), style_body))

        if sec.get('source'):
            story.append(Spacer(1, 2*mm))
            story.append(Paragraph(f'Source: {sec["source"]}', style_source))

    # Closing
    story.append(Spacer(1, 8*mm))
    story.append(GeometricDivider())
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(ar('جمعية العلماء جوهانسبرغ'),
                           ParagraphStyle('EndAr', fontName='Amiri', fontSize=14, alignment=TA_CENTER, textColor=FOREST)))
    story.append(Paragraph('Jamiatul Ulama Johannesburg · Darul Iftā',
                           ParagraphStyle('EndEn', fontName='Serif-Italic', fontSize=10, alignment=TA_CENTER, textColor=GOLD)))
    story.append(Paragraph('P.O. Box 961195, Brixton, 2019, Johannesburg · admin@jamiat.joburg',
                           ParagraphStyle('EndAddr', fontName='Sans', fontSize=8, alignment=TA_CENTER, textColor=INK_MID)))
    story.append(Spacer(1, 4*mm))
    story.append(Paragraph(ar('وَمَا عَلَيْنَا إِلَّا الْبَلَاغُ الْمُبِينُ'),
                           ParagraphStyle('EndAyah', fontName='Amiri', fontSize=12, alignment=TA_CENTER, textColor=GOLD)))

    doc.build(story)
    print(f'  ✓ {out_path}  ({os.path.getsize(out_path):,} bytes)')

# ─── Booklet content definitions ──────────────────────────────────────────────
BOOKLETS = [
    {
        'filename': 'itikaaf-hanafi-guide.pdf',
        'title_en': "I'tikāf: The Complete Ḥanafī Guide",
        'title_ar': 'الاعتكاف: الدليل الحنفي الكامل',
        'meta': 'PDF · 24 pages · Ḥanafī School',
        'sections': [
            {
                'heading_en': 'Definition and Ruling',
                'heading_ar': 'التعريف والحكم',
                'quote': 'I\'tikāf is a Sunnah mu\'akkadah \'alal-kifāyah — if performed by even one person in a locality, the obligation is lifted from the rest.',
                'body': '''I\'tikāf (الاعتكاف) is the spiritual retreat within a masjid, wherein a Muslim secludes himself for the purpose of worship, reflection, and devotion to Allah. Its essential pillar (rukn) is staying (labth) in the masjid with the intention of I\'tikāf.

The ruling of I\'tikāf in the last ten nights of Ramaḍān is Sunnah mu\'akkadah \'alal-kifāyah — a confirmed Sunnah, sufficient if performed by at least one person in a locality. If no one performs it, the entire community is sinful. Outside of Ramaḍān, I\'tikāf is a recommended (nafl) act that may be performed at any time.''',
                'source': 'Al-Hidāyah, Margīnānī · Radd al-Muḥtār, Ibn \'Ābidīn',
            },
            {
                'heading_en': 'Conditions of Validity',
                'heading_ar': 'شروط الصحة',
                'body': '''The conditions (shurūṭ) for a valid I\'tikāf are:

1. Islam — non-Muslims cannot perform I\'tikāf.
2. Sanity (\'aql) — the insane and unconscious cannot intend.
3. Intention (niyyah) — the heart must intend the act for Allah\'s sake.
4. Being in a masjid — for men, this is obligatory; for women, in her designated prayer space at home.
5. For the Sunnah I\'tikāf of Ramaḍān: in a masjid where the five daily Ṣalāh are held in congregation (jamā\'ah). A muṣallā not formally designated as a masjid does not fulfil this.
6. Purity from major ritual impurity (janābah, ḥaiḍ, nifās) — one must enter I\'tikāf in a state of wudū.

The woman in ḥaiḍ or nifās cannot perform I\'tikāf; if it begins during I\'tikāf, she must leave the masjid.''',
                'source': 'Fatāwā Hindiyyah, Vol. 1 · Al-Durr al-Mukhtār',
            },
            {
                'heading_en': 'The Sunnah Period',
                'heading_ar': 'الوقت المسنون',
                'body': '''The Sunnah period of I\'tikāf is the last ten nights of Ramaḍān — entering the masjid before sunset (ghurūb) on the 20th of Ramaḍān, and remaining until the moon of Eid al-Fiṭr is sighted.

The Prophet ﷺ established this practice. \'Ā\'ishah رضي الله عنها reported: "The Prophet ﷺ used to practise I\'tikāf in the last ten days of Ramaḍān until Allah took him, and then his wives practised I\'tikāf after him." (Ṣaḥīḥ al-Bukhārī 2026, Ṣaḥīḥ Muslim 1172)

Nafl I\'tikāf may be performed at any time, even for a short duration. The minimum is a moment of intention while in the masjid.''',
                'source': 'Ṣaḥīḥ al-Bukhārī 2026 · Ṣaḥīḥ Muslim 1172',
            },
            {
                'heading_en': 'What Nullifies I\'tikāf',
                'heading_ar': 'مبطلات الاعتكاف',
                'body': '''The following nullify (mubṭilāt) the I\'tikāf:

1. Leaving the masjid without a valid Shar\'ī reason. Valid reasons include: using the toilet, making wudū, eating if food cannot be brought inside, attending to a genuine necessity (e.g. medical emergency). One must return immediately after completing the necessity.

2. Marital relations ( jimā\' ) or any act that leads to it.

3. Apostasy (may Allah protect us).

4. Loss of consciousness due to illness, intoxication, or fainting for an extended period.

Leaving for a valid reason must be only for the necessary duration. To linger beyond what is needed nullifies the I\'tikāf.''',
                'source': 'Radd al-Muḥtār · Baḥr al-Rā\'iq',
            },
            {
                'heading_en': 'Recommended Practices',
                'heading_ar': 'الآداب والمستحبات',
                'body': '''The following are recommended (mustaḥabb) during I\'tikāf:

1. Increase in recitation of the Qur\'ān. The Salaf used to complete the Qur\'ān multiple times during I\'tikāf.

2. Abundant dhikr — including tasbīḥ (سبحان الله), taḥmīd (الحمد لله), tahlīl (لا إله إلا الله), and takbīr (الله أكبر).

3. Send blessings (ṣalawāt) upon the Prophet ﷺ frequently.

4. Engage in sincere du\'ā — especially in the last ten nights, seeking Laylat al-Qadr.

5. Avoid vain talk, arguments, and worldly chatter.

6. Eat, drink, and sleep inside the masjid with proper adab — maintaining its sanctity.

7. Avoid backbiting, gossip, and any speech that would diminish the reward of the I\'tikāf.''',
                'source': 'Iḥyā\' \'Ulūm al-Dīn, Ghazālī · Fatāwā Maḥmūdiyyah',
            },
            {
                'heading_en': 'Laylat al-Qadr and I\'tikāf',
                'heading_ar': 'ليلة القدر والاعتكاف',
                'arabic': '''إِنَّا أَنْزَلْنَاهُ فِي لَيْلَةِ الْقَدْرِ ۝ وَمَا أَدْرَاكَ مَا لَيْلَةُ الْقَدْرِ ۝ لَيْلَةُ الْقَدْرِ خَيْرٌ مِنْ أَلْفِ شَهْرٍ''',
                'body': '''Laylat al-Qadr (the Night of Power) is the crowning night of I\'tikāf. Allah says: "We have indeed revealed this in the Night of Power. And what will explain to you what the Night of Power is? The Night of Power is better than a thousand months." (Sūrah al-Qadr 97:1-3)

The Prophet ﷺ said: "Seek Laylat al-Qadr in the odd nights of the last ten nights of Ramaḍān." (Ṣaḥīḥ al-Bukhārī 2017)

The odd nights are the 21st, 23rd, 25th, 27th, and 29th. The most emphasized is the 27th, though the matter is not certain. The du\'ā of \'Ā\'ishah رضي الله عنها should be made: "Allāhumma innaka \'afuwwun, tuḥibbul-\'afwa, fa\'fu \'annī" (O Allah, You are Pardoning, and You love to pardon, so pardon me). (Sunan al-Tirmidhī 3513)''',
                'source': 'Sūrah al-Qadr 97:1-3 · Ṣaḥīḥ al-Bukhārī 2017 · Sunan al-Tirmidhī 3513',
            },
            {
                'heading_en': 'Common Errors to Avoid',
                'heading_ar': 'أخطاء شائعة',
                'body': '''1. Leaving the masjid unnecessarily — even for "a quick chat" or social media. This nullifies the I\'tikāf.

2. Performing I\'tikāf in a muṣallā not designated as a masjid — does not fulfil the Sunnah requirement.

3. Excessive phone use, including for permissible activities — defeats the purpose of seclusion.

4. Treating I\'tikāf as a "sleep-away camp" — the Sunnah is worship, not rest.

5. Talking loudly or disturbing others in the masjid.

6. Neglecting the congregational Ṣalāh — the one in I\'tikāf must attend every congregational prayer in that masjid.

7. Bringing in food with strong odours that may disturb other worshippers.''',
                'source': 'Classical Ḥanafī Fatāwā collections',
            },
        ],
    },
    {
        'filename': 'islamic-dress-code.pdf',
        'title_en': 'Islamic Dress Code for Men & Women',
        'title_ar': 'اللباس الإسلامي للرجال والنساء',
        'meta': 'PDF · 18 pages · Shar\'ī Requirements',
        'sections': [
            {
                'heading_en': 'The Principle of Satr (Concealment)',
                'heading_ar': 'مبدأ الستر',
                'arabic': '''يَا بَنِي آدَمَ قَدْ أَنْزَلْنَا عَلَيْكُمْ لِبَاسًا يُوَارِي سَوْآتِكُمْ وَرِيشًا ۖ وَلِبَاسُ التَّقْوَىٰ ذَٰلِكَ خَيْرٌ''',
                'body': '''Allah says: "O children of Adam, We have bestowed upon you clothing to conceal your private parts and as adornment. But the clothing of righteousness — that is best." (Sūrah al-A\'rāf 7:26)

The concept of satr (concealment of the \'awrah) is the foundation of Islamic dress. The \'awrah is that part of the body which must be covered with clothing that is loose, opaque, and not resembling the opposite sex or the religious dress of other communities.''',
                'source': 'Sūrah al-A\'rāf 7:26 · Sūrah al-Nūr 24:30-31',
            },
            {
                'heading_en': 'The Satr of a Man',
                'heading_ar': 'عورة الرجل',
                'body': '''For a male, the satr (must-be-covered) is from the navel to (and including) the knees. This is the verdict of the Ḥanafī school.

The concealment must meet the following conditions:

1. The cloth must cover the entire area — including the knees themselves.

2. The cloth must not be so tight that it reveals the form (shape) of the satr-e-ghaleez. Skin-tight clothing (tight jeans, tight shorts) breaks this concealment, even if the skin is technically covered.

3. The cloth must not be transparent — the skin colour must not show through.

The Sunnah length of the lower garment (izar/lungi) is to mid-calf. Below the ankle is makrūh tanzīh in the Ḥanafī school, though the Prophet ﷺ explicitly forbade isbāl (dragging the garment out of pride), which is ḥarām.''',
                'source': 'Ṣaḥīḥ al-Bukhārī 366 · Sunan Abī Dāwūd 4093 · Radd al-Muḥtār',
            },
            {
                'heading_en': 'The Satr of a Woman',
                'heading_ar': 'عورة المرأة',
                'body': '''For a free Muslim woman in front of non-maḥram men, the satr is the entire body except the face and the hands (up to and including the wrists). This is the relied-upon (muftā-bih) position of the Ḥanafī school.

The conditions of her concealment:

1. The garment (jilbāb/khimar) must cover the entire body except the face and hands.

2. The garment must be loose — not revealing the shape of the body. Skin-tight "hijab" that outlines the form is contrary to the Shar\'ī requirement.

3. The garment must be opaque — the skin colour must not show through. Sheer fabrics do not fulfil the obligation.

4. The garment must not itself be an adornment (zīnah) that attracts attention. The Sunnah is modesty and concealment.

5. The garment must not resemble the dress of men (tashabbuh) or the religious dress of non-Muslim women.

The face veil (niqāb) is not obligatory according to the relied-upon Ḥanafī position, though it is recommended (mustaḥabb) and was practised by many of the Salaf.''',
                'source': 'Sūrah al-Nūr 24:31 · Sūrah al-Aḥzāb 33:59 · Radd al-Muḥtār',
            },
            {
                'heading_en': 'The Prohibition of Tashabbuh (Imitation)',
                'heading_ar': 'تحريم التشبه',
                'arabic': '''لَعَنَ رَسُولُ اللَّهِ ﷺ الْمُتَشَبِّهَاتِ بِالرِّجَالِ مِنَ النِّسَاءِ وَالْمُتَشَبِّهِينَ بِالنِّسَاءِ مِنَ الرِّجَالِ''',
                'body': '''The Prophet ﷺ cursed those who imitate the opposite sex: "The Messenger of Allah ﷺ cursed the women who imitate men and the men who imitate women." (Ṣaḥīḥ al-Bukhārī 5885)

Likewise, the Prophet ﷺ said: "Whoever imitates a people is one of them." (Sunan Abī Dāwūd 4031, graded ṣaḥīḥ by al-Albānī)

These principles extend beyond mere clothing to behaviour, speech, and presentation. A Muslim\'s dress should be distinct — recognizably modest, recognizably Muslim, and recognizably conforming to the gender of the wearer.''',
                'source': 'Ṣaḥīḥ al-Bukhārī 5885 · Sunan Abī Dāwūd 4031',
            },
            {
                'heading_en': 'The Importance of Loose Garments',
                'heading_ar': 'أهمية اللباس الفضفاض',
                'body': '''A common modern error is to wear "Islamic" clothing that is technically covering the satr but is so tight that it reveals the form. This is contrary to the Shar\'ī requirement.

The Ḥanafī fuqahā have explicitly stated that the concealment of the satr requires that the form (shakl) of the satr-e-ghaleez not be revealed. Tight jeans, tight T-shirts, tight "abāyas" that outline the body — all of these fail the Shar\'ī requirement, even though the skin is technically covered.

The Sunnah attire — a loose izar/lungi and a loose qamīṣ (kurta) for men; a loose jilbāb and khimar for women — is the most complete answer. Loose trousers that cover below the knees with room to spare are acceptable for men, provided they do not resemble kuffār-style dress.''',
                'source': 'Radd al-Muḥtār · Al-Durr al-Mukhtār',
            },
            {
                'heading_en': 'Practical Guidance',
                'heading_ar': 'إرشادات عملية',
                'body': '''For the Muslim man:

• The lower garment should cover from the navel to below the knee, with looseness.
• A loose qamīṣ (kurta) is Sunnah.
• White clothing is recommended (the Prophet ﷺ said: "Wear white clothes, for they are the best of your clothes." — Sunan al-Tirmidhī 2810).
• The beard is obligatory (wujoob) according to the Ḥanafī school — to trim it below a fist-length is not permissible.
• The izar (lower garment) above the ankle is Sunnah; below is makrūh tanzīh; dragging out of pride is ḥarām.

For the Muslim woman:

• The garment should cover everything except the face and hands.
• Loose, opaque, non-revealing.
• A black or dark-coloured jilbāb is Sunnah.
• The khimar (head-covering) should cover the head, neck, and chest.
• The garment must not resemble the dress of non-Muslim women or of men.''',
                'source': 'Sunan al-Tirmidhī 2810 · Fatāwā Hindiyyah',
            },
        ],
    },
    {
        'filename': 'qurbani-rulings-guide.pdf',
        'title_en': 'Qurbāni: Complete Ruling Guide',
        'title_ar': 'الأضحية: الدليل الكامل للأحكام',
        'meta': 'PDF · 12 pages · Dhul-Ḥijjah',
        'sections': [
            {
                'heading_en': 'The Obligation of Qurbāni',
                'heading_ar': 'وجوب الأضحية',
                'arabic': '''فَصَلِّ لِرَبِّكَ وَانْحَرْ''',
                'body': '''Allah says: "So pray to your Lord and sacrifice [to Him alone]." (Sūrah al-Kawthar 108:2)

Qurbāni (Uḍḥiyyah) is the sacrifice of a specific animal on the days of Eid al-Aḍḥā (10th, 11th, 12th Dhul-Ḥijjah) in commemoration of the sacrifice of Ibrāhīm \'alayhis-salām.

The ruling: Qurbāni is Wājib upon every adult, sane Muslim who possesses the Niṣāb (the minimum threshold of wealth) on the days of Qurbāni, after deducting basic needs and debts. This is the position of the Ḥanafī school; the majority of scholars hold it to be a strongly emphasised Sunnah (Sunnah mu\'akkadah).''',
                'source': 'Sūrah al-Kawthar 108:2 · Al-Hidāyah',
            },
            {
                'heading_en': 'Eligible Animals',
                'heading_ar': 'الحيوانات الجائزة',
                'body': '''The following animals are eligible for Qurbāni:

1. Camel (jamal) — minimum age 5 years. Worth 7 shares.
2. Cow, ox, or buffalo (baqarah) — minimum age 2 years. Worth 7 shares.
3. Goat or sheep (ma\'z/dājah) — minimum age 1 year. A sheep of 6 months is acceptable if it is so fat that it appears to be one year old. Worth 1 share (no sharing).

For a large animal (camel or cow), up to 7 people may share, provided each person\'s intention is Qurbāni (not mere meat-procurement). For a small animal (goat/sheep), only one person\'s Qurbāni may be made.''',
                'source': 'Ṣaḥīḥ al-Bukhārī 5547 · Sunan Abī Dāwūd 2810',
            },
            {
                'heading_en': 'Disqualifying Defects',
                'heading_ar': 'العيوب المانعة',
                'body': '''The following defects disqualify an animal from Qurbāni:

1. Blindness in one or both eyes (clearly visible).
2. Obvious lameness — the animal cannot walk to the place of slaughter.
3. Missing a third or more of an ear or the tail.
4. Missing a major limb.
5. Extreme emaciation — the animal has no marrow in its bones.
6. Missing more than one-third of the tongue.
7. Broken teeth — such that the animal cannot graze.

Minor defects (e.g. a small tear in the ear, a broken horn) do not disqualify but are disliked. The ideal Qurbāni animal is healthy, whole, and of good quality.''',
                'source': 'Sunan Abī Dāwūd 2802 · Fatāwā Hindiyyah',
            },
            {
                'heading_en': 'The Method of Slaughter',
                'heading_ar': 'طريقة الذبح',
                'arabic': '''بِسْمِ اللَّهِ، اللَّهُ أَكْبَر''',
                'body': '''The method of slaughter (dhabḥ):

1. Face the animal toward the qiblah.
2. Sharpen the blade well; spare the animal unnecessary pain.
3. Recite: "Bismillāhi Allāhu Akbar" (بِسْمِ اللَّهِ، اللَّهُ أَكْبَر).
4. Recite the du\'ā of Ibrāhīm \'alayhis-salām: "Innī wajjahtu wajhiya lilladhī faṭaras-samāwāti wal-arḍa ḥanīfan wa mā ana minal-mushrikīn. Inna ṣalātī wa nusukī wa maḥyāya wa mamātī lillāhi rabbil-\'ālamīn, lā sharīka lah, wa bidhālika umirtu wa ana minal-muslimīn."
5. For Qurbāni: add "Allāhumma taqabbal min [name]" (e.g. "Allāhumma taqabbal minnī" — O Allah, accept from me).
6. Cut the trachea (halq), oesophagus (mari\'), and both jugular veins (wardān). Cutting all four is Sunnah; cutting at least three is necessary.
7. Do not skin or move the animal until it is fully cold (i.e. until all motion has ceased).

The knife should not be sharpened in front of the animal. The animal should not be dragged to the place of slaughter. One animal should not be slaughtered in front of another.''',
                'source': 'Ṣaḥīḥ al-Bukhārī 5565 · Sunan Abī Dāwūd 2815',
            },
            {
                'heading_en': 'Distribution of the Meat',
                'heading_ar': 'توزيع اللحم',
                'body': '''The Sunnah method of distribution is to divide the meat into three equal portions:

1. One-third for oneself and one\'s household.
2. One-third for friends and relatives (as a gift).
3. One-third for the poor and needy (as ṣadaqah).

This three-way division is Sunnah, not obligatory. It is permissible to give the entire animal away, or to keep it all for one\'s household.

It is not permissible to sell the meat of the Qurbāni animal, nor its skin. The skin may be used by the owner (e.g. as a prayer mat) or given away as ṣadaqah. If sold, the proceeds must be given as ṣadaqah.

The skin may also be given to a reliable Islamic organisation or madrasah as Lillah.''',
                'source': 'Fatāwā Hindiyyah · Bahishti Zewar',
            },
            {
                'heading_en': 'Important Rulings',
                'heading_ar': 'أحكام مهمة',
                'body': '''1. The time of Qurbāni begins after the Eid Ṣalāh on the 10th of Dhul-Ḥijjah, and ends at sunset on the 12th. Qurbāni before the Eid Ṣalāh is not valid.

2. It is recommended (mustaḥabb) for the owner of the Qurbāni to slaughter it himself if he is able. If he is not, he should be present and witness it.

3. The one intending Qurbāni should not cut their hair or nails from the 1st of Dhul-Ḥijjah until after the Qurbāni is performed. (Sunan Abī Dāwūd 2791)

4. Qurbāni performed on behalf of a deceased person is valid, and its reward reaches the deceased.

5. A traveller (musāfir) is exempt from Qurbāni according to the Ḥanafī school.

6. Qurbāni is Wājib separately on each adult Muslim; the Qurbāni of the husband does not fulfil the wife\'s obligation (unless he makes intention on her behalf with her permission).''',
                'source': 'Sunan Abī Dāwūd 2791 · Fatāwā Hindiyyah',
            },
        ],
    },
    {
        'filename': 'ramadan-fasting-tarawih-guide.pdf',
        'title_en': 'Ramaḍān Fasting & Tarāwīḥ Guide',
        'title_ar': 'صيام رمضان وقيام التراويح',
        'meta': 'PDF · 30 pages · Complete Ramaḍān Manual',
        'sections': [
            {
                'heading_en': 'The Obligation of Fasting',
                'heading_ar': 'وجوب الصيام',
                'arabic': '''يَا أَيُّهَا الَّذِينَ آمَنُوا كُتِبَ عَلَيْكُمُ الصِّيَامُ كَمَا كُتِبَ عَلَى الَّذِينَ مِنْ قَبْلِكُمْ لَعَلَّكُمْ تَتَّقُونَ''',
                'body': '''Allah says: "O you who have believed, decreed upon you is fasting as it was decreed upon those before you, that you may become righteous." (Sūrah al-Baqarah 2:183)

The fasting of the entire month of Ramaḍān (29 or 30 days, depending on the moon-sighting) is Fard \'ayn — an absolute obligation upon every adult, sane Muslim, male or female, regardless of geographic location. There is no regional exemption; the obligation is universal.

The Prophet ﷺ said: "Islām is built on five: testifying that there is no god but Allah and that Muḥammad is the Messenger of Allah, establishing the prayer, giving Zakāh, the pilgrimage to the House, and fasting Ramaḍān." (Ṣaḥīḥ al-Bukhārī 8, Ṣaḥīḥ Muslim 16)''',
                'source': 'Sūrah al-Baqarah 2:183 · Ṣaḥīḥ al-Bukhārī 8',
            },
            {
                'heading_en': 'Who Must Fast and Who Is Exempt',
                'heading_ar': 'من يجب عليه الصيام ومن يعفى',
                'body': '''Fasting is obligatory upon every adult (bāligh), sane (\'āqil) Muslim who is physically able.

The following are exempt:

1. The traveller (musāfir) — defined in the Ḥanafī school as one who undertakes a journey of 77 km or more. He may break his fast and make it up later. However, if he begins fasting before travelling, he should complete it.

2. The sick (marīḍ) — whose illness would be worsened by fasting, or whose recovery would be delayed. He makes up the fast later.

3. The menstruating woman (ḥā\'iḍ) and the woman in post-natal bleeding (nufasā\') — must NOT fast; they make up the fasts later.

4. The pregnant and nursing woman — if she fears for her own or the child\'s health, she may break the fast and make it up later.

5. The elderly who cannot fast — they pay a Fidyah (one meal\'s worth of grain, equivalent to Ṣadaqah al-Fiṭr) for each missed fast.

6. The insane, the unconscious, and pre-pubescent children — not obligated.

All those who break their fast for a valid reason must make it up (qaḍā\') before the next Ramaḍān, except the elderly who pay Fidyah.''',
                'source': 'Sūrah al-Baqarah 2:184-185 · Al-Hidāyah',
            },
            {
                'heading_en': 'The Time of Fasting',
                'heading_ar': 'وقت الصيام',
                'arabic': '''وَكُلُوا وَاشْرَبُوا حَتَّىٰ يَتَبَيَّنَ لَكُمُ الْخَيْطُ الْأَبْيَضُ مِنَ الْخَيْطِ الْأَسْوَدِ مِنَ الْفَجْرِ ۖ ثُمَّ أَتِمُّوا الصِّيَامَ إِلَى اللَّيْلِ''',
                'body': '''Allah says: "And eat and drink until the white thread of dawn becomes distinct to you from the black thread. Then complete the fast until the night." (Sūrah al-Baqarah 2:187)

The fast begins at the true dawn (Ṣubḥ Ṣādiq — Fajr begins) and ends at sunset (Ghurūb — Maghrib begins).

The pre-dawn meal (Suhūr) is Sunnah and should not be neglected. The Prophet ﷺ said: "Eat Suhūr, for in Suhūr there is blessing." (Ṣaḥīḥ al-Bukhārī 1923)

One should delay the Suhūr until close to Fajr, and hasten to break the fast (Iftār) at sunset. The Prophet ﷺ said: "The people will remain upon good as long as they hasten in breaking the fast." (Ṣaḥīḥ al-Bukhārī 1957)''',
                'source': 'Sūrah al-Baqarah 2:187 · Ṣaḥīḥ al-Bukhārī 1923, 1957',
            },
            {
                'heading_en': 'What Nullifies the Fast',
                'heading_ar': 'مبطلات الصيام',
                'body': '''The following nullify the fast and require qaḍā\' (making up):

1. Eating, drinking, or taking any nourishment deliberately.
2. Marital relations (jimā\') during the day of Ramaḍān — this also requires Kaffārah (expiation).
3. Deliberate vomiting (mouthful).
4. Menstruation or post-natal bleeding — even at the last moment before sunset.
5. Ejaculation caused by deliberate action.
6. Apostasy (may Allah protect us).

The following do NOT nullify the fast:

1. Eating/drinking out of forgetfulness — the fast remains valid. (Ṣaḥīḥ al-Bukhārī 1933)
2. Swallowing saliva, even in abundance.
3. Using a miswāk.
4. Rinsing the mouth or nose (without taking water down the throat).
5. Having a wet dream.
6. Applying kohl (surmah) or eye drops.
7. Taking an injection (intramuscular or intravenous, provided it is not a nutritional injection).
8. Cupping (ḥijāmah) — according to the Ḥanafī school.
9. Blood tests or minor bleeding.''',
                'source': 'Ṣaḥīḥ al-Bukhārī 1933 · Fatāwā Hindiyyah',
            },
            {
                'heading_en': 'The Kaffārah (Expiation)',
                'heading_ar': 'الكفارة',
                'body': '''If a person deliberately engages in marital relations during the day of Ramaḍān, he must:

1. Free a Muslim slave (if available — typically not applicable today).
2. If not possible: fast for two consecutive lunar months.
3. If not possible: feed 60 poor people a meal each (or the equivalent in grain).

This is the Kaffārah. There is no Kaffārah for breaking the fast in any other way — only qaḍā\' (making up that one day).

The qaḍā\' fasts should be made before the next Ramaḍān. If delayed without valid reason, a Fidyah is also due for each missed day.''',
                'source': 'Ṣaḥīḥ al-Bukhārī 1936 · Fatāwā Hindiyyah',
            },
            {
                'heading_en': 'Tarāwīḥ Prayer',
                'heading_ar': 'صلاة التراويح',
                'body': '''Tarāwīḥ is the Sunnah prayer performed in Ramaḍān after Ishā\'. It is Sunnah mu\'akkadah for both men and women, though it is more emphasised for men to attend in congregation at the masjid.

The number of rak\'āt in the Ḥanafī school is 20 (in addition to the 3 rak\'āt of Witr). This is the practice of the Ummah from the time of the Ṣaḥābah and was formalised by \'Umar ibn al-Khaṭṭāb رضي الله عنه.

The Prophet ﷺ said: "Whoever stands (in prayer) in Ramaḍān out of faith and seeking reward, all his previous sins will be forgiven." (Ṣaḥīḥ al-Bukhārī 37)

It is Sunnah to recite the entire Qur\'ān in Tarāwīḥ over the course of the month — completing it on the 27th night, so that the Khatm al-Qur\'ān falls on Laylat al-Qadr.''',
                'source': 'Ṣaḥīḥ al-Bukhārī 37 · Muwaṭṭa\' Mālik',
            },
            {
                'heading_en': 'Laylat al-Qadr',
                'heading_ar': 'ليلة القدر',
                'arabic':'''لَيْلَةُ الْقَدْرِ خَيْرٌ مِنْ أَلْفِ شَهْرٍ''',
                'body': '''Allah says: "The Night of Power is better than a thousand months." (Sūrah al-Qadr 97:3)

Laylat al-Qadr is the crowning night of Ramaḍān, on which the Qur\'ān was revealed. The Prophet ﷺ said: "Seek Laylat al-Qadr in the odd nights of the last ten nights of Ramaḍān." (Ṣaḥīḥ al-Bukhārī 2017)

The odd nights are the 21st, 23rd, 25th, 27th, and 29th. The most emphasised is the 27th, though absolute certainty is not given.

\'Ā\'ishah رضي الله عنها asked the Prophet ﷺ what to say on this night. He ﷺ taught her: "Allāhumma innaka \'afuwwun tuḥibbul-\'afwa fa\'fu \'annī" (O Allah, You are Pardoning, You love to pardon, so pardon me). (Sunan al-Tirmidhī 3513)''',
                'source': 'Sūrah al-Qadr 97:1-5 · Ṣaḥīḥ al-Bukhārī 2017 · Sunan al-Tirmidhī 3513',
            },
            {
                'heading_en': 'I\'tikāf in Ramaḍān',
                'heading_ar': 'الاعتكاف في رمضان',
                'body': '''I\'tikāf in the last ten days of Ramaḍān is Sunnah mu\'akkadah \'alal-kifāyah. If performed by even one person in a locality, the obligation is lifted from the rest.

See the dedicated "I\'tikāf: Complete Ḥanafī Guide" booklet for full details.''',
                'source': 'Ṣaḥīḥ al-Bukhārī 2026',
            },
            {
                'heading_en': 'Ṣadaqah al-Fiṭr',
                'heading_ar': 'صدقة الفطر',
                'body': '''Before the Eid al-Fiṭr prayer, every Muslim — male or female, young or old — must pay Ṣadaqah al-Fiṭr (also called Fiṭranah). It is Wājib upon the head of the household to pay on behalf of himself and all his dependants.

The amount: one ṣā\' of the staple food of the region (wheat, barley, dates, raisins, etc.). In the Ḥanafī school, the monetary equivalent is permitted. The current value (1448 AH / 2026) is approximately R38.00 per person in South Africa.

It must be paid before the Eid prayer, so that the poor may also enjoy Eid. If delayed, it remains a debt but loses its Eid-specific reward.''',
                'source': 'Ṣaḥīḥ al-Bukhārī 1503 · Al-Hidāyah',
            },
        ],
    },
    {
        'filename': 'duas-qurbani-aqiqah.pdf',
        'title_en': "Du'ās for Qurbāni & 'Aqīqah",
        'title_ar': 'أدعية الأضحية والعقيقة',
        'meta': 'PDF · 4 pages · Transliteration & Translation',
        'sections': [
            {
                'heading_en': 'Before Slaughter',
                'heading_ar': 'قبل الذبح',
                'arabic': '''بِسْمِ اللَّهِ، اللَّهُ أَكْبَر''',
                'body': '''Before slaughtering the animal, recite:

Bismillāhi Allāhu Akbar.

(In the name of Allah, Allah is the Greatest.)

Then place the animal facing the qiblah. Sharpen the blade. Spare the animal unnecessary suffering.''',
                'source': 'Sunan Abī Dāwūd 2810',
            },
            {
                'heading_en': 'The Du\'ā for Qurbāni',
                'heading_ar': 'دعاء الأضحية',
                'arabic': '''اللَّهُمَّ مِنْكَ وَلَكَ''',
                'body': '''For Qurbāni, recite the following du\'ā after Bismillāhi Allāhu Akbar:

Allāhumma minka wa laka.

(O Allah, this is from You and for You.)

Then recite the du\'ā of Ibrāhīm \'alayhis-salām, which the Prophet ﷺ also recited:

Innī wajjahtu wajhiya lilladhī faṭaras-samāwāti wal-arḍa ḥanīfan wa mā ana minal-mushrikīn. Inna ṣalātī wa nusukī wa maḥyāya wa mamātī lillāhi rabbil-\'ālamīn, lā sharīka lah, wa bidhālika umirtu wa ana minal-muslimīn.

(Indeed, I have turned my face toward He who created the heavens and the earth, inclining toward truth, and I am not of those who associate partners with Allah. Indeed, my prayer, my rites of sacrifice, my living, and my dying are for Allah, Lord of the worlds. No partner has He. And this I have been commanded, and I am of the Muslims.)''',
                'source': 'Ṣaḥīḥ Muslim 1218 · Sunan Abī Dāwūd 2810',
            },
            {
                'heading_en': 'For Qurbāni on Behalf of Another',
                'heading_ar': 'للأضحية عن الغير',
                'arabic': '''اللَّهُمَّ تَقَبَّلْ مِنْ فُلَان''',
                'body': '''If you are performing Qurbāni on behalf of another person (living or deceased), add after the du\'ā:

Allāhumma taqabbal min [name].

For example, if performing on behalf of your father named Aḥmed:
"Allāhumma taqabbal min Aḥmed."

(O Allah, accept from Aḥmed.)

If you are performing your own Qurbāni, say:
"Allāhumma taqabbal minnī."

(O Allah, accept from me.)''',
                'source': 'Ṣaḥīḥ al-Bukhārī 6830 · Sunan Ibn Mājah 3130',
            },
            {
                'heading_en': 'For \'Aqīqah',
                'heading_ar': 'للعقيقة',
                'body': '''\'Aqīqah is the sacrifice performed on the occasion of the birth of a child. Two sheep/goats are sacrificed for a boy; one for a girl. It is performed on the 7th day after birth (or 14th, or 21st).

The du\'ā is the same as for Qurbāni (Bismillāhi Allāhu Akbar, then Allāhumma minka wa laka, then the du\'ā of Ibrāhīm \'alayhis-salām), with the addition of the name of the child on whose behalf the \'Aqīqah is being offered:

Allāhumma hādhihi \'aqīqatu [name], damuhā bidamihī, wa lahmuhā bilahmihī, wa \'aẓmuhā bi\'aẓmihī, wa sha\'ruhā bisha\'rihī, wa jilduhā bijildihī. Allāhumma ij\'alhā fidā\'an li-[name] minan-nār.

(O Allah, this is the \'Aqīqah of [name]. Its blood is for his blood, its flesh for his flesh, its bone for his bone, its hair for his hair, its skin for his skin. O Allah, make it a ransom for [name] from the Fire.)''',
                'source': 'Sunan Ibn Mājah 3165 · Fatāwā Hindiyyah',
            },
            {
                'heading_en': 'At the Time of Slaughter',
                'heading_ar': 'عند الذبح',
                'body': '''When actually performing the slaughter, recite:

Bismillāhi Allāhu Akbar.

Then cut:
1. The trachea (halq — the windpipe).
2. The oesophagus (mari\' — the food pipe).
3. Both jugular veins (wardān — the two blood vessels on either side of the neck).

Cutting all four is Sunnah. Cutting at least three is necessary (wājib) for the slaughter to be ḥalāl.

Do not skin or move the animal until it is fully cold (i.e. all motion has ceased).''',
                'source': 'Sunan Abī Dāwūd 2815 · Fatāwā Hindiyyah',
            },
        ],
    },
    {
        'filename': 'muharram-ashura-fasting-guide.pdf',
        'title_en': 'Muḥarram & Āshūrā — Sunnah Fasting Guide',
        'title_ar': 'محرم وعاشوراء — دليل الصيام المسنون',
        'meta': 'PDF · 6 pages · With Ḥadīth Citations',
        'sections': [
            {
                'heading_en': 'The Sacred Month of Muḥarram',
                'heading_ar': 'الشهر الحرام محرم',
                'arabic': '''إِنَّ عِدَّةَ الشُّهُورِ عِنْدَ اللَّهِ اثْنَا عَشَرَ شَهْرًا فِي كِتَابِ اللَّهِ يَوْمَ خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ مِنْهَا أَرْبَعَةٌ حُرُمٌ''',
                'body': '''Muḥarram is the first month of the Islamic Hijri calendar and one of the four sacred (ḥurum) months mentioned in the Qur\'ān. Allah says: "Indeed, the number of months with Allah is twelve in the register of Allah from the day He created the heavens and the earth; of these, four are sacred." (Sūrah al-Tawbah 9:36)

The four sacred months are: Muḥarram, Rajab, Dhul-Qa\'dah, and Dhul-Ḥijjah. Good deeds in these months carry greater reward, and sins carry greater weight.

The Prophet ﷺ said: "The best of fasting after Ramaḍān is the month of Allah, Muḥarram." (Ṣaḥīḥ Muslim 1163)''',
                'source': 'Sūrah al-Tawbah 9:36 · Ṣaḥīḥ Muslim 1163',
            },
            {
                'heading_en': 'The Day of Āshūrā (10th Muḥarram)',
                'heading_ar': 'يوم عاشوراء',
                'arabic': '''صِيَامُ يَوْمِ عَاشُورَاءَ أَحْتَسِبُ عَلَى اللَّهِ أَنْ يُكَفِّرَ السَّنَةَ الَّتِي قَبْلَهُ''',
                'body': '''Āshūrā falls on the 10th of Muḥarram. The Prophet ﷺ said: "Fasting the day of Āshūrā, I hope that Allah will expiate the sins of the year before it." (Ṣaḥīḥ Muslim 1162)

When the Prophet ﷺ arrived in Madīnah, he found the Jews fasting on this day in commemoration of Mūsā \'alayhis-salām being saved from Fir\'aun. He ﷺ said: "We have more right to Mūsā than they." (Ṣaḥīḥ al-Bukhārī 2003)

The Prophet ﷺ was told that the Jews of Madīnah fasted only on the 10th. He ﷺ said: "If I live until next year, I will surely fast on the 9th." (Ṣaḥīḥ Muslim 1134) — to differ from the practice of the People of the Book.''',
                'source': 'Ṣaḥīḥ al-Bukhārī 2003 · Ṣaḥīḥ Muslim 1162, 1134',
            },
            {
                'heading_en': 'The Sunnah Method of Fasting Āshūrā',
                'heading_ar': 'طريقة صيام عاشوراء المسنونة',
                'body': '''The Sunnah is to fast on TWO days, to differ from the Jews who fast only the 10th:

Option 1 (preferred — the practice of the Prophet ﷺ in his final intention): Fast on the 9th and 10th of Muḥarram.

Option 2: Fast on the 10th and 11th of Muḥarram.

If one fasts only the 10th, the fast is valid and the reward is attained, but the recommended practice is to add either the 9th or the 11th.

The 9th of Muḥarram is called Tāsū\'ā. The 10th is Āshūrā.

For the year 1448 AH: Āshūrā falls on Friday, 26 June 2026. The 9th falls on Thursday, 25 June 2026. The 11th falls on Saturday, 27 June 2026.''',
                'source': 'Ṣaḥīḥ Muslim 1134 · Sunan Abī Dāwūd 2445',
            },
            {
                'heading_en': 'Historical Significance',
                'heading_ar': 'الأهمية التاريخية',
                'body': '''The 10th of Muḥarram is the day on which Allah saved Mūsā \'alayhis-salām and his people from Fir\'aun, and drowned Fir\'aun and his army. Mūsā \'alayhis-salām fasted this day in gratitude to Allah.

Other significant events that scholars have mentioned as occurring on Āshūrā:

• The repentance of Ādam \'alayhis-salām was accepted.
• The ark of Nūḥ \'alayhis-salām came to rest on Mount Judī.
• Ibrāhīm \'alayhis-salām was born.
• The martyrdom of Ḥusayn ibn \'Alī رضي الله عنهما at Karbalā\' occurred on the 10th of Muḥarram, 61 AH.

The martyrdom of Ḥusayn رضي الله عنه is a tragedy that grieved the entire Ummah, but the innovation (bid\'ah) of mourning ceremonies, chest-beating, and self-flagellation has no basis in the Sunnah and is contrary to the practice of the Salaf.''',
                'source': 'Ṣaḥīḥ al-Bukhārī 2003 · Classical Tafsīr works',
            },
            {
                'heading_en': 'Recommended Acts on Āshūrā',
                'heading_ar': 'الأعمال المستحبة في عاشوراء',
                'body': '''1. Fasting on the 9th and 10th (or 10th and 11th). This is the primary Sunnah.

2. Increased generosity (ṣadaqah) — the Prophet ﷺ said: "Whoever is generous to his family on the day of Āshūrā, Allah will be generous to him for the entire year." (Reported by al-Bayhaqī; scholars have differed on its authenticity, but many scholars of the past acted upon it.)

3. Increased dhikr, recitation of the Qur\'ān, and du\'ā.

4. Reconciliation of broken relationships.

5. Visiting the sick and the elderly.

Note: Some fabricated practices have been attributed to Āshūrā (e.g. cooking a special dish, applying kohl, taking a special bath). These have no basis in the Sunnah.''',
                'source': 'Sunan al-Bayhaqī · verified Fatāwā collections',
            },
        ],
    },
    {
        'filename': 'satr-e-aurah-salah-attire.pdf',
        'title_en': 'Satr-e-Aurah & Valid Ṣalāh Attire',
        'title_ar': 'الستر ولباس الصلاة الصحيح',
        'meta': 'PDF · 8 pages · Fiqh of Ṣalāh',
        'sections': [
            {
                'heading_en': 'The Condition of Satr in Ṣalāh',
                'heading_ar': 'شرط الستر في الصلاة',
                'body': '''The concealment of the satr (the must-be-covered parts of the body) is a condition (sharṭ) for the validity of Ṣalāh. This is among the shurūṭ al-ṣalāh (the conditions that must be met before takbīr al-taḥrīmah).

For a male: from the navel to (and including) the knees.
For a free female: the entire body except the face and the hands (up to and including the wrists).

This concealment requires:
1. That the entire area be covered.
2. That the form (shape) of the satr-e-ghaleez not be revealed — not merely that the skin be covered by cloth.
3. That the colour of the skin not show through (the cloth must be opaque).''',
                'source': 'Al-Hidāyah · Radd al-Muḥtār',
            },
            {
                'heading_en': 'Tight Clothing and Ṣalāh',
                'heading_ar': 'اللباس الضيق والصلاة',
                'body': '''A common error in our time is the wearing of tight, form-fitting clothing during Ṣalāh. This includes:

• Tight jeans, especially in the sajdah posture, which reveal the form of the satr-e-ghaleez.
• Tight shorts that ride above the knee in rukū\' or sajdah.
• Leggings or tight trousers.
• Tight T-shirts that outline the body.

Such clothing breaks the condition of satr concealment, because the form (shakl) of the satr is revealed — even though the skin is technically covered. Ṣalāh in such attire is invalid (bāṭil) and must be repeated.

This is the explicit verdict of the Ḥanafī fuqahā.''',
                'source': 'Radd al-Muḥtār · Al-Durr al-Mukhtār',
            },
            {
                'heading_en': 'What Constitutes Proper Ṣalāh Attire',
                'heading_ar': 'اللباس الصحيح للصلاة',
                'body': '''For the male:

• A loose lower garment (izar, lungi, or loose trousers) that covers from the navel to below the knee, with room to spare so the form is not revealed.
• A loose upper garment (qamīṣ/kurta or a loose shirt) that covers the upper body.
• The Sunnah attire — a loose izar and a loose qamīṣ — is the most complete answer.

For the female:

• A loose jilbāb that covers the entire body except the face and hands.
• A khimar (head-covering) that covers the head, neck, and chest.
• The garment must be opaque and not reveal the form of the body.

Loose trousers that cover below the knees with room to spare are acceptable for men, provided they do not resemble kuffār-style dress or be so tight as to reveal the form.''',
                'source': 'Fatāwā Hindiyyah · Bahishti Zewar',
            },
            {
                'heading_en': 'Common Errors in Modern Dress',
                'heading_ar': 'أخطاء شائعة في اللباس الحديث',
                'body': '''1. Wearing tight jeans or trousers to the masjid and then performing Ṣalāh in them — the Ṣalāh is invalid.

2. Wearing shorts that cover the knees while standing but ride up during rukū\' or sajdah, exposing the satr — invalidates the Ṣalāh.

3. Wearing clothing with images of animate life (humans, animals) — disliked (makrūh) in Ṣalāh; the Ṣalāh is valid but the reward is diminished.

4. Wearing clothing with English text or unsuitable slogans — disliked.

5. Wearing clothing that is transparent or sheer — invalidates the Ṣalāh.

6. Performing Ṣalāh with the \'awrah exposed (e.g. due to a short shirt that exposes the back during sajdah) — invalidates the Ṣalāh if the exposure is for the duration of a rukn.''',
                'source': 'Fatāwā Hindiyyah · Fatāwā Maḥmūdiyyah',
            },
            {
                'heading_en': 'The Principle of Sincerity in Dress',
                'heading_ar': 'مبدأ الإخلاص في اللباس',
                'arabic':'''إِنَّ اللَّهَ لَا يَنْظُرُ إِلَى صُوَرِكُمْ وَأَمْوَالِكُمْ وَلَكِنْ يَنْظُرُ إِلَى قُلُوبِكُمْ وَأَعْمَالِكُمْ''',
                'body': '''The Prophet ﷺ said: "Indeed, Allah does not look at your forms and your wealth, but He looks at your hearts and your deeds." (Ṣaḥīḥ Muslim 2564)

This does not mean that dress is irrelevant — the conditions of satr must be met for the validity of Ṣalāh, and the Sunnah of dress should be observed as an expression of devotion. But the heart\'s intention is what Allah sees.

A Muslim\'s dress should be:
• Modest, conforming to the Shar\'ī requirements.
• Clean and presentable, for Ṣalāh especially.
• Distinct, not imitating the kuffār.
• Free from ostentation (riyā\') — not worn to show off.

May Allah grant us sincerity in our inward and outward.''',
                'source': 'Ṣaḥīḥ Muslim 2564',
            },
        ],
    },
    {
        'filename': 'zakat-nisab-poster-1448.pdf',
        'title_en': 'Zakāh Niṣāb Poster — 1448 AH',
        'title_ar': 'ملصق نصاب الزكاة — ١٤٤٨ هـ',
        'meta': 'PDF · Print-ready · A3/A4',
        'sections': [
            {
                'heading_en': 'Zakāh Obligations — 1448 AH / 2026',
                'heading_ar': 'الزكاة الواجبة — ١٤٤٨ هـ',
                'body': '''Zakāt Niṣāb: R22,136.44
(Equals 87.48 g of gold or 612.35 g of silver)

Zakāh is 2.5% of qualifying wealth held for one lunar year.

Mahr Fāṭimī: R55,342.04
Minimum Mahr: R1,106.84

Fidyah (per missed fast):
• Ḥanafī: R38.00
• Shāfi\'ī: R13.00

As at 17:00 · 06 Muḥarram 1448 · 22 June 2026
Updated by the Jamiatul Ulama Johannesburg.''',
                'source': 'Jamiat Joburg Financial Indicators — Muḥarram 1448 AH',
            },
            {
                'heading_en': 'Gold Prices (per gram)',
                'heading_ar': 'أسعار الذهب (للغرام)',
                'body': '''9 karat/g: R844.76
14 karat/g: R1,306.55
18 karat/g: R1,689.51
21 karat/g: R1,971.10
22 karat/g: R2,065.03
24 karat/g: R2,252.68

Silver/g: R36.15

Krugerrand (selling price):
1 oz: R73,300
½ oz: R36,700
¼ oz: R18,450
1/10 oz: R8,300''',
                'source': 'As at 22 June 2026',
            },
            {
                'heading_en': 'How to Calculate Your Zakāh',
                'heading_ar': 'كيفية حساب زكاتك',
                'body': '''1. Add up all your cash, bank balances, and gold/silver (at current market value).

2. Add the value of trade stock (if you are a business owner).

3. Add outstanding receivables you reasonably expect to recover.

4. Subtract current liabilities (debts payable within the year).

5. If the total is at or above the Niṣāb (R22,136.44), and you have held this amount for one lunar year, pay 2.5% as Zakāh.

Example: Total qualifying wealth = R100,000.
Zakāh = R100,000 × 2.5% = R2,500.

For a full calculation guide, see the "Zakāh on Business Inventory" article on the Jamiat Joburg website.''',
                'source': 'Fatāwā Hindiyyah · Bahishti Zewar',
            },
            {
                'heading_en': 'Who Can Receive Zakāh',
                'heading_ar': 'مستحقو الزكاة',
                'arabic':'''إِنَّمَا الصَّدَقَاتُ لِلْفُقَرَاءِ وَالْمَسَاكِينِ وَالْعَامِلِينَ عَلَيْهَا وَالْمُؤَلَّفَةِ قُلُوبُهُمْ وَفِي الرِّقَابِ وَالْغَارِمِينَ وَفِي سَبِيلِ اللَّهِ وَابْنِ السَّبِيلِ''',
                'body': '''Allah specifies eight categories of Zakāh recipients in Sūrah al-Tawbah (9:60):

1. The poor (fuqarā\') — those who have some means but less than the Niṣāb.
2. The needy (masākīn) — those who have nothing.
3. The Zakāh administrators (\'āmilīn \'alayhā).
4. Those whose hearts are to be reconciled (mu\'allafat al-qulūb).
5. To free slaves (fī al-riqāb).
6. The debtors (ghārimīn) — unable to pay their debts.
7. In the path of Allah (fī sabīlillāh).
8. The traveller (ibn al-sabīl) — stranded without means.

Zakāh cannot be given to: one\'s parents, grandparents, children, grandchildren, the husband/wife, a non-Muslim (with the exception of the 4th category), or a Sayyid (descendant of the Prophet ﷺ).

Lillah (general charity) may be given to anyone, including non-Muslims and Sayyids.''',
                'source': 'Sūrah al-Tawbah 9:60 · Fatāwā Hindiyyah',
            },
        ],
    },
]

# ─── Main ─────────────────────────────────────────────────────────────────────
def main():
    out_dir = '/home/z/my-project/public/downloads'
    os.makedirs(out_dir, exist_ok=True)

    print(f'Generating {len(BOOKLETS)} PDF booklets → {out_dir}/')
    for book in BOOKLETS:
        out_path = os.path.join(out_dir, book['filename'])
        build_pdf(
            out_path=out_path,
            title_en=book['title_en'],
            title_ar=book['title_ar'],
            sections=book['sections'],
            meta=book.get('meta', ''),
        )

    print()
    print('All PDFs generated.')
    # Print summary table
    print()
    print(f'{"Filename":<45} {"Size":>10}')
    print('-' * 60)
    for book in BOOKLETS:
        p = os.path.join(out_dir, book['filename'])
        sz = os.path.getsize(p)
        print(f'{book["filename"]:<45} {sz:>10,} bytes')

if __name__ == '__main__':
    main()
