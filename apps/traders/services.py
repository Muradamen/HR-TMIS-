import io
from datetime import datetime
from django.db import transaction
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import HttpResponse
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas
from reportlab.lib import colors

from django.utils import timezone
from .models import Trader
from apps.audit.services import log_audit

def generate_next_trader_code() -> str:
    year = datetime.now().year
    prefix = f'HT-{year}-'

    with transaction.atomic():
        # Select for update to prevent concurrent race condition
        last_trader = (
            Trader.objects.select_for_update()
            .filter(trader_code__startswith=prefix)
            .order_by('-trader_code')
            .first()
        )
        if last_trader:
            try:
                seq = int(last_trader.trader_code.split('-')[-1])
                next_seq = seq + 1
            except (ValueError, IndexError):
                next_seq = 1
        else:
            next_seq = 1

        return f'{prefix}{next_seq:06d}'


def execute_workflow_transition(
    trader: Trader,
    target_status: str,
    user,
    request=None,
    notes: str = '',
) -> bool:
    old_status = trader.status

    # 1. SELF-APPROVAL PREVENTION (CRITICAL SECURITY INVARIANT)
    if target_status == Trader.Status.APPROVED and trader.registered_by_id == user.id:
        raise PermissionDenied(
            'SELF-APPROVAL PROHIBITED: Directors and officers cannot approve records they registered or submitted themselves. An independent review is required.'
        )

    # 2. ROLE AUTHORIZATION CHECKS
    user_role = getattr(user, 'role', '')
    is_admin = user.is_superuser or user_role == 'ADMINISTRATOR'
    is_director = user_role == 'DIRECTOR_OF_TRADER_CONTROL'
    is_encoder = user_role == 'DATA_ENCODER'

    if target_status == Trader.Status.SUBMITTED:
        if not (is_encoder or is_admin):
            raise PermissionDenied('Only Data Encoders or Administrators can submit records for review.')

    if target_status in [
        Trader.Status.UNDER_REVIEW,
        Trader.Status.APPROVED,
        Trader.Status.NEEDS_CORRECTION,
        Trader.Status.REJECTED,
    ]:
        if not (is_director or is_admin):
            raise PermissionDenied(
                'Only the Director of Trader Control or Administrator can review, approve, reject, or request corrections.'
            )

    if target_status == Trader.Status.ARCHIVED:
        if not is_admin:
            raise PermissionDenied('Only Administrators can archive records.')

    # 3. ALLOWED STATE TRANSITION MATRIX
    allowed_transitions = {
        Trader.Status.DRAFT: [Trader.Status.SUBMITTED, Trader.Status.ARCHIVED],
        Trader.Status.SUBMITTED: [
            Trader.Status.UNDER_REVIEW,
            Trader.Status.NEEDS_CORRECTION,
            Trader.Status.REJECTED,
            Trader.Status.ARCHIVED,
        ],
        Trader.Status.UNDER_REVIEW: [
            Trader.Status.APPROVED,
            Trader.Status.NEEDS_CORRECTION,
            Trader.Status.REJECTED,
            Trader.Status.ARCHIVED,
        ],
        Trader.Status.NEEDS_CORRECTION: [Trader.Status.SUBMITTED, Trader.Status.ARCHIVED],
        Trader.Status.APPROVED: [Trader.Status.ARCHIVED],
        Trader.Status.REJECTED: [Trader.Status.ARCHIVED],
        Trader.Status.ARCHIVED: [],
    }

    if target_status not in allowed_transitions.get(old_status, []):
        raise ValidationError(f'Invalid state transition from {old_status} to {target_status}.')

    now = timezone.now()
    trader.status = target_status

    if target_status == Trader.Status.SUBMITTED:
        trader.submitted_at = now
    elif target_status == Trader.Status.UNDER_REVIEW:
        trader.reviewed_by = user
        trader.reviewed_at = now
    elif target_status == Trader.Status.APPROVED:
        trader.verified_by = user
        trader.verified_at = now
    elif target_status == Trader.Status.NEEDS_CORRECTION:
        trader.correction_notes = notes or 'Correction requested by Director of Trader Control.'
    elif target_status == Trader.Status.REJECTED:
        trader.rejection_reason = notes or 'Rejected by Director of Trader Control.'

    trader.save()

    log_audit(
        action=f'WORKFLOW_{target_status}',
        target_id=trader.trader_code,
        request=request,
        user=user,
        old_state=old_status,
        new_state=target_status,
        details=f'Transitioned from {old_status} to {target_status}. {notes}',
    )

    return True


