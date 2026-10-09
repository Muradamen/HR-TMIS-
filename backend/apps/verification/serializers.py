from rest_framework import serializers
from .models import VerificationLog

class VerificationDecisionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=['APPROVED', 'NEEDS_CORRECTION', 'REJECTED'])
    notes = serializers.CharField(required=False, allow_blank=True)
    reason = serializers.CharField(required=False, allow_blank=True)

class VerificationLogSerializer(serializers.ModelSerializer):
    officerName = serializers.CharField(source='officer.full_name', read_only=True)

    class Meta:
        model = VerificationLog
        fields = ['id', 'trader', 'officer', 'officerName', 'action', 'notes', 'timestamp']
