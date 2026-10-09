from django.urls import path
from .views import VerificationQueueView, VerificationClaimView, VerificationDecisionView, VerificationHistoryView

urlpatterns = [
    path('queue/', VerificationQueueView.as_view(), name='verification-queue'),
    path('<str:trader_id>/claim/', VerificationClaimView.as_view(), name='verification-claim'),
    path('<str:trader_id>/decision/', VerificationDecisionView.as_view(), name='verification-decision'),
    path('<str:trader_id>/history/', VerificationHistoryView.as_view(), name='verification-history'),
]
