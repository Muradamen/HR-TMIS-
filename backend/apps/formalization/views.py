from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import FormalizationAssessment
from .serializers import FormalizationAssessmentSerializer
from apps.traders.models import Trader
from apps.audit.models import AuditLog

class FormalizationViewSet(viewsets.ModelViewSet):
    queryset = FormalizationAssessment.objects.select_related('trader', 'assigned_mentor', 'assessed_by').all()
    serializer_class = FormalizationAssessmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'], url_path='assess')
    def assess_trader(self, request):
        trader_id = request.data.get('trader_id') or request.data.get('traderId')
        try:
            trader = Trader.objects.get(trader_id=trader_id)
        except Trader.DoesNotExist:
            return Response({'detail': f'Trader {trader_id} not found.'}, status=status.HTTP_404_NOT_FOUND)

        if trader.trader_type != 'INFORMAL':
            return Response({'detail': 'Formalization assessment is only applicable to informal traders.'}, status=status.HTTP_400_BAD_REQUEST)

        assessment, created = FormalizationAssessment.objects.get_or_create(trader=trader)
        assessment.status = request.data.get('status', assessment.status)
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
