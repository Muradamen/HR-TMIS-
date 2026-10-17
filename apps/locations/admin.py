from django.contrib import admin
from .models import Woreda, Kebele

@admin.register(Woreda)
class WoredaAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'region', 'is_active')
    list_filter = ('is_active', 'region')
    search_fields = ('name', 'code')

@admin.register(Kebele)
class KebeleAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'woreda', 'is_active')
    list_filter = ('woreda', 'is_active')
    search_fields = ('name', 'code', 'woreda__name')
