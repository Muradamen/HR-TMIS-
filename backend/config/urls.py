from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('i18n/', include('django.conf.urls.i18n')),
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/locations/', include('apps.locations.urls')),
    path('api/v1/traders/', include('apps.traders.urls')),
    path('api/v1/verification/', include('apps.verification.urls')),
    path('api/v1/formalization/', include('apps.formalization.urls')),
    path('api/v1/reports/', include('apps.reports.urls')),
    path('api/v1/audit/', include('apps.audit.urls')),
]
