from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name', read_only=True)
    assignedWoredaId = serializers.IntegerField(source='assigned_woreda_id', read_only=True)
    password = serializers.CharField(write_only=True, required=False, validators=[validate_password], trim_whitespace=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'full_name', 'fullName', 'role',
            'department', 'phone_number', 'assignedWoredaId', 'assigned_woreda',
            'is_active',
        ]
        read_only_fields = ['id', 'is_active', 'assignedWoredaId']

    def validate_email(self, value):
        email = value.strip().lower()
        qs = User.objects.filter(email__iexact=email)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return email

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'A password is required when creating a user.'})
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


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
