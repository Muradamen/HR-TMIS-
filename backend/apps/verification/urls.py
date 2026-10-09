from django.urls import path
from .views import VerificationQueueView, VerificationClaimView, VerificationDecisionView, VerificationHistoryView, BulkApprovalView

urlpatterns = [
    path('queue/', VerificationQueueView.as_view(), name='verification-queue'),
    path('bulk-approve/', BulkApprovalView.as_view(), name='verification-bulk-approve'),
    path('<str:trader_id>/claim/', VerificationClaimView.as_view(), name='verification-claim'),
    path('<str:trader_id>/decision/', VerificationDecisionView.as_view(), name='verification-decision'),
    path('<str:trader_id>/history/', VerificationHistoryView.as_view(), name='verification-history'),
]
