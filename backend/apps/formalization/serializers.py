from rest_framework import serializers
from .models import FormalizationAssessment

class FormalizationAssessmentSerializer(serializers.ModelSerializer):
    traderId = serializers.CharField(source='trader.trader_id', read_only=True)
    traderName = serializers.CharField(source='trader.name', read_only=True)
    mentorName = serializers.CharField(source='assigned_mentor.full_name', read_only=True)
    assessedByName = serializers.CharField(source='assessed_by.full_name', read_only=True)

    class Meta:
        model = FormalizationAssessment
        fields = [
            'id',
            'trader',
            'traderId',
            'traderName',
            'status',
            'support_package',
            'target_date',
            'formalized_date',
            'assigned_mentor',
            'mentorName',
            'notes',
            'assessed_by',
            'assessedByName',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
