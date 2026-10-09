import io
import csv
from decimal import Decimal
from django.http import HttpResponse
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.traders.models import Trader, LegalTrader, InformalTrader
from apps.formalization.models import FormalizationAssessment
from apps.locations.models import Woreda
from apps.audit.models import AuditLog

# Import openpyxl for Excel export
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

# Import ReportLab for PDF generation
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image as RLImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Register Unicode Ethiopic / Latin font
try:
    pdfmetrics.registerFont(TTFont('FreeSerif', '/usr/share/fonts/truetype/freefont/FreeSerif.ttf'))
    pdfmetrics.registerFont(TTFont('FreeSerifBold', '/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf'))
    PDF_FONT = 'FreeSerif'
    PDF_FONT_BOLD = 'FreeSerifBold'
except Exception:
    PDF_FONT = 'Helvetica'
    PDF_FONT_BOLD = 'Helvetica-Bold'


COLUMNS_I18N = {
    'en': [
        "Trader ID", "Trader Type", "Status", "Trade / Business Name", "Owner Full Name",
        "Phone Number", "Woreda", "Kebele", "Specific Location", "TIN",
        "Trade Reg Number", "Business Sector", "Trade Scale", "Ownership Type",
        "Issuing Institution", "Date of Issuance", "House / Plot ID", "National / Resident ID",
        "Gender", "Age", "Market Area", "Nature of Activity", "Estimated Capital (ETB)",
        "Reason for Informal", "Formalization Recommendation", "Enumerator Name",
        "Assessment Date", "Registered Date"
    ],
    'om': [
        "Lakk Daldalaa", "Gosa Daldalaa", "Haala", "Maqaa Daldalaa", "Maqaa Abbaa Qabeenyaa",
        "Lakk Bilbilaa", "Aanaa", "Ganda", "Iddoo Addaa", "TIN (Lakk Gibiraa)",
        "Lakk Galmee Daldalaa", "Damee Daldalaa", "Sadarkaa Daldalaa", "Gosa Abbummaa",
        "Dhaabbata Kennu", "Guyyaa Kenname", "Lakk Manaa / Qabiyyee", "Waraqaa Eenyummaa",
        "Korniyaa", "Umurii", "Bakka Gabaa", "Gosa Hojii Daldalaa", "Kaappitaala Tilmaamame (ETB)",
        "Sababa Daldala Seeraan Alaa", "Gorsa Seeromsuu", "Maqaa Odeeffannoo Funaanaa",
        "Guyyaa Qorannoo", "Guyyaa Galmee"
    ],
    'am': [
        "የነጋዴ መለያ ቁጥር", "የነጋዴ ዓይነት", "ሁኔታ", "የንግድ ስም", "የባለቤት ሙሉ ስም",
        "ስልክ ቁጥር", "ወረዳ", "ቀበሌ", "ልዩ ቦታ", "የግብር ከፋይ መለያ (TIN)",
        "የንግድ ምዝገባ ቁጥር", "የሥራ ዘርፍ", "የንግድ ደረጃ", "የባለቤትነት ዓይነት",
        "ሰጪው ተቋም", "የተሰጠበት ቀን", "የቤት / ይዞታ ቁጥር", "ብሔራዊ / ነዋሪ መታወቂያ",
        "ጾታ", "ዕድሜ", "የገበያ ቦታ", "የሥራው ሁኔታ", "የተገመተ ካፒታል (ብር)",
        "መደበኛ ያልሆነበት ምክንያት", "የመደበኛነት አስተያየት", "መረጃ ሰብሳቢ",
        "የተገመገመበት ቀን", "የተመዘገበበት ቀን"
    ]
}


def sanitize_formula_injection(val):
    if val is None:
        return ""
    s = str(val).strip()
    if s and s[0] in ['=', '+', '-', '@']:
        return "'" + s
    return s


