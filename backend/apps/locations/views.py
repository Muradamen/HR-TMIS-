from rest_framework import viewsets, permissions
from django_filters.rest_framework import DjangoFilterBackend
from .models import Region, Woreda, Kebele
from .serializers import RegionSerializer, WoredaSerializer, KebeleSerializer
from apps.accounts.permissions import IsAdministrator
from apps.audit.models import AuditEvent

class RegionViewSet(viewsets.ModelViewSet):
    queryset = Region.objects.all()
    serializer_class = RegionSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdministrator()]

class WoredaViewSet(viewsets.ModelViewSet):
    queryset = Woreda.objects.all().prefetch_related('kebeles').order_by('id')
    serializer_class = WoredaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_active', 'region']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdministrator()]

    def perform_create(self, serializer):
        # Default region to Harari if not provided
        region = serializer.validated_data.get('region')
        if not region:
            region, _ = Region.objects.get_or_create(name='Harari People Regional State', defaults={'code': 'HR'})
            serializer.validated_data['region'] = region
        woreda = serializer.save()
        AuditEvent.log(
            actor=self.request.user,
            action='LOCATION_CREATED',
            entity_type='WOREDA',
            entity_id=str(woreda.id),
            details=f"Created Woreda: {woreda.name} ({woreda.code})"
        )

class KebeleViewSet(viewsets.ModelViewSet):
    queryset = Kebele.objects.all().select_related('woreda').order_by('id')
    serializer_class = KebeleSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['woreda', 'is_active']

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsAdministrator()]

    def perform_create(self, serializer):
        kebele = serializer.save()
        AuditEvent.log(
            actor=self.request.user,
            action='LOCATION_CREATED',
            entity_type='KEBELE',
            entity_id=str(kebele.id),
            details=f"Created Kebele: {kebele.name} ({kebele.code}) in Woreda {kebele.woreda.name}"
        )
