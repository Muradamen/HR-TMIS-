from django.urls import path
from .views import (
    VerificationQueueView, ClaimTraderView, ApproveTraderView,
    RejectTraderView, ReturnForCorrectionView, BulkApproveView
)

urlpatterns = [
    path('queue/', VerificationQueueView.as_view(), name='verification-queue'),
    path('bulk-approve/', BulkApproveView.as_view(), name='verification-bulk-approve'),
    path('<str:trader_id>/claim/', ClaimTraderView.as_view(), name='verification-claim'),
    path('<str:trader_id>/approve/', ApproveTraderView.as_view(), name='verification-approve'),
    path('<str:trader_id>/reject/', RejectTraderView.as_view(), name='verification-reject'),
    path('<str:trader_id>/return-for-correction/', ReturnForCorrectionView.as_view(), name='verification-return'),
]
