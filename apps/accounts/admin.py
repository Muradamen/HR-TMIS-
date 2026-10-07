from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            'HT-TMIS Information',
            {
                'fields': ('role',),
            },
        ),
    )

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            'HT-TMIS Information',
            {
                'fields': ('role',),
            },
        ),
    )

    list_display = (
        'username',
        'first_name',
        'last_name',
        'email',
        'role',
        'is_active',
    )

    list_filter = (
        'role',
        'is_active',
        'is_staff',
    )

    search_fields = (
        'username',
        'first_name',
        'last_name',
        'email',
    )
