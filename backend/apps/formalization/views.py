from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import FormalizationAssessment
from .serializers import FormalizationAssessmentSerializer
from apps.traders.models import Trader
from apps.audit.models import AuditLog
from apps.core.permissions import IsDirector, IsFormalizationReader

class FormalizationViewSet(viewsets.ModelViewSet):
    queryset = FormalizationAssessment.objects.select_related('trader', 'assigned_mentor', 'assessed_by').all()
    serializer_class = FormalizationAssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'assess_trader'):
            classes = [IsDirector]
        else:
            classes = [IsFormalizationReader]
        return [cls() for cls in classes]

    def get_queryset(self):
        qs = FormalizationAssessment.objects.select_related(
            'trader', 'trader__woreda', 'assigned_mentor', 'assessed_by'
        ).all()
        user = self.request.user
        if user.is_authenticated and (
            user.role == 'DIRECTOR' or user.groups.filter(name='DIRECTOR_OF_TRADER_CONTROL').exists()
        ) and user.assigned_woreda_id:
            qs = qs.filter(trader__woreda_id=user.assigned_woreda_id)
        return qs

    @action(detail=False, methods=['post'], url_path='assess')
    def assess_trader(self, request):
        trader_id = request.data.get('trader_id') or request.data.get('traderId')
        try:
            trader = Trader.objects.get(trader_id=trader_id)
        except Trader.DoesNotExist:
            return Response({'detail': f'Trader {trader_id} not found.'}, status=status.HTTP_404_NOT_FOUND)

        if (request.user.role == 'DIRECTOR' or request.user.groups.filter(name='DIRECTOR_OF_TRADER_CONTROL').exists()) and request.user.assigned_woreda_id and trader.woreda_id != request.user.assigned_woreda_id:
            return Response({'detail': 'This trader is outside your assigned Woreda.'}, status=status.HTTP_403_FORBIDDEN)

        if trader.trader_type != 'INFORMAL':
            return Response({'detail': 'Formalization assessment is only applicable to informal traders.'}, status=status.HTTP_400_BAD_REQUEST)

        requested_status = request.data.get('status')
        allowed_statuses = {choice[0] for choice in FormalizationAssessment.STATUS_CHOICES}
        if requested_status is not None and requested_status not in allowed_statuses:
            return Response({'detail': 'Invalid formalization status.'}, status=status.HTTP_400_BAD_REQUEST)

        assessment, created = FormalizationAssessment.objects.get_or_create(trader=trader)
        assessment.status = requested_status or assessment.status
        assessment.support_package = request.data.get('support_package', assessment.support_package)
        assessment.notes = request.data.get('notes', assessment.notes)
        assessment.assessed_by = request.user
        if assessment.status == 'FORMALIZED' and not assessment.formalized_date:
            assessment.formalized_date = timezone.now().date()
        assessment.save()

        AuditLog.objects.create(
            action='FORMALIZE_TRADER',
            trader_id=trader.trader_id,
            details=f"Updated formalization assessment to {assessment.status}",
            user=request.user.username,
        )

        return Response(FormalizationAssessmentSerializer(assessment).data)
