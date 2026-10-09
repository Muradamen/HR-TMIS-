from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name', read_only=True)
    assignedWoredaId = serializers.IntegerField(source='assigned_woreda_id', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'full_name', 'fullName', 'role',
            'department', 'phone_number', 'assignedWoredaId', 'is_active',
        ]
        read_only_fields = ['id', 'is_active']


class LoginSerializer(serializers.Serializer):
    # Accept both current frontend payloads: {email, password} and legacy {username, password}.
    email = serializers.EmailField(required=False)
    username = serializers.CharField(required=False)
    password = serializers.CharField(required=True, write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        identifier = (attrs.get('email') or attrs.get('username') or '').strip()
        if not identifier:
            raise serializers.ValidationError({'email': 'Provide your email address.'})
        attrs['identifier'] = identifier
        return attrs
