from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages

from .models import User
from apps.traders.models import Trader
from apps.locations.models import Woreda
from apps.audit.services import log_audit

def login_view(request):
    if request.user.is_authenticated:
        return redirect('accounts:dashboard')

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user = authenticate(request, username=username, password=password)

        if user is not None:
            if user.is_active:
                login(request, user)
                log_audit('USER_LOGIN', 'SYSTEM', request=request, user=user, details=f"User logged in as {user.role}")
                next_url = request.POST.get('next') or request.GET.get('next')
                return redirect(next_url or 'accounts:dashboard')
            else:
                messages.error(request, 'This user account has been disabled.')
        else:
            messages.error(request, 'Invalid username or password. Please use the demo credentials below.')

    return render(request, 'registration/login.html', {'title': 'System Sign In'})


def logout_view(request):
    if request.user.is_authenticated:
        log_audit('USER_LOGOUT', 'SYSTEM', request=request, user=request.user, details="User logged out")
    logout(request)
    messages.info(request, 'You have been logged out successfully.')
    return redirect('accounts:login')


@login_required
def switch_user_view(request):
    target = request.GET.get('user', '')
    user = User.objects.filter(username=target).first()
    if user:
        login(request, user)
        messages.info(request, f"Switched active session to {user.get_role_display()} ({user.username}).")
    return redirect('accounts:dashboard')


@login_required
def dashboard_view(request):
    user = request.user
    traders = Trader.objects.select_related(
        'registered_by', 'verified_by',
        'legal_details__woreda', 'legal_details__kebele',
        'informal_details__woreda', 'informal_details__kebele',
    ).all()

    total_count = traders.count()
    legal_count = traders.filter(trader_type=Trader.TraderType.LEGAL).count()
    informal_count = traders.filter(trader_type=Trader.TraderType.INFORMAL).count()
    draft_count = traders.filter(status=Trader.Status.DRAFT).count()
    submitted_count = traders.filter(status=Trader.Status.SUBMITTED).count()
    under_review_count = traders.filter(status=Trader.Status.UNDER_REVIEW).count()
    approved_count = traders.filter(status=Trader.Status.APPROVED).count()
    needs_correction_count = traders.filter(status=Trader.Status.NEEDS_CORRECTION).count()
    rejected_count = traders.filter(status=Trader.Status.REJECTED).count()

    pending_review = traders.filter(
        status__in=[Trader.Status.SUBMITTED, Trader.Status.UNDER_REVIEW, Trader.Status.NEEDS_CORRECTION]
    )

    my_records = traders.filter(registered_by=user)[:8]

    woredas = Woreda.objects.filter(is_active=True).prefetch_related('kebeles').all()
    woreda_distribution = []
    for w in woredas:
        legal_c = Trader.objects.filter(legal_details__woreda=w).count()
        informal_c = Trader.objects.filter(informal_details__woreda=w).count()
        woreda_distribution.append({
            'name': w.name,
            'code': w.code,
            'kebeles_count': w.kebeles.count(),
            'traders_count': legal_c + informal_c,
        })

    context = {
        'title': 'Dashboard',
        'stats': {
            'total': total_count,
            'legal': legal_count,
            'informal': informal_count,
            'draft': draft_count,
            'submitted': submitted_count,
            'under_review': under_review_count,
            'approved': approved_count,
            'needs_correction': needs_correction_count,
            'rejected': rejected_count,
        },
        'pending_review_traders': pending_review[:8],
        'my_records': my_records,
        'recent_traders': traders[:8],
        'woreda_distribution': woreda_distribution,
    }
    return render(request, 'dashboard/dashboard.html', context)
