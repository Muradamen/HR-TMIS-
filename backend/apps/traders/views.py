from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.paginator import Paginator
from django.core.exceptions import PermissionDenied, ValidationError
from django.http import JsonResponse, HttpResponse
from django.db.models import Q

from .models import Trader, LegalTrader, InformalTrader
from .forms import LegalTraderForm, InformalTraderForm
from .services import (
    generate_next_trader_code,
    execute_workflow_transition,
    export_traders_to_excel,
    export_trader_certificate_pdf,
)
from apps.locations.models import Woreda, Kebele
from apps.audit.services import log_audit

@login_required
def trader_list(request):
    queryset = Trader.objects.select_related(
        'registered_by', 'verified_by',
        'legal_details__woreda', 'legal_details__kebele',
        'informal_details__woreda', 'informal_details__kebele',
    ).all()

    query = request.GET.get('query', '').strip()
    trader_type = request.GET.get('type', 'ALL')
    status = request.GET.get('status', 'ALL')
    woreda_id = request.GET.get('woreda_id')
    kebele_id = request.GET.get('kebele_id')
    sector = request.GET.get('sector', 'ALL')

    if query:
        queryset = queryset.filter(
            Q(trader_code__icontains=query) |
            Q(legal_details__trade_name__icontains=query) |
            Q(legal_details__owner_full_name__icontains=query) |
            Q(legal_details__tin__icontains=query) |
            Q(legal_details__trade_license_number__icontains=query) |
            Q(informal_details__full_name__icontains=query) |
            Q(informal_details__phone_number__icontains=query)
        )

    if trader_type and trader_type != 'ALL':
        queryset = queryset.filter(trader_type=trader_type)

    if status and status != 'ALL':
        queryset = queryset.filter(status=status)

    if woreda_id:
        queryset = queryset.filter(
            Q(legal_details__woreda_id=woreda_id) |
            Q(informal_details__woreda_id=woreda_id)
        )

    if kebele_id:
        queryset = queryset.filter(
            Q(legal_details__kebele_id=kebele_id) |
            Q(informal_details__kebele_id=kebele_id)
        )

    if sector and sector != 'ALL':
        queryset = queryset.filter(
            Q(legal_details__business_sector=sector) |
            Q(informal_details__nature_of_trade_activity=sector)
        )

    # 25 records per page requirement
    paginator = Paginator(queryset, 25)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    # Clean query string for pagination links
    params = request.GET.copy()
    if 'page' in params:
        del params['page']
    pagination_query = params.urlencode()

    woredas = Woreda.objects.filter(is_active=True).order_by('name')

    context = {
        'title': 'Traders Registry',
        'traders': page_obj,
        'page_obj': page_obj,
        'total_count': paginator.count,
        'woredas': woredas,
        'filters': {
            'query': query,
            'type': trader_type,
            'status': status,
            'woreda_id': woreda_id,
            'kebele_id': kebele_id,
            'sector': sector,
        },
        'pagination_query': pagination_query,
        'query_string': request.GET.urlencode(),
    }
    return render(request, 'traders/list.html', context)


@login_required
def trader_detail(request, trader_code):
    trader = get_object_or_404(
        Trader.objects.select_related(
            'registered_by', 'reviewed_by', 'verified_by',
            'legal_details__woreda', 'legal_details__kebele',
            'informal_details__woreda', 'informal_details__kebele',
        ),
        trader_code=trader_code,
    )
    is_self_registered = trader.registered_by_id == request.user.id
    context = {
        'title': f'Trader Profile {trader.trader_code}',
        'trader': trader,
        'is_self_registered': is_self_registered,
    }
    return render(request, 'traders/detail.html', context)


@login_required
def trader_register_choice(request):
    if not (request.user.is_encoder or request.user.is_administrator):
        raise PermissionDenied('Only Data Encoders or Administrators can register traders.')

    if request.method == 'POST':
        trader_type = request.POST.get('trader_type')
        if trader_type == Trader.TraderType.LEGAL:
            return redirect('traders:register_legal')
        elif trader_type == Trader.TraderType.INFORMAL:
            return redirect('traders:register_informal')

    return render(request, 'traders/register_choice.html', {'title': 'Register Trader - Classification'})


@login_required
def trader_register_legal(request):
    if not (request.user.is_encoder or request.user.is_administrator):
        raise PermissionDenied('Only Data Encoders or Administrators can register traders.')

    if request.method == 'POST':
        form = LegalTraderForm(request.POST)
        if form.is_valid():
            submit_action = request.POST.get('submit_action', 'submit')
            is_draft = submit_action == 'draft'

            trader_code = generate_next_trader_code()
            status = Trader.Status.DRAFT if is_draft else Trader.Status.SUBMITTED

            trader = Trader.objects.create(
                trader_code=trader_code,
                trader_type=Trader.TraderType.LEGAL,
                status=status,
                registered_by=request.user,
            )

            legal_trader = form.save(commit=False)
            legal_trader.trader = trader
            if not legal_trader.data_entered_by:
                legal_trader.data_entered_by = request.user.get_full_name() or request.user.username
            legal_trader.save()

            log_audit(
                action='TRADER_DRAFT_CREATED' if is_draft else 'TRADER_SUBMITTED',
                target_id=trader.trader_code,
                request=request,
                user=request.user,
                details=f"Registered Legal Trader ({status}): {legal_trader.trade_name} (Owner: {legal_trader.owner_full_name})",
            )

            messages.success(
                request,
                f"Legal Trader {trader.trader_code} successfully {'saved as Draft' if is_draft else 'submitted for verification'}.",
            )
            return redirect('traders:detail', trader_code=trader.trader_code)
    else:
        form = LegalTraderForm(initial={
            'region': 'Harari Region',
            'data_entered_by': request.user.get_full_name() or request.user.username,
        })

    woredas = Woreda.objects.filter(is_active=True).order_by('name')
    return render(request, 'traders/register_legal.html', {
        'title': 'Register Legal Trader',
        'form': form,
        'woredas': woredas,
    })


