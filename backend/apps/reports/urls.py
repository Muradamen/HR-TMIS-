from django.urls import path
from .views import DashboardMetricsView, CsvExportView, ExcelExportView, PdfExportView

urlpatterns = [
    path('dashboard/', DashboardMetricsView.as_view(), name='reports-dashboard'),
    path('exports/csv/', CsvExportView.as_view(), name='reports-export-csv'),
    path('exports/excel/', ExcelExportView.as_view(), name='reports-export-excel'),
    path('exports/pdf/', PdfExportView.as_view(), name='reports-export-pdf'),
]
