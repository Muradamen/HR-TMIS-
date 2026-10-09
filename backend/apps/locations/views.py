from rest_framework import viewsets, permissions
from .models import Region, Woreda, Kebele
from .serializers import RegionSerializer, WoredaSerializer, KebeleSerializer
from apps.core.permissions import IsAdministrator

class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Region.objects.filter(is_active=True).order_by('name')
    serializer_class = RegionSerializer
    permission_classes = [permissions.IsAuthenticated]

class WoredaViewSet(viewsets.ModelViewSet):
    queryset = Woreda.objects.filter(is_active=True).order_by('name')
    serializer_class = WoredaSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdministrator()]
        return [permissions.IsAuthenticated()]

class KebeleViewSet(viewsets.ModelViewSet):
    queryset = Kebele.objects.filter(is_active=True).order_by('name')
    serializer_class = KebeleSerializer
    filterset_fields = ['woreda']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdministrator()]
        return [permissions.IsAuthenticated()]