def get_trader_row(t):
    is_legal = t.trader_type == 'LEGAL'
    legal = getattr(t, 'legal_details', None) if is_legal else None
    informal = getattr(t, 'informal_details', None) if not is_legal else None

    return [
        t.trader_id,
        t.get_trader_type_display(),
        t.get_status_display(),
        t.name,
        t.owner_full_name,
        t.phone_number,
        t.woreda.name if t.woreda else "",
        t.kebele.name if t.kebele else "",
        t.specific_location,
        legal.tin if legal else "",
        legal.trade_registration_number if legal else "",
        legal.get_business_sector_display() if legal else "",
        legal.get_trade_scale_display() if legal else "",
        legal.get_business_ownership_type_display() if legal else "",
        legal.issuing_institution if legal else "",
        str(legal.date_of_issuance) if legal and legal.date_of_issuance else "",
        legal.house_number_plot_id if legal else "",
        informal.national_id_resident_id if informal else "",
        legal.gender if legal else (informal.gender if informal else ""),
        str(legal.age) if legal else (str(informal.age) if informal else ""),
        informal.specific_location_market_area if informal else "",
        informal.get_nature_of_trade_activity_display() if informal else "",
        str(informal.estimated_capital_assets) if informal else "",
        informal.get_reason_for_operating_informally_display() if informal else "",
        informal.get_formalization_status_recommendation_display() if informal else "",
        informal.enumerator_data_collector_name if informal else "",
        str(informal.date_of_assessment) if informal and informal.date_of_assessment else "",
        t.created_at.strftime('%Y-%m-%d %H:%M') if t.created_at else "",
    ]


class DashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        total_traders = Trader.objects.count()
        legal_count = Trader.objects.filter(trader_type='LEGAL').count()
        informal_count = Trader.objects.filter(trader_type='INFORMAL').count()

        pending_count = Trader.objects.filter(status='SUBMITTED').count()
        under_review_count = Trader.objects.filter(status='UNDER_REVIEW').count()
        approved_count = Trader.objects.filter(status='APPROVED').count()
        returned_count = Trader.objects.filter(status__in=['NEEDS_CORRECTION', 'RETURNED']).count()
        rejected_count = Trader.objects.filter(status='REJECTED').count()

        # Breakdown by Woreda
        woredas = Woreda.objects.filter(is_active=True).order_by('name')
        distribution_by_woreda = []
        for w in woredas:
            w_total = Trader.objects.filter(woreda=w).count()
            w_legal = Trader.objects.filter(woreda=w, trader_type='LEGAL').count()
            w_informal = Trader.objects.filter(woreda=w, trader_type='INFORMAL').count()
            distribution_by_woreda.append({
                'woredaId': w.id,
                'woredaName': w.name,
                'woredaCode': w.code,
                'total': w_total,
                'legal': w_legal,
                'informal': w_informal,
            })

        # Breakdown by Sector (Legal)
        sector_counts = (
            LegalTrader.objects.values('business_sector')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        distribution_by_sector = [
            {'sector': item['business_sector'], 'count': item['count']}
            for item in sector_counts
        ]

        # Informal Capital Summary
        informal_agg = InformalTrader.objects.aggregate(
            totalCapital=Sum('estimated_capital_assets'),
            averageCapital=Avg('estimated_capital_assets'),
            count=Count('id')
        )
        informal_capital_summary = {
            'totalCapital': float(informal_agg['totalCapital'] or 0),
            'averageCapital': float(informal_agg['averageCapital'] or 0),
            'count': informal_agg['count'] or 0,
        }

        # Formalization breakdown
        formalization_counts = (
            FormalizationAssessment.objects.values('status')
            .annotate(count=Count('id'))
            .order_by('status')
        )
        formalization_summary = {item['status']: item['count'] for item in formalization_counts}

        return Response({
            'totalTraders': total_traders,
            'legalTradersCount': legal_count,
            'informalTradersCount': informal_count,
            'pendingVerificationCount': pending_count + under_review_count,
            'approvedTradersCount': approved_count,
            'returnedTradersCount': returned_count,
            'rejectedTradersCount': rejected_count,
            'distributionByWoreda': distribution_by_woreda,
            'distributionBySector': distribution_by_sector,
            'informalCapitalSummary': informal_capital_summary,
            'formalizationSummary': formalization_summary,
        })


class ExportCsvView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        lang = request.query_params.get('lang', 'en').lower()
        if lang not in COLUMNS_I18N:
            lang = 'en'

        trader_type = request.query_params.get('type')
        trader_status = request.query_params.get('status')
        woreda_id = request.query_params.get('woreda')

        queryset = Trader.objects.select_related(
            'woreda', 'kebele', 'legal_details', 'informal_details'
        ).all().order_by('trader_id')

        if trader_type:
            queryset = queryset.filter(trader_type=trader_type)
        if trader_status:
            queryset = queryset.filter(status=trader_status)
        if woreda_id:
            queryset = queryset.filter(woreda_id=woreda_id)

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="HR-TMIS_Traders_{lang}_{timezone.now().strftime("%Y%m%d_%H%M")}.csv"'

        # Prepend UTF-8 BOM for Excel compatibility with Ethiopic and Oromo diacritics
        response.write('\ufeff')

        writer = csv.writer(response)
        writer.writerow(COLUMNS_I18N[lang])

        for t in queryset:
            row = [sanitize_formula_injection(cell) for cell in get_trader_row(t)]
            writer.writerow(row)

        AuditLog.objects.create(
            action='EXPORT_CSV',
            details=f"Exported {queryset.count()} records to CSV in language {lang}",
            user=request.user.username,
        )

        return response


class ExportExcelView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        lang = request.query_params.get('lang', 'en').lower()
        if lang not in COLUMNS_I18N:
            lang = 'en'

        trader_type = request.query_params.get('type')
        trader_status = request.query_params.get('status')
        woreda_id = request.query_params.get('woreda')

        queryset = Trader.objects.select_related(
            'woreda', 'kebele', 'legal_details', 'informal_details'
        ).all().order_by('trader_id')

        if trader_type:
            queryset = queryset.filter(trader_type=trader_type)
        if trader_status:
            queryset = queryset.filter(status=trader_status)
        if woreda_id:
            queryset = queryset.filter(woreda_id=woreda_id)

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "HR-TMIS Traders"

        # Header styling
        headers = COLUMNS_I18N[lang]
        ws.append(headers)

        header_font = Font(name='Arial', size=11, bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')

        for col_num in range(1, len(headers) + 1):
            cell = ws.cell(row=1, column=col_num)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)

        for t in queryset:
            row = [sanitize_formula_injection(cell) for cell in get_trader_row(t)]
            ws.append(row)

        # Auto-adjust column width
        for col in ws.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = openpyxl.utils.get_column_letter(col[0].column)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 40)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = f'attachment; filename="HR-TMIS_Traders_{lang}_{timezone.now().strftime("%Y%m%d_%H%M")}.xlsx"'

        AuditLog.objects.create(
            action='EXPORT_EXCEL',
            details=f"Exported {queryset.count()} records to Excel in language {lang}",
            user=request.user.username,
        )

        return response


