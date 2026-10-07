from django.contrib import admin

from .models import Kebele, Woreda


@admin.register(Woreda)
class WoredaAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'code',
        'is_active',
    )

    list_filter = (
        'is_active',
    )

    search_fields = (
        'name',
        'code',
    )


@admin.register(Kebele)
class KebeleAdmin(admin.ModelAdmin):
    list_display = (
        'name',
        'code',
        'woreda',
        'is_active',
    )

    list_filter = (
        'woreda',
        'is_active',
    )

    search_fields = (
        'name',
        'code',
    )
