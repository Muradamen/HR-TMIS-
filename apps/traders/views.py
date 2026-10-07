from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db import transaction
from django.shortcuts import redirect, render

from .forms import TraderForm, LegalTraderForm, InformalTraderForm
from .models import Trader


@login_required
def register_trader(request):
    if request.method == "POST":
        trader_form = TraderForm(request.POST)

        if trader_form.is_valid():
            trader_type = trader_form.cleaned_data["trader_type"]

            if trader_type == Trader.TraderType.LEGAL:
                return redirect("traders:register_legal")

            if trader_type == Trader.TraderType.INFORMAL:
                return redirect("traders:register_informal")

    else:
        trader_form = TraderForm()

    return render(
        request,
        "traders/register.html",
        {
            "trader_form": trader_form,
        },
    )


@login_required
@transaction.atomic
def register_legal(request):
    if request.method == "POST":
        form = LegalTraderForm(request.POST)

        if form.is_valid():
            trader = Trader.objects.create(
                trader_type=Trader.TraderType.LEGAL,
                status=Trader.Status.PENDING,
                registered_by=request.user,
            )

            legal_trader = form.save(commit=False)
            legal_trader.trader = trader

            if not legal_trader.data_entered_by:
                legal_trader.data_entered_by = (
                    request.user.get_full_name() or request.user.username
                )

            legal_trader.save()

            messages.success(
                request,
                f"Legal Trader {trader.trader_id} registered successfully.",
            )

            return redirect("traders:detail", trader_id=trader.trader_id)

    else:
        form = LegalTraderForm(
            initial={
                "region": "Harari Region",
                "data_entered_by": (
                    request.user.get_full_name() or request.user.username
                ),
            }
        )

    return render(
        request,
        "traders/register_legal.html",
        {
            "form": form,
            "trader_type": "Legal Trader",
        },
    )


@login_required
@transaction.atomic
def register_informal(request):
    if request.method == "POST":
        form = InformalTraderForm(request.POST)

        if form.is_valid():
            trader = Trader.objects.create(
                trader_type=Trader.TraderType.INFORMAL,
                status=Trader.Status.PENDING,
                registered_by=request.user,
            )

            informal_trader = form.save(commit=False)
            informal_trader.trader = trader

            if not informal_trader.enumerator_data_collector_name:
                informal_trader.enumerator_data_collector_name = (
                    request.user.get_full_name() or request.user.username
                )

            informal_trader.save()

            messages.success(
                request,
                f"Informal Trader {trader.trader_id} registered successfully.",
            )

            return redirect("traders:detail", trader_id=trader.trader_id)

    else:
        form = InformalTraderForm(
            initial={
                "region": "Harari Region",
                "enumerator_data_collector_name": (
                    request.user.get_full_name() or request.user.username
                ),
            }
        )

    return render(
        request,
        "traders/register_informal.html",
        {
            "form": form,
            "trader_type": "Informal Trader",
        },
    )


@login_required
def trader_detail(request, trader_id):
    trader = Trader.objects.select_related(
        "registered_by",
    ).get(
        trader_id=trader_id,
    )

    return render(
        request,
        "traders/detail.html",
        {
            "trader": trader,
        },
    )
