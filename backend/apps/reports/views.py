import io
import csv
from decimal import Decimal
from django.http import HttpResponse
from django.db.models import Count, Sum, Avg, Q
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.traders.models import Trader, LegalTrader, InformalTrader
from apps.formalization.models import FormalizationAssessment
from apps.locations.models import Woreda, Kebele, Region
from apps.audit.models import AuditLog
from apps.core.permissions import IsReportExporter

# Import openpyxl for Excel export
import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter

# Import ReportLab for PDF generation
from reportlab.lib.pagesizes import letter, A4, landscape
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# Register Unicode Ethiopic / Latin font
try:
    pdfmetrics.registerFont(TTFont('FreeSerif', '/usr/share/fonts/truetype/freefont/FreeSerif.ttf'))
    pdfmetrics.registerFont(TTFont('FreeSerifBold', '/usr/share/fonts/truetype/freefont/FreeSerifBold.ttf'))
    pdfmetrics.registerFont(TTFont('FreeSerifItalic', '/usr/share/fonts/truetype/freefont/FreeSerifItalic.ttf'))
    PDF_FONT = 'FreeSerif'
    PDF_FONT_BOLD = 'FreeSerifBold'
    PDF_FONT_ITALIC = 'FreeSerifItalic'
except Exception:
    PDF_FONT = 'Helvetica'
    PDF_FONT_BOLD = 'Helvetica-Bold'
    PDF_FONT_ITALIC = 'Helvetica-Oblique'


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute total pages and draw footer with page numbers
    and official agency confidentiality notice on landscape A4 pages.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont(PDF_FONT, 8)
        self.setFillColor(colors.HexColor('#64748B'))
        
        # Dimensions for landscape A4 (approx 841.89 x 595.28)
        width, _ = landscape(A4)
        
        # Bottom rule
        self.setStrokeColor(colors.HexColor('#CBD5E1'))
        self.setLineWidth(0.5)
        self.line(36, 26, width - 36, 26)

        # Footer text
        disclaimer = "Harari People Regional State Trade & Industry Development Agency — Official Trader Management Information System (HT-TMIS)"
        page_str = f"Page {self._pageNumber} of {page_count}"
        
        self.drawString(36, 15, disclaimer)
        self.drawRightString(width - 36, 15, page_str)
        self.restoreState()


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
    """
    Prevents spreadsheet formula injection in CSV and Excel exports.
    Prepends single quote if cell starts with dangerous symbols (=, +, -, @, tab, CR).
    """
    if val is None:
        return ""
    s = str(val).strip()
    if s and (s[0] in ['=', '+', '-', '@'] or s.startswith('\t') or s.startswith('\r')):
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


