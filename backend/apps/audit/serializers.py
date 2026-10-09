from rest_framework import serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    timestampFormatted = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = [
            'id',
            'action',
            'trader_id',
            'details',
            'user',
            'ip_address',
            'timestamp',
            'timestampFormatted'
        ]
        read_only_fields = fields

    def get_timestampFormatted(self, obj):
        return obj.timestamp.strftime('%Y-%m-%d %H:%M:%S') if obj.timestamp else ''