@login_required
def trader_register_informal(request):
    if not (request.user.is_encoder or request.user.is_administrator):
        raise PermissionDenied('Only Data Encoders or Administrators can register traders.')

    if request.method == 'POST':
        form = InformalTraderForm(request.POST)
        if form.is_valid():
            submit_action = request.POST.get('submit_action', 'submit')
            is_draft = submit_action == 'draft'

            trader_code = generate_next_trader_code()
            status = Trader.Status.DRAFT if is_draft else Trader.Status.SUBMITTED

            trader = Trader.objects.create(
                trader_code=trader_code,
                trader_type=Trader.TraderType.INFORMAL,
                status=status,
                registered_by=request.user,
            )

            informal_trader = form.save(commit=False)
            informal_trader.trader = trader
            if not informal_trader.enumerator_data_collector_name:
                informal_trader.enumerator_data_collector_name = request.user.get_full_name() or request.user.username
            informal_trader.save()

            log_audit(
                action='TRADER_DRAFT_CREATED' if is_draft else 'TRADER_SUBMITTED',
                target_id=trader.trader_code,
                request=request,
                user=request.user,
                details=f"Registered Informal Trader ({status}): {informal_trader.full_name} ({informal_trader.specific_location_market_area})",
            )

            messages.success(
                request,
                f"Informal Trader {trader.trader_code} successfully {'saved as Draft' if is_draft else 'submitted for verification'}.",
            )
            return redirect('traders:detail', trader_code=trader.trader_code)
    else:
        form = InformalTraderForm(initial={
            'region': 'Harari Region',
            'enumerator_data_collector_name': request.user.get_full_name() or request.user.username,
        })

    woredas = Woreda.objects.filter(is_active=True).order_by('name')
    return render(request, 'traders/register_informal.html', {
        'title': 'Register Informal Trader',
        'form': form,
        'woredas': woredas,
    })


@login_required
def trader_workflow_transition(request, trader_code):
    if request.method != 'POST':
        return redirect('traders:detail', trader_code=trader_code)

    trader = get_object_or_404(Trader, trader_code=trader_code)
    target_status = request.POST.get('target_status')
    notes = request.POST.get('notes', '').strip()

    try:
        execute_workflow_transition(
            trader=trader,
            target_status=target_status,
            user=request.user,
            request=request,
            notes=notes,
        )
        messages.success(request, f"Workflow updated: Record status transitioned to {trader.get_status_display()}.")
    except PermissionDenied as e:
        messages.error(request, str(e))
    except ValidationError as e:
        messages.error(request, str(e))

    return redirect('traders:detail', trader_code=trader.trader_code)


@login_required
def export_excel_view(request):
    queryset = Trader.objects.all()

    query = request.GET.get('query', '').strip()
    trader_type = request.GET.get('type', 'ALL')
    status = request.GET.get('status', 'ALL')
    woreda_id = request.GET.get('woreda_id')
    kebele_id = request.GET.get('kebele_id')
    sector = request.GET.get('sector', 'ALL')

    if query:
        queryset = queryset.filter(
            Q(trader_code__icontains=query) |
            Q(legal_details__trade_name__icontains=query) |
            Q(legal_details__owner_full_name__icontains=query) |
            Q(legal_details__tin__icontains=query) |
            Q(informal_details__full_name__icontains=query)
        )
    if trader_type and trader_type != 'ALL':
        queryset = queryset.filter(trader_type=trader_type)
    if status and status != 'ALL':
        queryset = queryset.filter(status=status)
    if woreda_id:
        queryset = queryset.filter(
            Q(legal_details__woreda_id=woreda_id) |
            Q(informal_details__woreda_id=woreda_id)
        )
    if kebele_id:
        queryset = queryset.filter(
            Q(legal_details__kebele_id=kebele_id) |
            Q(informal_details__kebele_id=kebele_id)
        )
    if sector and sector != 'ALL':
        queryset = queryset.filter(
            Q(legal_details__business_sector=sector) |
            Q(informal_details__nature_of_trade_activity=sector)
        )

    log_audit(
        action='DATA_EXPORT_EXCEL',
        target_id='REGISTRY',
        request=request,
        user=request.user,
        details=f"Exported {queryset.count()} records to Excel (.xlsx)",
    )

    return export_traders_to_excel(queryset)


@login_required
def export_pdf_certificate_view(request, trader_code):
    trader = get_object_or_404(Trader, trader_code=trader_code)
    log_audit(
        action='DATA_EXPORT_PDF',
        target_id=trader.trader_code,
        request=request,
        user=request.user,
        details=f"Exported official PDF certificate for {trader.trader_code}",
    )
    return export_trader_certificate_pdf(trader)


@login_required
def api_kebeles(request):
    woreda_id = request.GET.get('woreda_id')
    if not woreda_id:
        return JsonResponse([], safe=False)
    kebeles = Kebele.objects.filter(woreda_id=woreda_id, is_active=True).values('id', 'name', 'code')
    return JsonResponse(list(kebeles), safe=False)