def export_traders_to_excel(queryset) -> HttpResponse:
    wb = Workbook()
    ws = wb.active
    ws.title = 'Traders Registry'

    # Title Block
    ws.merge_cells('A1:M1')
    title = ws['A1']
    title.value = 'HARARI PEOPLE NATIONAL REGIONAL STATE — TRADERS REGISTRY (HT-TMIS)'
    title.font = Font(name='Calibri', size=14, bold=True, color='FFFFFF')
    title.fill = PatternFill(start_color='1B5E20', end_color='1B5E20', fill_type='solid')
    title.alignment = Alignment(horizontal='center', vertical='center')
    ws.row_dimensions[1].height = 30

    # Headers
    headers = [
        'Trader Code', 'Classification', 'Workflow Status', 'Trade / Full Name',
        'Owner Name', 'TIN', 'Trade License No', 'Woreda', 'Kebele',
        'Sector / Activity', 'Estimated Capital (ETB)', 'Registered By', 'Verified By',
    ]
    ws.append(headers)

    header_row = ws[2]
    ws.row_dimensions[2].height = 24
    header_fill = PatternFill(start_color='2E7D32', end_color='2E7D32', fill_type='solid')
    header_font = Font(name='Calibri', size=11, bold=True, color='FFFFFF')
    thin_border = Border(
        left=Side(style='thin', color='CCCCCC'),
        right=Side(style='thin', color='CCCCCC'),
        top=Side(style='thin', color='CCCCCC'),
        bottom=Side(style='thin', color='CCCCCC'),
    )

    for cell in header_row:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = thin_border

    # Data Rows
    for t in queryset.select_related('registered_by', 'verified_by', 'legal_details__woreda', 'legal_details__kebele', 'informal_details__woreda', 'informal_details__kebele'):
        is_legal = t.trader_type == Trader.TraderType.LEGAL
        leg = getattr(t, 'legal_details', None)
        inf = getattr(t, 'informal_details', None)

        name = leg.trade_name if is_legal and leg else (inf.full_name if inf else 'N/A')
        owner = leg.owner_full_name if is_legal and leg else (inf.full_name if inf else 'N/A')
        tin = leg.tin if is_legal and leg else 'N/A'
        lic = (leg.trade_license_number or leg.trade_registration_number) if is_legal and leg else 'N/A'
        woreda_name = t.woreda.name if t.woreda else 'N/A'
        kebele_name = t.kebele.name if t.kebele else 'N/A'
        sector = leg.get_business_sector_display() if is_legal and leg else (inf.get_nature_of_trade_activity_display() if inf else 'N/A')
        capital = f'{inf.estimated_capital_assets:,.2f}' if not is_legal and inf else 'N/A'
        reg_by = t.registered_by.username if t.registered_by else 'system'
        ver_by = t.verified_by.username if t.verified_by else 'Pending'

        ws.append([
            t.trader_code, t.get_trader_type_display(), t.get_status_display(),
            name, owner, tin, lic, woreda_name, kebele_name, sector, capital,
            reg_by, ver_by,
        ])

    # Column widths
    col_widths = {'A': 18, 'B': 16, 'C': 18, 'D': 32, 'E': 26, 'F': 16, 'G': 22, 'H': 16, 'I': 20, 'J': 26, 'K': 22, 'L': 16, 'M': 16}
    for col, width in col_widths.items():
        ws.column_dimensions[col].width = width

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"HT_TMIS_Traders_Export_{datetime.now():%Y-%m-%d}.xlsx"
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


