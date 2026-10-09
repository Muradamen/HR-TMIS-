from rest_framework import viewsets, permissions, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import AuditEvent
from .serializers import AuditEventSerializer

class AuditEventViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only audit event list and detail for authorized personnel.
    Editing or deleting audit events is strictly forbidden.
    """
    queryset = AuditEvent.objects.all().order_by('-timestamp')
    serializer_class = AuditEventSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['action', 'entity_type', 'entity_id', 'actor_role']
    search_fields = ['entity_id', 'actor_username', 'details', 'reason']
    ordering_fields = ['timestamp', 'action', 'entity_id']
