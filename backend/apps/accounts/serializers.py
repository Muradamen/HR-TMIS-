from rest_framework import serializers
from .models import User

class UserSerializer(serializers.ModelSerializer):
    normalized_role = serializers.CharField(source='get_normalized_role', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'role',
            'normalized_role', 'department', 'phone_number',
            'assigned_woreda_id', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'normalized_role']

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(required=True, write_only=True)

class UserCreateUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'password', 'email', 'full_name',
            'role', 'department', 'phone_number', 'assigned_woreda_id', 'is_active'
        ]

    def create(self, validated_data):
        password = validated_data.pop('password', 'password123')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
