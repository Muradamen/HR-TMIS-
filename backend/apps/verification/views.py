from django.db import transaction
from django.utils import timezone
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response

from apps.traders.models import Trader
from apps.traders.serializers import TraderSerializer
from apps.audit.models import AuditLog
from apps.core.permissions import CanApproveTrader, IsDirector, IsTraderReadAllowed
from .models import VerificationLog
from .serializers import VerificationDecisionSerializer, VerificationLogSerializer

class VerificationQueueView(APIView):
    permission_classes = [IsDirector]

    def get(self, request):
        status_filter = request.query_params.get('status', 'SUBMITTED')
        queryset = Trader.objects.filter(status=status_filter).select_related(
            'woreda', 'kebele', 'created_by', 'verified_by', 'legal_details', 'informal_details'
        )
        if request.user.assigned_woreda_id:
            queryset = queryset.filter(woreda_id=request.user.assigned_woreda_id)
        return Response(TraderSerializer(queryset, many=True).data)

class VerificationClaimView(APIView):
    permission_classes = [IsDirector]

    def post(self, request, trader_id):
        with transaction.atomic():
            try:
                trader = Trader.objects.select_for_update().get(trader_id=trader_id)
            except Trader.DoesNotExist:
                return Response({'detail': 'Trader not found.'}, status=status.HTTP_404_NOT_FOUND)

            if trader.status not in ('SUBMITTED', 'UNDER_REVIEW'):
                return Response({'detail': 'Only submitted records can be claimed.'}, status=status.HTTP_409_CONFLICT)

            if trader.assigned_director and trader.assigned_director != request.user:
                return Response(
                    {'detail': f'Record is already claimed by {trader.assigned_director.full_name}.'},
                    status=status.HTTP_409_CONFLICT
                )

            trader.assigned_director = request.user
            trader.status = 'UNDER_REVIEW'
            trader.save()

            VerificationLog.objects.create(
                trader=trader,
                officer=request.user,
                action='CLAIM',
                notes='Claimed review responsibility'
            )

        return Response(TraderSerializer(trader).data)

class VerificationDecisionView(APIView):
    permission_classes = [CanApproveTrader]

    def post(self, request, trader_id):
        serializer = VerificationDecisionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        notes = serializer.validated_data.get('notes') or serializer.validated_data.get('reason') or ''

        # Rejection & Return require a mandatory justification reason
        if new_status in ['RETURNED', 'REJECTED'] and not notes.strip():
            return Response(
                {'detail': 'A mandatory explanatory reason is required for rejection or return.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            try:
                trader = Trader.objects.select_for_update().get(trader_id=trader_id)
            except Trader.DoesNotExist:
                return Response({'detail': 'Trader not found.'}, status=status.HTTP_404_NOT_FOUND)

            if new_status not in ('APPROVED', 'REJECTED', 'RETURNED', 'NEEDS_CORRECTION'):
                return Response({'detail': 'Unsupported verification decision.'}, status=status.HTTP_400_BAD_REQUEST)
            if trader.status not in ('SUBMITTED', 'UNDER_REVIEW'):
                return Response({'detail': 'Only submitted or under-review records can receive a decision.'}, status=status.HTTP_409_CONFLICT)
            if trader.assigned_director_id and trader.assigned_director_id != request.user.id:
                return Response({'detail': 'This record is assigned to another director.'}, status=status.HTTP_403_FORBIDDEN)

            # Self-approval guard: Submitting officer cannot approve their own record
            if trader.created_by == request.user:
                return Response(
                    {'detail': 'Conflict of interest: You cannot approve or verify your own submitted record.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            trader.status = new_status
            trader.verified_by = request.user
            trader.verified_at = timezone.now()
            trader.verification_notes = notes

            if new_status == 'RETURNED':
                trader.correction_remarks = notes
            elif new_status == 'REJECTED':
                trader.rejection_reason = notes

            trader.save()

            if new_status == 'APPROVED':
                action_type = 'APPROVE_TRADER'
                verification_action = 'APPROVE'
            elif new_status == 'REJECTED':
                action_type = 'REJECT_TRADER'
                verification_action = 'REJECT'
            else:
                action_type = 'RETURN_TRADER'
                verification_action = 'RETURN'
            AuditLog.objects.create(
                action=action_type,
                trader_id=trader.trader_id,
                details=f"Marked as {new_status}. Notes: {notes}",
                user=request.user.username,
            )

            VerificationLog.objects.create(
                trader=trader,
                officer=request.user,
                action=verification_action,
                notes=notes,
            )

        return Response(TraderSerializer(trader).data)

class VerificationHistoryView(APIView):
    permission_classes = [IsTraderReadAllowed]

    def get(self, request, trader_id):
        try:
            trader = Trader.objects.get(trader_id=trader_id)
        except Trader.DoesNotExist:
            return Response({'detail': 'Trader not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if (user.role == 'DATA_ENCODER' or user.groups.filter(name='DATA_ENCODER').exists()) and trader.created_by_id != user.id:
            return Response({'detail': 'You may only view verification history for your own records.'}, status=status.HTTP_403_FORBIDDEN)
        if (user.role == 'DIRECTOR' or user.groups.filter(name='DIRECTOR_OF_TRADER_CONTROL').exists()) and user.assigned_woreda_id and trader.woreda_id != user.assigned_woreda_id:
            return Response({'detail': 'This trader is outside your assigned Woreda.'}, status=status.HTTP_403_FORBIDDEN)
        logs = VerificationLog.objects.filter(trader=trader).order_by('-timestamp')
        return Response(VerificationLogSerializer(logs, many=True).data)