class CertificatePdfView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, trader_id):
        try:
            trader = Trader.objects.select_related(
                'woreda', 'kebele', 'legal_details', 'informal_details', 'verified_by'
            ).get(trader_id=trader_id)
        except Trader.DoesNotExist:
            return Response({'detail': 'Trader not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Enforce legal registration condition
        if trader.trader_type != 'LEGAL' or trader.status != 'APPROVED':
            return Response(
                {'detail': 'Official certificates are only generated for APPROVED legal traders.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        lang = request.query_params.get('lang', 'en').lower()
        legal = trader.legal_details

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CertTitle',
            parent=styles['Heading1'],
            fontName=PDF_FONT_BOLD,
            fontSize=16,
            leading=20,
            alignment=1, # Center
            textColor=colors.HexColor('#1E3A8A')
        )
        sub_style = ParagraphStyle(
            'CertSub',
            parent=styles['Normal'],
            fontName=PDF_FONT,
            fontSize=10,
            leading=14,
            alignment=1,
            textColor=colors.HexColor('#475569')
        )
        field_label_style = ParagraphStyle(
            'FieldLabel',
            parent=styles['Normal'],
            fontName=PDF_FONT_BOLD,
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#1E293B')
        )
        field_value_style = ParagraphStyle(
            'FieldValue',
            parent=styles['Normal'],
            fontName=PDF_FONT,
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#0F172A')
        )

        elements = []

        # Header Titles based on language
        if lang == 'am':
            hdr_reg = "የሐረሪ ሕዝብ ክልላዊ መንግሥት"
            hdr_bur = "የንግድ እና ኢንዱስትሪ ልማት ቢሮ"
            hdr_doc = "ይፋዊ የንግድ ምዝገባ ምስክር ወረቀት"
        elif lang == 'om':
            hdr_reg = "Mootummaa Naannoo Ummata Hararii"
            hdr_bur = "Biiroo Misooma Daldalaa fi Indaastirii"
            hdr_doc = "Waraqaa Ragaa Galmee Daldalaa Seera Qabeessaa"
        else:
            hdr_reg = "HARARI PEOPLE REGIONAL STATE"
            hdr_bur = "Trade & Industry Development Bureau"
            hdr_doc = "OFFICIAL TRADE REGISTRATION CERTIFICATE"

        elements.append(Paragraph(hdr_reg, title_style))
        elements.append(Paragraph(hdr_bur, sub_style))
        elements.append(Paragraph(f"<b>{hdr_doc}</b>", title_style))
        elements.append(Spacer(1, 15))

        # Certificate Meta info box
        meta_data = [
            [
                Paragraph("<b>Registration ID:</b>", field_label_style),
                Paragraph(trader.trader_id, field_value_style),
                Paragraph("<b>Date of Issuance:</b>", field_label_style),
                Paragraph(str(legal.date_of_issuance), field_value_style),
            ],
            [
                Paragraph("<b>TIN:</b>", field_label_style),
                Paragraph(legal.tin, field_value_style),
                Paragraph("<b>Reg. Number:</b>", field_label_style),
                Paragraph(legal.trade_registration_number, field_value_style),
            ],
            [
                Paragraph("<b>Business Name:</b>", field_label_style),
                Paragraph(trader.name, field_value_style),
                Paragraph("<b>Owner Full Name:</b>", field_label_style),
                Paragraph(trader.owner_full_name, field_value_style),
            ],
            [
                Paragraph("<b>Woreda:</b>", field_label_style),
                Paragraph(trader.woreda.name if trader.woreda else "", field_value_style),
                Paragraph("<b>Kebele:</b>", field_label_style),
                Paragraph(trader.kebele.name if trader.kebele else "", field_value_style),
            ],
            [
                Paragraph("<b>Sector:</b>", field_label_style),
                Paragraph(legal.get_business_sector_display(), field_value_style),
                Paragraph("<b>Scale & Type:</b>", field_label_style),
                Paragraph(f"{legal.get_trade_scale_display()} / {legal.get_business_ownership_type_display()}", field_value_style),
            ],
            [
                Paragraph("<b>Issuing Office:</b>", field_label_style),
                Paragraph(legal.issuing_institution, field_value_style),
                Paragraph("<b>Verification Officer:</b>", field_label_style),
                Paragraph(trader.verified_by.full_name if trader.verified_by else "Directorate of Trader Control", field_value_style),
            ],
        ]

        t_meta = Table(meta_data, colWidths=[120, 140, 120, 140])
        t_meta.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(t_meta)
        elements.append(Spacer(1, 25))

        # Signatures
        sig_data = [
            [
                Paragraph("__________________________<br/><b>Verified & Approved By</b><br/>Trade Registry Directorate", sub_style),
                Paragraph("__________________________<br/><b>Official Regional Seal</b><br/>Harari Trade Bureau", sub_style),
                Paragraph("__________________________<br/><b>Authorized Bureau Leader</b><br/>Executive Office", sub_style),
            ]
        ]
        t_sig = Table(sig_data, colWidths=[170, 170, 170])
        elements.append(t_sig)

        doc.build(elements)
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'inline; filename="Certificate_{trader.trader_id}.pdf"'

        AuditLog.objects.create(
            action='PRINT_CERTIFICATE',
            trader_id=trader.trader_id,
            details=f"Generated official certificate PDF in language {lang}",
            user=request.user.username,
        )

        return response
