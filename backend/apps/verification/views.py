from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.accounts.permissions import CanVerifyTrader, IsDirector
from apps.audit.models import AuditEvent
from apps.traders.models import Trader, WorkflowStatus
from apps.traders.serializers import TraderDetailSerializer

class VerificationQueueView(APIView):
    permission_classes = [CanVerifyTrader]

    def get(self, request):
        user = request.user
        queue_type = request.query_params.get('type', 'all') # 'all', 'unassigned', 'mine'
        woreda_id = request.query_params.get('woredaId')
        trader_type = request.query_params.get('traderType')
        search = request.query_params.get('search')

        qs = Trader.objects.filter(
            status__in=[WorkflowStatus.SUBMITTED, WorkflowStatus.UNDER_REVIEW, 'PENDING']
        ).select_related(
            'woreda', 'kebele', 'region', 'registered_by', 'verified_by', 'assigned_to',
            'legal_details', 'informal_details'
        )

        if queue_type == 'mine':
            qs = qs.filter(assigned_to=user)
        elif queue_type == 'unassigned':
            qs = qs.filter(assigned_to__isnull=True)

        if woreda_id:
            qs = qs.filter(woreda_id=woreda_id)
        if trader_type:
            qs = qs.filter(trader_type=trader_type)
        if search:
            qs = qs.filter(
                models.Q(trader_id__icontains=search) |
                models.Q(business_name__icontains=search) |
                models.Q(owner_full_name__icontains=search)
            )

        data = TraderDetailSerializer(qs, many=True).data
        return Response({
            'success': True,
            'count': qs.count(),
            'traders': data
        })

class ClaimTraderView(APIView):
    permission_classes = [CanVerifyTrader]

    def post(self, request, trader_id):
        user = request.user
        with transaction.atomic():
            try:
                trader = Trader.objects.select_for_update().get(trader_id=trader_id)
            except Trader.DoesNotExist:
                return Response({'success': False, 'error': f"Trader {trader_id} not found"}, status=status.HTTP_404_NOT_FOUND)

            if trader.assigned_to and trader.assigned_to_id != user.id:
                return Response({
                    'success': False,
                    'error': f"Record is already claimed by Director {trader.assigned_to.full_name}"
                }, status=status.HTTP_409_CONFLICT)

            prev_state = trader.status
            trader.assigned_to = user
            trader.claimed_at = timezone.now()
            trader.status = WorkflowStatus.UNDER_REVIEW
            trader.save()

            AuditEvent.log(
                actor=user,
                action='CLAIMED',
                entity_type='TRADER',
                entity_id=trader.trader_id,
                previous_state=prev_state,
                new_state=WorkflowStatus.UNDER_REVIEW,
                details=f"Director {user.full_name} claimed record for verification"
            )

            return Response({
                'success': True,
                'message': f"Trader {trader.trader_id} claimed and moved to UNDER_REVIEW",
                'data': TraderDetailSerializer(trader).data
            })

class ApproveTraderView(APIView):
    permission_classes = [CanVerifyTrader]

    def post(self, request, trader_id):
        user = request.user
        notes = request.data.get('notes', request.data.get('verificationNotes', '')).strip()

        with transaction.atomic():
            try:
                trader = Trader.objects.select_for_update().get(trader_id=trader_id)
            except Trader.DoesNotExist:
                return Response({'success': False, 'error': f"Trader {trader_id} not found"}, status=status.HTTP_404_NOT_FOUND)

            # Mandatory rule: User must NEVER approve their own submitted record!
            if trader.registered_by_id == user.id:
                return Response({
                    'success': False,
                    'error': "Security Violation: You cannot approve records that you submitted yourself (Self-approval is forbidden)."
                }, status=status.HTTP_403_FORBIDDEN)

            prev_state = trader.status
            trader.status = WorkflowStatus.APPROVED
            trader.verified_by = user
            trader.verified_at = timezone.now()
            trader.verification_notes = notes
            trader.save()

            if trader.trader_type == 'LEGAL' and hasattr(trader, 'legal_details'):
                legal = trader.legal_details
                legal.verification_date = timezone.now().date()
                legal.officer_signature = user.full_name
                legal.save()

            AuditEvent.log(
                actor=user,
                action='APPROVED',
                entity_type='TRADER',
                entity_id=trader.trader_id,
                previous_state=prev_state,
                new_state=WorkflowStatus.APPROVED,
                reason=notes,
                details=f"Director {user.full_name} approved registration dossier"
            )

            return Response({
                'success': True,
                'message': f"Trader {trader.trader_id} successfully approved",
                'data': TraderDetailSerializer(trader).data
            })

