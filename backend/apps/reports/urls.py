from django.urls import path
from .views import DashboardStatsView, ExportCsvView, ExportExcelView, CertificatePdfView

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='report-dashboard'),
    path('export/csv/', ExportCsvView.as_view(), name='report-export-csv'),
    path('export/excel/', ExportExcelView.as_view(), name='report-export-excel'),
    path('certificate/<str:trader_id>/pdf/', CertificatePdfView.as_view(), name='report-certificate-pdf'),
]
