"""
report_gen.py — PDF Report Generator using ReportLab.
Generates a clean, professional plagiarism report for a file pair.
"""

import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT


def generate_pdf_report(
    file_a: str,
    file_b: str,
    similarity: float,
    matched_lines_a: list[tuple[int, int]],
    matched_lines_b: list[tuple[int, int]],
    source_a: str = "",
    source_b: str = "",
) -> bytes:
    """
    Generate a PDF plagiarism report and return it as bytes.
    """
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm)
    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        fontSize=22,
        textColor=colors.HexColor("#1a1a2e"),
        spaceAfter=12,
    )
    heading_style = ParagraphStyle(
        "ReportHeading",
        parent=styles["Heading2"],
        fontSize=14,
        textColor=colors.HexColor("#16213e"),
        spaceBefore=16,
        spaceAfter=8,
    )
    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
    )

    elements = []

    # ── Title ──
    elements.append(Paragraph("Structural Plagiarism Report", title_style))
    elements.append(
        HRFlowable(width="100%", thickness=2, color=colors.HexColor("#6c63ff"))
    )
    elements.append(Spacer(1, 12))

    # ── Summary Table ──
    flag = "🔴 FLAGGED" if similarity >= 70 else "🟢 LOW RISK"
    data = [
        ["File A", file_a],
        ["File B", file_b],
        ["Similarity", f"{similarity:.2f}%"],
        ["Status", flag],
    ]
    t = Table(data, colWidths=[4 * cm, 12 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#e8e8ff")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    elements.append(t)
    elements.append(Spacer(1, 16))

    # ── Matched Regions ──
    elements.append(Paragraph("Matched Structural Regions", heading_style))

    if matched_lines_a:
        regions_a = ", ".join(f"L{s}–L{e}" for s, e in matched_lines_a[:20])
        elements.append(
            Paragraph(f"<b>{file_a}:</b> {regions_a}", body_style)
        )
    if matched_lines_b:
        regions_b = ", ".join(f"L{s}–L{e}" for s, e in matched_lines_b[:20])
        elements.append(
            Paragraph(f"<b>{file_b}:</b> {regions_b}", body_style)
        )

    elements.append(Spacer(1, 20))

    # ── Explanation ──
    elements.append(Paragraph("Methodology", heading_style))
    elements.append(
        Paragraph(
            "This report was generated using a compiler-design-based structural "
            "plagiarism detection pipeline. The source code is parsed into an "
            "Abstract Syntax Tree (AST), from which structural tokens are "
            "extracted. These tokens are grouped into overlapping K-Grams, "
            "hashed, and compressed using the Winnowing algorithm to form a "
            "compact fingerprint. Similarity is measured via the Jaccard "
            "Similarity Index (Intersection / Union) of the two fingerprints.",
            body_style,
        )
    )

    doc.build(elements)
    return buf.getvalue()
