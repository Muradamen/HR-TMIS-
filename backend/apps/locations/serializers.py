from rest_framework import serializers
from .models import Region, Woreda, Kebele

class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ['id', 'name', 'code', 'is_active']

class KebeleSerializer(serializers.ModelSerializer):
    woredaId = serializers.IntegerField(source='woreda_id', read_only=True)
    isActive = serializers.BooleanField(source='is_active', read_only=True)

    class Meta:
        model = Kebele
        fields = ['id', 'woreda', 'woredaId', 'name', 'code', 'isActive', 'is_active']

class WoredaSerializer(serializers.ModelSerializer):
    isActive = serializers.BooleanField(source='is_active', read_only=True)
    kebeles = KebeleSerializer(many=True, read_only=True)

    class Meta:
        model = Woreda
        fields = ['id', 'region', 'name', 'code', 'isActive', 'is_active', 'kebeles']
