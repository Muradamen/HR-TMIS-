from rest_framework import serializers
from .models import FormalizationRecord, FormalizationStatus
from apps.traders.serializers import TraderDetailSerializer

class FormalizationRecordSerializer(serializers.ModelSerializer):
    traderId = serializers.CharField(source='trader.trader_id', read_only=True)
    traderName = serializers.CharField(source='trader.owner_full_name', read_only=True)
    assessingOfficerName = serializers.CharField(source='assessing_officer.full_name', read_only=True, allow_null=True)
    responsibleOfficerName = serializers.CharField(source='responsible_officer.full_name', read_only=True, allow_null=True)

    class Meta:
        model = FormalizationRecord
        fields = [
            'id', 'trader', 'traderId', 'traderName', 'status',
            'assessment_date', 'assessing_officer', 'assessingOfficerName',
            'readiness_assessment', 'barriers', 'recommended_support',
            'follow_up_date', 'support_provided', 'formalization_notes',
            'formalized_date', 'responsible_officer', 'responsibleOfficerName',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'traderId', 'traderName']
