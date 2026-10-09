from rest_framework import serializers
from .models import VerificationLog

class VerificationDecisionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['APPROVED', 'RETURNED', 'REJECTED'])
    notes = serializers.CharField(required=False, allow_blank=True)
    reason = serializers.CharField(required=False, allow_blank=True)

class VerificationLogSerializer(serializers.ModelSerializer):
    officerName = serializers.CharField(source='officer.full_name', read_only=True)

    class Meta:
        model = VerificationLog
        fields = ['id', 'trader', 'officer', 'officerName', 'action', 'notes', 'timestamp']


class BulkApprovalSerializer(serializers.Serializer):
    trader_ids = serializers.ListField(
        child=serializers.CharField(max_length=50, trim_whitespace=True),
        allow_empty=False,
        max_length=100,
    )
    notes = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate_trader_ids(self, value):
        if len(set(value)) != len(value):
            raise serializers.ValidationError('Duplicate trader IDs are not allowed.')
        return value