def get_filtered_traders_queryset(request):
    """
    Retrieves and filters Trader records.
    Supports either explicit 'ids' (for selected records export)
    or combined query/filter parameters (for filtered export).
    Enforces security: only authorized authenticated users can access.
    """
    queryset = Trader.objects.select_related(
        'woreda', 'woreda__region', 'kebele', 'created_by', 'verified_by', 'assigned_director',
        'legal_details', 'informal_details'
    ).all().order_by('trader_id')

    data = request.data if request.method == 'POST' and isinstance(request.data, dict) else {}
    params = request.query_params

    # Check for explicit IDs parameter
    ids_param = None
    if 'ids' in data:
        ids_param = data.get('ids')
    elif 'ids' in params:
        raw = params.get('ids', '')
        ids_param = [i.strip() for i in raw.split(',') if i.strip()]

    # If explicit scope is 'selected'
    scope_param = data.get('scope') or params.get('scope')

    if ids_param is not None or scope_param == 'selected':
        if isinstance(ids_param, list):
            ids_clean = [str(i).strip() for i in ids_param if str(i).strip()]
        elif isinstance(ids_param, str):
            ids_clean = [i.strip() for i in ids_param.split(',') if i.strip()]
        else:
            ids_clean = []

        if not ids_clean:
            return queryset.none(), True, 0, ["Selected Records: 0"]

        selected_qs = queryset.filter(trader_id__in=ids_clean)
        count = selected_qs.count()
        return selected_qs, True, count, [f"Selected Records: {count}"]

    # Otherwise, apply query/filter parameters
    filters_applied = []

    # Search Query (name, ID, TIN, phone number)
    search_q = (data.get('search') or params.get('search') or params.get('q') or '').strip()
    if search_q:
        queryset = queryset.filter(
            Q(trader_id__icontains=search_q) |
            Q(name__icontains=search_q) |
            Q(owner_full_name__icontains=search_q) |
            Q(phone_number__icontains=search_q) |
            Q(legal_details__tin__icontains=search_q) |
            Q(legal_details__trade_registration_number__icontains=search_q) |
            Q(informal_details__national_id_resident_id__icontains=search_q)
        )
        filters_applied.append(f"Search: '{search_q}'")

    # Trader Type
    t_type = data.get('type') or params.get('type') or data.get('trader_type') or params.get('trader_type')
    if t_type and t_type != 'ALL':
        queryset = queryset.filter(trader_type=t_type)
        filters_applied.append(f"Type: {t_type}")

    # Registration Status
    status_val = data.get('status') or params.get('status')
    if status_val and status_val != 'ALL':
        if status_val == 'PENDING':
            queryset = queryset.filter(status__in=['PENDING', 'SUBMITTED', 'UNDER_REVIEW'])
        elif status_val == 'RETURNED':
            queryset = queryset.filter(status__in=['RETURNED', 'NEEDS_CORRECTION'])
        else:
            queryset = queryset.filter(status=status_val)
        filters_applied.append(f"Status: {status_val}")

    # Region
    region_val = data.get('region') or params.get('region')
    if region_val and region_val != 'ALL':
        if str(region_val).isdigit():
            queryset = queryset.filter(woreda__region_id=int(region_val))
        else:
            queryset = queryset.filter(woreda__region__name__icontains=str(region_val))
        filters_applied.append(f"Region: {region_val}")

    # Woreda
    woreda_val = data.get('woreda') or params.get('woreda')
    if woreda_val and woreda_val != 'ALL':
        if str(woreda_val).isdigit():
            queryset = queryset.filter(woreda_id=int(woreda_val))
        else:
            queryset = queryset.filter(woreda__name__icontains=str(woreda_val))
        filters_applied.append(f"Woreda: {woreda_val}")

    # Kebele
    kebele_val = data.get('kebele') or params.get('kebele')
    if kebele_val and kebele_val != 'ALL':
        if str(kebele_val).isdigit():
            queryset = queryset.filter(kebele_id=int(kebele_val))
        else:
            queryset = queryset.filter(kebele__name__icontains=str(kebele_val))
        filters_applied.append(f"Kebele: {kebele_val}")

    # Business Sector (Legal)
    sector_val = data.get('sector') or params.get('sector') or data.get('business_sector') or params.get('business_sector')
    if sector_val and sector_val != 'ALL':
        queryset = queryset.filter(legal_details__business_sector=sector_val)
        filters_applied.append(f"Sector: {sector_val}")

    # Reviewer
    reviewer_val = data.get('reviewer') or params.get('reviewer')
    if reviewer_val and reviewer_val != 'ALL':
        queryset = queryset.filter(
            Q(verified_by__username__icontains=reviewer_val) |
            Q(verified_by__full_name__icontains=reviewer_val) |
            Q(assigned_director__username__icontains=reviewer_val) |
            Q(assigned_director__full_name__icontains=reviewer_val)
        )
        filters_applied.append(f"Reviewer: {reviewer_val}")

    count = queryset.count()
    if not filters_applied:
        filters_applied.append("All Records (No active filters)")

    return queryset, False, count, filters_applied


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
    """
    Exports Trader records to CSV.
    Supports both GET (with query parameters) and POST (with JSON payload).
    Enforces formula injection protection and prepends UTF-8 BOM.
    """
    permission_classes = [IsReportExporter]

    def _export(self, request):
        data = request.data if request.method == 'POST' and isinstance(request.data, dict) else {}
        lang = (data.get('lang') or request.query_params.get('lang', 'en')).lower()
        if lang not in COLUMNS_I18N:
            lang = 'en'

        queryset, is_selected, count, filters_applied = get_filtered_traders_queryset(request)

        if count == 0:
            error_msg = 'No trader records selected for export.' if is_selected else 'No trader records match the selected filter criteria.'
            return Response({'detail': error_msg, 'code': 'NO_RECORDS_FOR_EXPORT'}, status=status.HTTP_400_BAD_REQUEST)

        response = HttpResponse(content_type='text/csv; charset=utf-8')
        scope_str = 'Selected' if is_selected else 'Filtered'
        response['Content-Disposition'] = f'attachment; filename="HR-TMIS_Traders_{scope_str}_{lang}_{timezone.now().strftime("%Y%m%d_%H%M")}.csv"'

        # Prepend UTF-8 BOM
        response.write('\ufeff')

        writer = csv.writer(response)
        writer.writerow(COLUMNS_I18N[lang])

        for t in queryset:
            row = [sanitize_formula_injection(cell) for cell in get_trader_row(t)]
            writer.writerow(row)

        AuditLog.objects.create(
            action='EXPORT_CSV',
            details=f"Exported {count} records to CSV in language {lang} (Scope: {scope_str})",
            user=request.user.username,
        )

        return response

    def get(self, request):
        return self._export(request)

    def post(self, request):
        return self._export(request)


