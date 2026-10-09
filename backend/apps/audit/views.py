from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditLog
from .serializers import AuditLogSerializer
from apps.core.permissions import IsReportExporter
from apps.traders.models import Trader

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for system compliance and audit trails.
    Modifications or deletions are strictly blocked.
    """
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsReportExporter]

    def get_queryset(self):
        qs = AuditLog.objects.all().order_by('-timestamp')
        user = self.request.user
        is_director = user.role == 'DIRECTOR' or user.groups.filter(name='DIRECTOR_OF_TRADER_CONTROL').exists()
        if is_director and user.assigned_woreda_id:
            allowed_ids = Trader.objects.filter(woreda_id=user.assigned_woreda_id).values('trader_id')
            qs = qs.filter(trader_id__in=allowed_ids)
        return qs
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'trader_id', 'user']
    search_fields = ['details', 'trader_id', 'user']
    ordering_fields = ['timestamp', 'action']