class RejectTraderView(APIView):
    permission_classes = [CanVerifyTrader]

    def post(self, request, trader_id):
        user = request.user
        reason = request.data.get('reason', request.data.get('notes', '')).strip()

        if not reason:
            return Response({
                'success': False,
                'error': "A documented rejection reason is mandatory."
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                trader = Trader.objects.select_for_update().get(trader_id=trader_id)
            except Trader.DoesNotExist:
                return Response({'success': False, 'error': f"Trader {trader_id} not found"}, status=status.HTTP_404_NOT_FOUND)

            prev_state = trader.status
            trader.status = WorkflowStatus.REJECTED
            trader.verified_by = user
            trader.verified_at = timezone.now()
            trader.rejection_reason = reason
            trader.verification_notes = reason
            trader.save()

            AuditEvent.log(
                actor=user,
                action='REJECTED',
                entity_type='TRADER',
                entity_id=trader.trader_id,
                previous_state=prev_state,
                new_state=WorkflowStatus.REJECTED,
                reason=reason,
                details=f"Director {user.full_name} rejected registration with reason: {reason}"
            )

            return Response({
                'success': True,
                'message': f"Trader {trader.trader_id} rejected",
                'data': TraderDetailSerializer(trader).data
            })

class ReturnForCorrectionView(APIView):
    permission_classes = [CanVerifyTrader]

    def post(self, request, trader_id):
        user = request.user
        notes = request.data.get('notes', request.data.get('reason', '')).strip()

        if not notes:
            return Response({
                'success': False,
                'error': "Explanatory correction instructions are mandatory."
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            try:
                trader = Trader.objects.select_for_update().get(trader_id=trader_id)
            except Trader.DoesNotExist:
                return Response({'success': False, 'error': f"Trader {trader_id} not found"}, status=status.HTTP_404_NOT_FOUND)

            prev_state = trader.status
            trader.status = WorkflowStatus.NEEDS_CORRECTION
            trader.verified_by = user
            trader.verification_notes = notes
            trader.save()

            AuditEvent.log(
                actor=user,
                action='RETURNED_FOR_CORRECTION',
                entity_type='TRADER',
                entity_id=trader.trader_id,
                previous_state=prev_state,
                new_state=WorkflowStatus.NEEDS_CORRECTION,
                reason=notes,
                details=f"Director {user.full_name} returned record for correction: {notes}"
            )

            return Response({
                'success': True,
                'message': f"Trader {trader.trader_id} returned for correction",
                'data': TraderDetailSerializer(trader).data
            })

class BulkApproveView(APIView):
    permission_classes = [CanVerifyTrader]

    def post(self, request):
        user = request.user
        trader_ids = request.data.get('traderIds', [])
        notes = request.data.get('notes', 'Bulk directorate approval').strip()

        if not trader_ids:
            return Response({'success': False, 'error': 'No trader IDs provided for bulk approval'}, status=status.HTTP_400_BAD_REQUEST)

        results = {'succeeded': [], 'failed': []}

        for tid in trader_ids:
            try:
                with transaction.atomic():
                    trader = Trader.objects.select_for_update().get(trader_id=tid)
                    if trader.registered_by_id == user.id:
                        results['failed'].append({
                            'traderId': tid,
                            'error': 'Self-approval forbidden: You submitted this record.'
                        })
                        continue

                    if trader.status == WorkflowStatus.APPROVED:
                        results['succeeded'].append(tid)
                        continue

                    prev_state = trader.status
                    trader.status = WorkflowStatus.APPROVED
                    trader.verified_by = user
                    trader.verified_at = timezone.now()
                    trader.verification_notes = notes
                    trader.save()

                    AuditEvent.log(
                        actor=user,
                        action='APPROVED',
                        entity_type='TRADER',
                        entity_id=trader.trader_id,
                        previous_state=prev_state,
                        new_state=WorkflowStatus.APPROVED,
                        reason=notes,
                        details=f"Bulk approval by Director {user.full_name}"
                    )
                    results['succeeded'].append(tid)
            except Exception as e:
                results['failed'].append({'traderId': tid, 'error': str(e)})

        all_success = len(results['failed']) == 0
        return Response({
            'success': all_success,
            'message': f"Approved {len(results['succeeded'])} of {len(trader_ids)} records",
            'results': results
        })
