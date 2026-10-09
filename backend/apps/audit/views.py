from rest_framework import viewsets, permissions, filters
from django.db.models import Q
from apps.traders.models import Trader
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditLog
from .serializers import AuditLogSerializer
from apps.core.permissions import IsAuditReader

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for system compliance and audit trails.
    Modifications or deletions are strictly blocked.
    """
    queryset = AuditLog.objects.all().order_by('-timestamp')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuditReader]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'trader_id', 'user']
    search_fields = ['details', 'trader_id', 'user']
    ordering_fields = ['timestamp', 'action']

    def get_queryset(self):
        user = self.request.user
        queryset = AuditLog.objects.all().order_by('-timestamp')
        if (
            (user.role == 'DIRECTOR' or user.groups.filter(name='DIRECTOR_OF_TRADER_CONTROL').exists())
            and user.assigned_woreda_id
        ):
            allowed_trader_ids = Trader.objects.filter(
                woreda_id=user.assigned_woreda_id
            ).values_list('trader_id', flat=True)
            queryset = queryset.filter(
                Q(trader_id__in=allowed_trader_ids) | Q(user=user.username)
            )
        return queryset