@method_decorator(csrf_exempt, name='dispatch')
class ExportExcelView(APIView):
    """
    Exports Trader records to formatted Microsoft Excel (.xlsx) workbook using openpyxl.
    Includes official agency title, report metadata, active filters summary,
    styled header row (dark navy #1E3A8A, bold white text), data borders,
    and protection against spreadsheet formula injection.
    """
    authentication_classes = [CsrfExemptSessionAuthentication, BasicAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _export(self, request):
        data = request.data if request.method == 'POST' and isinstance(request.data, dict) else {}
        lang = (data.get('lang') or request.query_params.get('lang', 'en')).lower()
        if lang not in COLUMNS_I18N:
            lang = 'en'

        queryset, is_selected, count, filters_applied = get_filtered_traders_queryset(request)

        if count == 0:
            error_msg = 'No trader records selected for export.' if is_selected else 'No trader records match the selected filter criteria.'
            return Response({'detail': error_msg, 'code': 'NO_RECORDS_FOR_EXPORT'}, status=status.HTTP_400_BAD_REQUEST)

        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "HT-TMIS Traders"

        # Agency Header Block
        title_font = Font(name='Arial', size=14, bold=True, color='1E3A8A')
        subtitle_font = Font(name='Arial', size=11, bold=True, color='334155')
        meta_font = Font(name='Arial', size=9, italic=True, color='475569')

        if lang == 'am':
            ws.cell(row=1, column=1, value="የሐረሪ ሕዝብ ክልላዊ መንግሥት — የንግድ እና ኢንዱስትሪ ልማት ኤጀንሲ").font = title_font
            ws.cell(row=2, column=1, value="ይፋዊ የነጋዴዎች ምዝገባ ሪፖርት (Trader Registry)").font = subtitle_font
        elif lang == 'om':
            ws.cell(row=1, column=1, value="MOOTUMMAA NAANNOO UMMATA HARARII — BIIROO MISOOMA DALDALAA FI INDAASTIRII").font = title_font
            ws.cell(row=2, column=1, value="GABAASA GALMEE DALDALTOOTAA (Trader Registry Report)").font = subtitle_font
        else:
            ws.cell(row=1, column=1, value="HARARI PEOPLE REGIONAL STATE — TRADE & INDUSTRY DEVELOPMENT AGENCY").font = title_font
            ws.cell(row=2, column=1, value="OFFICIAL TRADER REGISTRY REPORT").font = subtitle_font

        scope_str = f"Selected Records ({count} traders)" if is_selected else f"Filtered Results ({count} traders)"
        filter_str = " | ".join(filters_applied)
        ws.cell(row=3, column=1, value=f"Scope: {scope_str} | Date: {timezone.now().strftime('%Y-%m-%d %H:%M')} | Officer: {request.user.full_name or request.user.username} | Filters: {filter_str}").font = meta_font

        # Row 4 is blank separator
        # Row 5: Column Headers
        headers = COLUMNS_I18N[lang]
        header_row_num = 5

        header_font = Font(name='Arial', size=10, bold=True, color='FFFFFF')
        header_fill = PatternFill(start_color='1E3A8A', end_color='1E3A8A', fill_type='solid')
        header_border = Border(
            left=Side(style='thin', color='94A3B8'),
            right=Side(style='thin', color='94A3B8'),
            top=Side(style='thin', color='94A3B8'),
            bottom=Side(style='medium', color='0F172A')
        )

        for col_idx, header_text in enumerate(headers, start=1):
            cell = ws.cell(row=header_row_num, column=col_idx, value=header_text)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
            cell.border = header_border

        # Data Rows
        thin_border = Border(
            left=Side(style='thin', color='E2E8F0'),
            right=Side(style='thin', color='E2E8F0'),
            top=Side(style='thin', color='E2E8F0'),
            bottom=Side(style='thin', color='E2E8F0')
        )
        row_alt_fill = PatternFill(start_color='F8FAFC', end_color='F8FAFC', fill_type='solid')
        row_white_fill = PatternFill(start_color='FFFFFF', end_color='FFFFFF', fill_type='solid')
        data_font = Font(name='Arial', size=9)

        current_row = header_row_num + 1
        for idx, t in enumerate(queryset):
            row_data = [sanitize_formula_injection(val) for val in get_trader_row(t)]
            fill_to_use = row_alt_fill if idx % 2 == 1 else row_white_fill

            for col_idx, val in enumerate(row_data, start=1):
                cell = ws.cell(row=current_row, column=col_idx, value=val)
                cell.font = data_font
                cell.fill = fill_to_use
                cell.border = thin_border
                cell.alignment = Alignment(vertical='center')

            current_row += 1

        # Auto-adjust column widths
        for col in ws.columns:
            col_letter = get_column_letter(col[0].column)
            max_len = 0
            for cell in col:
                if cell.row < header_row_num:
                    continue
                val_str = str(cell.value or '')
                if len(val_str) > max_len:
                    max_len = len(val_str)
            ws.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 40)

        # Freeze header panes
        ws.freeze_panes = ws['A6']

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)

        response = HttpResponse(
            output.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        scope_filename = 'Selected' if is_selected else 'Filtered'
        response['Content-Disposition'] = f'attachment; filename="HT-TMIS_Traders_{scope_filename}_{lang}_{timezone.now().strftime("%Y%m%d_%H%M")}.xlsx"'

        AuditLog.objects.create(
            action='EXPORT_EXCEL',
            details=f"Exported {count} records to Excel in language {lang} (Scope: {scope_filename})",
            user=request.user.username,
        )

        return response

    def get(self, request):
        return self._export(request)

    def post(self, request):
        return self._export(request)


@method_decorator(csrf_exempt, name='dispatch')
class ExportPdfView(APIView):
    """
    Exports Trader records to a structured PDF report using ReportLab.
    Includes official agency heading, report title, generation date, active filters,
    record count, professionally formatted table with Ethiopic and Latin character support,
    and running page numbers ("Page X of Y") via NumberedCanvas.
    """
    authentication_classes = [CsrfExemptSessionAuthentication, BasicAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def _export(self, request):
        data = request.data if request.method == 'POST' and isinstance(request.data, dict) else {}
        lang = (data.get('lang') or request.query_params.get('lang', 'en')).lower()
        if lang not in ['en', 'om', 'am']:
            lang = 'en'

        queryset, is_selected, count, filters_applied = get_filtered_traders_queryset(request)

        if count == 0:
            error_msg = 'No trader records selected for export.' if is_selected else 'No trader records match the selected filter criteria.'
            return Response({'detail': error_msg, 'code': 'NO_RECORDS_FOR_EXPORT'}, status=status.HTTP_400_BAD_REQUEST)

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=42
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            'PdfTitle',
            parent=styles['Heading1'],
            fontName=PDF_FONT_BOLD,
            fontSize=13,
            leading=16,
            alignment=1, # Center
            textColor=colors.HexColor('#1E3A8A')
        )
        sub_style = ParagraphStyle(
            'PdfSub',
            parent=styles['Normal'],
            fontName=PDF_FONT,
            fontSize=9,
            leading=12,
            alignment=1,
            textColor=colors.HexColor('#475569')
        )
        meta_label_style = ParagraphStyle(
            'MetaLabel',
            parent=styles['Normal'],
            fontName=PDF_FONT_BOLD,
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#1E293B')
        )
        meta_val_style = ParagraphStyle(
            'MetaVal',
            parent=styles['Normal'],
            fontName=PDF_FONT,
            fontSize=8,
            leading=10,
            textColor=colors.HexColor('#334155')
        )
        th_style = ParagraphStyle(
            'ThStyle',
            parent=styles['Normal'],
            fontName=PDF_FONT_BOLD,
            fontSize=8,
            leading=10,
            alignment=1,
            textColor=colors.white
        )
        td_style = ParagraphStyle(
            'TdStyle',
            parent=styles['Normal'],
            fontName=PDF_FONT,
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor('#0F172A')
        )
        td_bold_style = ParagraphStyle(
            'TdBoldStyle',
            parent=styles['Normal'],
            fontName=PDF_FONT_BOLD,
            fontSize=7.5,
            leading=9.5,
            textColor=colors.HexColor('#0F172A')
        )

        elements = []

        # Header Titles based on language
        if lang == 'am':
            hdr_agency = "የሐረሪ ሕዝብ ክልላዊ መንግሥት — የንግድ እና ኢንዱስትሪ ልማት ኤጀንሲ"
            hdr_doc = "ይፋዊ የነጋዴዎች ምዝገባ ሪፖርት (Trader Registry Report)"
            th_num = "ተ.ቁ"
            th_id = "መለያ ቁጥር"
            th_name = "የንግድ ስም"
            th_owner = "የባለቤት ስም"
            th_type = "ዓይነት"
            th_status = "ሁኔታ"
            th_location = "ወረዳ / ቀበሌ"
            th_tin = "TIN / መታወቂያ"
            th_phone = "ስልክ ቁጥር"
        elif lang == 'om':
            hdr_agency = "MOOTUMMAA NAANNOO UMMATA HARARII — BIIROO MISOOMA DALDALAA FI INDAASTIRII"
            hdr_doc = "GABAASA GALMEE DALDALTOOTAA SEERA QABEESSAA (Trader Registry)"
            th_num = "Lakk"
            th_id = "Lakk Daldalaa"
            th_name = "Maqaa Daldalaa"
            th_owner = "Abbaa Qabeenyaa"
            th_type = "Gosa"
            th_status = "Haala"
            th_location = "Aanaa / Ganda"
            th_tin = "TIN / Eenyummaa"
            th_phone = "Lakk Bilbilaa"
        else:
            hdr_agency = "HARARI PEOPLE REGIONAL STATE — TRADE & INDUSTRY DEVELOPMENT AGENCY"
            hdr_doc = "OFFICIAL TRADER REGISTRY REPORT"
            th_num = "#"
            th_id = "Trader ID"
            th_name = "Business / Trade Name"
            th_owner = "Owner Full Name"
            th_type = "Type"
            th_status = "Status"
            th_location = "Woreda / Kebele"
            th_tin = "TIN / ID Number"
            th_phone = "Phone Number"

        elements.append(Paragraph(hdr_agency, title_style))
        elements.append(Paragraph(f"<b>{hdr_doc}</b>", sub_style))
        elements.append(Spacer(1, 8))

        # Metadata Box (Scope, Date, Officer, Active Filters)
        scope_title = f"Selected Records ({count} traders)" if is_selected else f"Filtered Results ({count} traders)"
        filter_summary_text = " • ".join(filters_applied)

        meta_rows = [
            [
                Paragraph("<b>Export Scope:</b>", meta_label_style),
                Paragraph(scope_title, meta_val_style),
                Paragraph("<b>Generated On:</b>", meta_label_style),
                Paragraph(timezone.now().strftime("%Y-%m-%d %H:%M:%S (Addis Ababa)"), meta_val_style),
            ],
            [
                Paragraph("<b>Generated By:</b>", meta_label_style),
                Paragraph(f"{request.user.full_name or request.user.username} ({request.user.role})", meta_val_style),
                Paragraph("<b>Active Filters:</b>", meta_label_style),
                Paragraph(filter_summary_text, meta_val_style),
            ]
        ]
        meta_table = Table(meta_rows, colWidths=[90, 295, 90, 295])
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
            ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor('#CBD5E1')),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(meta_table)
        elements.append(Spacer(1, 10))

        # Data Table
        # Columns: # (25), ID (70), Name (150), Owner (115), Type (55), Status (65), Location (120), TIN/ID (85), Phone (85)
        # Total = 25 + 70 + 150 + 115 + 55 + 65 + 120 + 85 + 85 = 770 pt (fits within 842 - 72 = 770 pt)
        col_widths = [25, 70, 150, 115, 55, 65, 120, 85, 85]

        table_data = [
            [
                Paragraph(th_num, th_style),
                Paragraph(th_id, th_style),
                Paragraph(th_name, th_style),
                Paragraph(th_owner, th_style),
                Paragraph(th_type, th_style),
                Paragraph(th_status, th_style),
                Paragraph(th_location, th_style),
                Paragraph(th_tin, th_style),
                Paragraph(th_phone, th_style),
            ]
        ]

        for idx, t in enumerate(queryset, start=1):
            is_legal = t.trader_type == 'LEGAL'
            legal = getattr(t, 'legal_details', None) if is_legal else None
            informal = getattr(t, 'informal_details', None) if not is_legal else None

            woreda_name = t.woreda.name if t.woreda else "-"
            kebele_name = t.kebele.name if t.kebele else ""
            location_str = f"{woreda_name}<br/><font color='#64748B'>{kebele_name}</font>"

            tin_or_id = (legal.tin if legal and legal.tin else "") or (informal.national_id_resident_id if informal and informal.national_id_resident_id else "-")
            phone_str = t.phone_number or "-"

            # Status pill styling in table
            status_display = t.get_status_display()
            type_display = t.get_trader_type_display()

            table_data.append([
                Paragraph(str(idx), td_style),
                Paragraph(f"<b>{t.trader_id}</b>", td_bold_style),
                Paragraph(t.name or "-", td_bold_style),
                Paragraph(t.owner_full_name or "-", td_style),
                Paragraph(type_display, td_style),
                Paragraph(status_display, td_style),
                Paragraph(location_str, td_style),
                Paragraph(tin_or_id, td_style),
                Paragraph(phone_str, td_style),
            ])

        main_table = Table(table_data, colWidths=col_widths, repeatRows=1)
        main_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E3A8A')),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ]))
        elements.append(main_table)

        doc.build(elements, canvasmaker=NumberedCanvas)
        buffer.seek(0)

        response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
        scope_filename = 'Selected' if is_selected else 'Filtered'
        response['Content-Disposition'] = f'attachment; filename="HT-TMIS_Traders_{scope_filename}_{lang}_{timezone.now().strftime("%Y%m%d_%H%M")}.pdf"'

        AuditLog.objects.create(
            action='EXPORT_PDF',
            details=f"Exported {count} records to PDF in language {lang} (Scope: {scope_filename})",
            user=request.user.username,
        )

        return response

    def get(self, request):
        return self._export(request)

    def post(self, request):
        return self._export(request)


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
                Paragraph(str(legal.date_of_issuance) if legal and legal.date_of_issuance else "-", field_value_style),
            ],
            [
                Paragraph("<b>TIN:</b>", field_label_style),
                Paragraph(legal.tin if legal else "-", field_value_style),
                Paragraph("<b>Reg. Number:</b>", field_label_style),
                Paragraph(legal.trade_registration_number if legal else "-", field_value_style),
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
                Paragraph(legal.get_business_sector_display() if legal else "-", field_value_style),
                Paragraph("<b>Scale & Type:</b>", field_label_style),
                Paragraph(f"{legal.get_trade_scale_display()} / {legal.get_business_ownership_type_display()}" if legal else "-", field_value_style),
            ],
            [
                Paragraph("<b>Issuing Office:</b>", field_label_style),
                Paragraph(legal.issuing_institution if legal else "-", field_value_style),
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
