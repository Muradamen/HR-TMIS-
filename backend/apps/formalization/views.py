from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from apps.accounts.permissions import CanManageFormalization
from apps.audit.models import AuditEvent
from apps.traders.models import Trader, TraderType
from .models import FormalizationRecord, FormalizationStatus
from .serializers import FormalizationRecordSerializer

class FormalizationViewSet(viewsets.ModelViewSet):
    queryset = FormalizationRecord.objects.all().select_related(
        'trader', 'assessing_officer', 'responsible_officer'
    ).order_by('-updated_at')
    serializer_class = FormalizationRecordSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['status', 'assessing_officer']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'assess', 'follow_up', 'formalize']:
            return [CanManageFormalization()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def assess(self, request, pk=None):
        record = self.get_object()
        user = request.user
        data = request.data

        prev_status = record.status
        new_status = data.get('status', FormalizationStatus.READY_FOR_FORMALIZATION)

        record.status = new_status
        record.assessment_date = data.get('assessmentDate', timezone.now().date())
        record.assessing_officer = user
        record.readiness_assessment = data.get('readinessAssessment', '')
        record.barriers = data.get('barriers', '')
        record.recommended_support = data.get('recommendedSupport', '')
        record.follow_up_date = data.get('followUpDate', None)
        record.formalization_notes = data.get('notes', '')
        record.save()

        AuditEvent.log(
            actor=user,
            action='FORMALIZATION_ASSESSED',
            entity_type='FORMALIZATION',
            entity_id=record.trader.trader_id,
            previous_state=prev_status,
            new_state=new_status,
            details=f"Formalization assessment recorded by {user.full_name}: {new_status}"
        )
        return Response({'success': True, 'data': FormalizationRecordSerializer(record).data})

    @action(detail=True, methods=['post'])
    def follow_up(self, request, pk=None):
        record = self.get_object()
        user = request.user
        data = request.data

        record.support_provided = data.get('supportProvided', record.support_provided)
        record.formalization_notes = data.get('notes', record.formalization_notes)
        if 'status' in data:
            record.status = data['status']
        record.save()

        AuditEvent.log(
            actor=user,
            action='FORMALIZATION_UPDATED',
            entity_type='FORMALIZATION',
            entity_id=record.trader.trader_id,
            details=f"Formalization follow-up updated by {user.full_name}"
        )
        return Response({'success': True, 'data': FormalizationRecordSerializer(record).data})

    @action(detail=True, methods=['post'])
    def formalize(self, request, pk=None):
        record = self.get_object()
        user = request.user
        data = request.data

        prev_status = record.status
        record.status = FormalizationStatus.FORMALIZED
        record.formalized_date = timezone.now().date()
        record.responsible_officer = user
        record.formalization_notes = data.get('notes', record.formalization_notes)
        record.save()

        AuditEvent.log(
            actor=user,
            action='FORMALIZED',
            entity_type='FORMALIZATION',
            entity_id=record.trader.trader_id,
            previous_state=prev_status,
            new_state=FormalizationStatus.FORMALIZED,
            details=f"Trader formalization finalized by Officer {user.full_name}"
        )
        return Response({'success': True, 'message': f"Trader {record.trader.trader_id} formalized successfully", 'data': FormalizationRecordSerializer(record).data})
