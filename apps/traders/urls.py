from django.urls import path
from . import views

app_name = 'traders'

urlpatterns = [
    path('', views.trader_list, name='list'),
    path('register/', views.trader_register_choice, name='register_choice'),
    path('register/legal/', views.trader_register_legal, name='register_legal'),
    path('register/informal/', views.trader_register_informal, name='register_informal'),
    path('export/excel/', views.export_excel_view, name='export_excel'),
    path('api/kebeles/', views.api_kebeles, name='api_kebeles'),
    path('<str:trader_code>/', views.trader_detail, name='detail'),
    path('<str:trader_code>/transition/', views.trader_workflow_transition, name='transition'),
    path('<str:trader_code>/export/pdf/', views.export_pdf_certificate_view, name='export_pdf'),
]
