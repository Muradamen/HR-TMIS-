from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name', read_only=True)
    assignedWoredaId = serializers.IntegerField(source='assigned_woreda_id', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'email',
            'full_name',
            'fullName',
            'role',
            'department',
            'phone_number',
            'assignedWoredaId',
            'is_active',
        ]
        read_only_fields = ['id', 'is_active']

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)
