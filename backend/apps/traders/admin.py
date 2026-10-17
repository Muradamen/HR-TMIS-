from django.contrib import admin
from .models import Trader, LegalTrader, InformalTrader

class LegalTraderInline(admin.StackedInline):
    model = LegalTrader
    extra = 0

class InformalTraderInline(admin.StackedInline):
    model = InformalTrader
    extra = 0

@admin.register(Trader)
class TraderAdmin(admin.ModelAdmin):
    list_display = ('trader_code', 'trader_type', 'status', 'registered_by', 'verified_by', 'created_at')
    list_filter = ('trader_type', 'status', 'created_at')
    search_fields = ('trader_code', 'registered_by__username', 'legal_details__trade_name', 'informal_details__full_name')
    readonly_fields = ('trader_code', 'created_at', 'updated_at')
    inlines = [LegalTraderInline, InformalTraderInline]

@admin.register(LegalTrader)
class LegalTraderAdmin(admin.ModelAdmin):
    list_display = ('trader', 'trade_name', 'owner_full_name', 'tin', 'woreda', 'kebele')
    search_fields = ('trade_name', 'owner_full_name', 'tin', 'trader__trader_code')

@admin.register(InformalTrader)
class InformalTraderAdmin(admin.ModelAdmin):
    list_display = ('trader', 'full_name', 'gender', 'woreda', 'kebele', 'formalization_status_recommendation')
    search_fields = ('full_name', 'phone_number', 'trader__trader_code')
