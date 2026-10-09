from rest_framework import serializers
from .models import Region, Woreda, Kebele

class KebeleSerializer(serializers.ModelSerializer):
    woredaId = serializers.IntegerField(source='woreda_id', read_only=True)
    isActive = serializers.BooleanField(source='is_active')

    class Meta:
        model = Kebele
        fields = ['id', 'woreda', 'woredaId', 'name', 'code', 'isActive', 'is_active']
        extra_kwargs = {
            'woreda': {'required': False},
            'is_active': {'required': False}
        }

class WoredaSerializer(serializers.ModelSerializer):
    kebeles = KebeleSerializer(many=True, read_only=True)
    isActive = serializers.BooleanField(source='is_active')

    class Meta:
        model = Woreda
        fields = ['id', 'region', 'name', 'code', 'isActive', 'is_active', 'kebeles']
        extra_kwargs = {
            'region': {'required': False},
            'is_active': {'required': False}
        }

class RegionSerializer(serializers.ModelSerializer):
    woredas = WoredaSerializer(many=True, read_only=True)

    class Meta:
        model = Region
        fields = ['id', 'name', 'code', 'is_active', 'woredas']
