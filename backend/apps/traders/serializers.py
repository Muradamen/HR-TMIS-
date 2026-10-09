from rest_framework import serializers
from .models import Trader, LegalTrader, InformalTrader
from apps.locations.serializers import WoredaSerializer, KebeleSerializer

class LegalTraderSerializer(serializers.ModelSerializer):
    tradeName = serializers.CharField(source='trader.name', required=False)
    ownerFullName = serializers.CharField(source='trader.owner_full_name', required=False)
    woredaId = serializers.IntegerField(source='trader.woreda_id', required=False)
    kebeleId = serializers.IntegerField(source='trader.kebele_id', required=False)
    houseNumberPlotId = serializers.CharField(source='house_number_plot_id', required=False, allow_blank=True)
    businessSector = serializers.CharField(source='business_sector')
    tradeScale = serializers.CharField(source='trade_scale')
    businessOwnershipType = serializers.CharField(source='business_ownership_type')
    issuingInstitution = serializers.CharField(source='issuing_institution')
    dateOfIssuance = serializers.DateField(source='date_of_issuance')
    tradeRegistrationNumber = serializers.CharField(source='trade_registration_number')

    class Meta:
        model = LegalTrader
        fields = [
            'id',
            'tin',
            'tradeRegistrationNumber',
            'gender',
            'age',
            'businessSector',
            'tradeScale',
            'businessOwnershipType',
            'issuingInstitution',
            'dateOfIssuance',
            'houseNumberPlotId',
            'remarks',
            'officer_signature',
            'tradeName',
            'ownerFullName',
            'woredaId',
            'kebeleId',
        ]

class InformalTraderSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='trader.name', required=False)
    woredaId = serializers.IntegerField(source='trader.woreda_id', required=False)
    kebeleId = serializers.IntegerField(source='trader.kebele_id', required=False)
    nationalIdResidentId = serializers.CharField(source='national_id_resident_id', required=False, allow_blank=True)
    phoneNumber = serializers.CharField(source='trader.phone_number', required=False, allow_blank=True)
    specificLocationMarketArea = serializers.CharField(source='specific_location_market_area')
    natureOfTradeActivity = serializers.CharField(source='nature_of_trade_activity')
    estimatedCapitalAssets = serializers.FloatField(source='estimated_capital_assets')
    reasonForOperatingInformally = serializers.CharField(source='reason_for_operating_informally')
    formalizationStatusRecommendation = serializers.CharField(source='formalization_status_recommendation')
    enumeratorDataCollectorName = serializers.CharField(source='enumerator_data_collector_name')
    dateOfAssessment = serializers.DateField(source='date_of_assessment')

    class Meta:
        model = InformalTrader
        fields = [
            'id',
            'fullName',
            'gender',
            'age',
            'nationalIdResidentId',
            'phoneNumber',
            'woredaId',
            'kebeleId',
            'specificLocationMarketArea',
            'natureOfTradeActivity',
            'estimatedCapitalAssets',
            'reasonForOperatingInformally',
            'formalizationStatusRecommendation',
            'enumeratorDataCollectorName',
            'dateOfAssessment',
        ]

class TraderSerializer(serializers.ModelSerializer):
    traderId = serializers.CharField(source='trader_id', read_only=True)
    traderType = serializers.CharField(source='trader_type')
    woredaId = serializers.IntegerField(source='woreda_id', read_only=True)
    kebeleId = serializers.IntegerField(source='kebele_id', read_only=True)
    legalDetails = LegalTraderSerializer(source='legal_details', read_only=True)
    informalDetails = InformalTraderSerializer(source='informal_details', read_only=True)
    registeredBy = serializers.SerializerMethodField()
    registeredById = serializers.IntegerField(source='created_by_id', read_only=True)
    verifiedBy = serializers.SerializerMethodField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)

    class Meta:
        model = Trader
        fields = [
            'id',
            'traderId',
            'traderType',
            'status',
            'name',
            'owner_full_name',
            'phone_number',
            'woreda',
            'woredaId',
            'kebele',
            'kebeleId',
            'specific_location',
            'legalDetails',
            'informalDetails',
            'registeredBy',
            'registeredById',
            'verifiedBy',
            'verification_notes',
            'rejection_reason',
            'correction_remarks',
            'createdAt',
            'updatedAt',
        ]
        read_only_fields = ['id', 'traderId', 'status', 'created_at', 'updated_at']

    def get_registeredBy(self, obj):
        return obj.created_by.full_name if obj.created_by else 'System Encoder'

    def get_verifiedBy(self, obj):
        return obj.verified_by.full_name if obj.verified_by else None
