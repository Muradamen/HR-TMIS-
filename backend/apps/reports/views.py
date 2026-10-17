from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.db.models import Sum, Avg
from apps.traders.models import Trader, InformalTrader
from apps.locations.models import Woreda

@login_required
def reports_index(request):
    informal_qs = InformalTrader.objects.all()

    ready_for_tin = informal_qs.filter(
        formalization_status_recommendation=InformalTrader.FormalizationRecommendation.READY_FOR_TIN_MICRO_ENTERPRISE
    ).count()

    needs_awareness = informal_qs.filter(
        formalization_status_recommendation=InformalTrader.FormalizationRecommendation.NEEDS_AWARENESS_LEGAL_SUPPORT
    ).count()

    follow_up = informal_qs.filter(
        formalization_status_recommendation=InformalTrader.FormalizationRecommendation.FOLLOW_UP_REQUIRED
    ).count()

    total_capital = informal_qs.aggregate(total=Sum('estimated_capital_assets'))['total'] or 0
    avg_capital = informal_qs.aggregate(avg=Avg('estimated_capital_assets'))['avg'] or 0

    woredas = Woreda.objects.filter(is_active=True).prefetch_related('kebeles').all()
    woreda_stats = []
    for w in woredas:
        legal_count = Trader.objects.filter(legal_details__woreda=w).count()
        informal_count = Trader.objects.filter(informal_details__woreda=w).count()
        woreda_stats.append({
            'name': w.name,
            'code': w.code,
            'kebeles_count': w.kebeles.count(),
            'legal_count': legal_count,
            'informal_count': informal_count,
            'total_count': legal_count + informal_count,
        })

    context = {
        'title': 'Formalization Reports & Analytics',
        'recommendations': {
            'ready_for_tin': ready_for_tin,
            'needs_awareness': needs_awareness,
            'follow_up': follow_up,
        },
        'total_informal_capital': total_capital,
        'avg_informal_capital': avg_capital,
        'woreda_stats': woreda_stats,
    }
    return render(request, 'reports/index.html', context)