def export_trader_certificate_pdf(trader: Trader) -> HttpResponse:
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Outer Border (Harari Green & Gold)
    p.setStrokeColor(colors.HexColor('#1B5E20'))
    p.setLineWidth(3)
    p.rect(25, 25, width - 50, height - 50)

    p.setStrokeColor(colors.HexColor('#C67D00'))
    p.setLineWidth(1)
    p.rect(30, 30, width - 60, height - 60)

    # Header Titles
    p.setFont('Helvetica-Bold', 16)
    p.setFillColor(colors.HexColor('#1B5E20'))
    p.drawCentredString(width / 2.0, height - 65, 'HARARI PEOPLE NATIONAL REGIONAL STATE')

    p.setFont('Helvetica-Bold', 12)
    p.setFillColor(colors.HexColor('#333333'))
    p.drawCentredString(width / 2.0, height - 85, 'TRADE & INDUSTRY DEVELOPMENT BUREAU')

    p.setFont('Helvetica', 10)
    p.setFillColor(colors.HexColor('#666666'))
    p.drawCentredString(width / 2.0, height - 100, 'Trader Management Information System (HT-TMIS)')

    # Banner Bar
    p.setFillColor(colors.HexColor('#1B5E20'))
    p.rect(40, height - 135, width - 80, 24, fill=1, stroke=0)

    p.setFont('Helvetica-Bold', 11)
    p.setFillColor(colors.white)
    p.drawCentredString(width / 2.0, height - 128, 'OFFICIAL REGISTRATION & VERIFICATION CERTIFICATE')

    # Trader Code & Status
    p.setFont('Helvetica-Bold', 12)
    p.setFillColor(colors.HexColor('#1B5E20'))
    p.drawCentredString(width / 2.0, height - 165, f'TRADER CODE: {trader.trader_code}')

    p.setFont('Helvetica', 10)
    p.setFillColor(colors.HexColor('#444444'))
    p.drawCentredString(
        width / 2.0,
        height - 180,
        f'Classification: {trader.get_trader_type_display()}   |   Status: {trader.get_status_display()}',
    )

    # Details Table
    start_y = height - 215
    line_height = 24
    cur_y = start_y

    is_legal = trader.trader_type == Trader.TraderType.LEGAL
    leg = getattr(trader, 'legal_details', None)
    inf = getattr(trader, 'informal_details', None)

    fields = []
    if is_legal and leg:
        fields = [
            ('Trade / Entity Name:', leg.trade_name),
            ('Owner Full Name:', leg.owner_full_name),
            ('TIN (Taxpayer ID):', leg.tin),
            ('Trade License Number:', leg.trade_license_number or 'N/A'),
            ('Registration Number:', leg.trade_registration_number),
            ('Business Sector:', leg.get_business_sector_display()),
            ('Trade Scale & Ownership:', f'{leg.get_trade_scale_display()} ({leg.get_business_ownership_type_display()})'),
            ('Woreda & Kebele:', f'{leg.woreda.name} / {leg.kebele.name}'),
            ('Issuing Authority:', leg.issuing_institution),
            ('Issuance Date:', f'{leg.date_of_issuance}'),
        ]
    elif inf:
        fields = [
            ('Full Name of Trader:', inf.full_name),
            ('National / Resident ID:', inf.national_id_resident_id or 'N/A'),
            ('Phone Number:', inf.phone_number),
            ('Woreda & Kebele:', f'{inf.woreda.name} / {inf.kebele.name}'),
            ('Market Location:', inf.specific_location_market_area),
            ('Nature of Activity:', inf.get_nature_of_trade_activity_display()),
            ('Estimated Capital Assets:', f'ETB {inf.estimated_capital_assets:,.2f}'),
            ('Driver for Informality:', inf.get_reason_for_operating_informally_display()),
            ('Formalization Pathway:', inf.get_formalization_status_recommendation_display()),
            ('Assessment Date:', f'{inf.date_of_assessment}'),
        ]

    for label, val in fields:
        p.setFont('Helvetica-Bold', 10)
        p.setFillColor(colors.HexColor('#1B5E20'))
        p.drawString(55, cur_y, label)

        p.setFont('Helvetica', 10)
        p.setFillColor(colors.HexColor('#222222'))
        p.drawString(220, cur_y, str(val))
        cur_y -= line_height

    # Verification Attestation
    attest_y = cur_y - 20
    p.setFont('Helvetica-Bold', 10)
    p.setFillColor(colors.HexColor('#1B5E20'))
    p.drawString(55, attest_y, 'VERIFICATION AND REGULATORY ATTESTATION')

    p.setFont('Helvetica', 9)
    p.setFillColor(colors.HexColor('#555555'))
    ver_text = (
        f"Record submitted by {trader.registered_by.username} on {trader.created_at:%Y-%m-%d}. "
        f"Verified by Director of Trader Control: {trader.verified_by.username if trader.verified_by else 'Pending Verification'}. "
        f"Verification Date: {trader.verified_at.strftime('%Y-%m-%d') if trader.verified_at else 'N/A'}."
    )
    p.drawString(55, attest_y - 18, ver_text)

    # Signatures
    sign_y = attest_y - 70
    p.setStrokeColor(colors.HexColor('#888888'))
    p.setLineWidth(1)
    p.line(70, sign_y, 220, sign_y)
    p.line(360, sign_y, 510, sign_y)

    p.setFont('Helvetica', 9)
    p.setFillColor(colors.HexColor('#333333'))
    p.drawString(70, sign_y - 14, 'Data Encoder Signature')
    p.drawString(360, sign_y - 14, 'Director of Trader Control Seal')

    p.showPage()
    p.save()

    buffer.seek(0)
    filename = f"HT_Certificate_{trader.trader_code}.pdf"
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response
