from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            'HT-TMIS Role & Organization',
            {
                'fields': ('role', 'phone_number', 'department'),
            },
        ),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            'HT-TMIS Role & Organization',
            {
                'fields': ('role', 'phone_number', 'department'),
            },
        ),
    )
    list_display = ('username', 'first_name', 'last_name', 'email', 'role', 'is_active', 'is_staff')
    list_filter = ('role', 'is_active', 'is_staff')
    search_fields = ('username', 'first_name', 'last_name', 'email')
