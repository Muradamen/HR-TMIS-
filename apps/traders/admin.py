from django.contrib import admin

from .models import Trader, LegalTrader, InformalTrader


@admin.register(Trader)
class TraderAdmin(admin.ModelAdmin):
    list_display = (
        "trader_id",
        "trader_type",
        "status",
        "registered_by",
        "created_at",
    )

    list_filter = (
        "trader_type",
        "status",
    )

    search_fields = (
        "trader_id",
        "legal_details__trade_name",
        "legal_details__owner_full_name",
        "informal_details__full_name",
    )

    readonly_fields = (
        "trader_id",
        "created_at",
        "updated_at",
    )

    list_per_page = 25


@admin.register(LegalTrader)
class LegalTraderAdmin(admin.ModelAdmin):
    list_display = (
        "trader",
        "trade_name",
        "owner_full_name",
        "tin",
        "trade_registration_number",
        "woreda",
        "kebele",
    )

    list_filter = (
        "gender",
        "business_sector",
        "trade_scale",
        "business_ownership_type",
        "woreda",
    )

    search_fields = (
        "trader__trader_id",
        "trade_name",
        "owner_full_name",
        "tin",
        "trade_registration_number",
    )

    list_per_page = 25


@admin.register(InformalTrader)
class InformalTraderAdmin(admin.ModelAdmin):
    list_display = (
        "trader",
        "full_name",
        "gender",
        "phone_number",
        "woreda",
        "kebele",
        "date_of_assessment",
        "formalization_status_recommendation",
    )

    list_filter = (
        "gender",
        "nature_of_trade_activity",
        "reason_for_operating_informally",
        "formalization_status_recommendation",
        "woreda",
    )

    search_fields = (
        "trader__trader_id",
        "full_name",
        "national_id_resident_id",
        "phone_number",
    )

    list_per_page = 25
