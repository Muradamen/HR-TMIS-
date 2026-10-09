from django.urls import path
from .views import DashboardStatsView, ExportCsvView, ExportExcelView, ExportPdfView, CertificatePdfView

urlpatterns = [
    path('dashboard/', DashboardStatsView.as_view(), name='report-dashboard'),
    path('export/csv/', ExportCsvView.as_view(), name='report-export-csv'),
    path('export/excel/', ExportExcelView.as_view(), name='report-export-excel'),
    path('export/pdf/', ExportPdfView.as_view(), name='report-export-pdf'),
    path('certificate/<str:trader_id>/pdf/', CertificatePdfView.as_view(), name='report-certificate-pdf'),
]
