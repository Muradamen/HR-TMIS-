from rest_framework import serializers
from .models import Trader, LegalTrader, InformalTrader, WorkflowStatus, TraderType
from apps.locations.models import Region, Woreda, Kebele

class LegalTraderSerializer(serializers.ModelSerializer):
    tradeName = serializers.CharField(source='trade_name')
    ownerFullName = serializers.CharField(source='owner_full_name')
    tradeRegistrationNumber = serializers.CharField(source='trade_registration_number')
    houseNumberPlotId = serializers.CharField(source='house_number_plot_id', required=False, allow_blank=True)
    businessSector = serializers.CharField(source='business_sector')
    tradeScale = serializers.CharField(source='trade_scale')
    businessOwnershipType = serializers.CharField(source='business_ownership_type')
    issuingInstitution = serializers.CharField(source='issuing_institution', required=False)
    dateOfIssuance = serializers.DateField(source='date_of_issuance')
    dataEnteredBy = serializers.CharField(source='trader.registered_by.full_name', read_only=True)
    officerSignature = serializers.CharField(source='officer_signature', required=False, allow_blank=True)
    verificationDate = serializers.DateField(source='verification_date', required=False, allow_null=True)

    class Meta:
        model = LegalTrader
        fields = [
            'tradeName', 'ownerFullName', 'tin', 'tradeRegistrationNumber',
            'gender', 'age', 'houseNumberPlotId', 'businessSector',
            'tradeScale', 'businessOwnershipType', 'issuingInstitution',
            'dateOfIssuance', 'dataEnteredBy', 'remarks', 'officerSignature',
            'verificationDate'
        ]

class InformalTraderSerializer(serializers.ModelSerializer):
    fullName = serializers.CharField(source='full_name')
    nationalIdResidentId = serializers.CharField(source='national_id_resident_id', required=False, allow_blank=True)
    phoneNumber = serializers.CharField(source='phone_number', required=False, allow_blank=True)
    specificLocationMarketArea = serializers.CharField(source='specific_location_market_area')
    natureOfTradeActivity = serializers.CharField(source='nature_of_trade_activity')
    estimatedCapitalAssets = serializers.DecimalField(source='estimated_capital_assets', max_digits=14, decimal_places=2)
    reasonForOperatingInformally = serializers.CharField(source='reason_for_operating_informally')
    enumeratorDataCollectorName = serializers.CharField(source='enumerator_data_collector_name', required=False, allow_blank=True)
    dateOfAssessment = serializers.DateField(source='date_of_assessment')
    formalizationStatusRecommendation = serializers.CharField(source='formalization_status_recommendation')

    class Meta:
        model = InformalTrader
        fields = [
            'fullName', 'gender', 'age', 'nationalIdResidentId', 'phoneNumber',
            'specificLocationMarketArea', 'natureOfTradeActivity', 'estimatedCapitalAssets',
            'reasonForOperatingInformally', 'enumeratorDataCollectorName',
            'dateOfAssessment', 'formalizationStatusRecommendation'
        ]

class TraderDetailSerializer(serializers.ModelSerializer):
    traderId = serializers.CharField(source='trader_id', read_only=True)
    traderType = serializers.CharField(source='trader_type')
    status = serializers.CharField()
    woredaId = serializers.IntegerField(source='woreda_id')
    kebeleId = serializers.IntegerField(source='kebele_id')
    woredaName = serializers.CharField(source='woreda.name', read_only=True)
    kebeleName = serializers.CharField(source='kebele.name', read_only=True)
    registeredBy = serializers.CharField(source='registered_by.full_name', read_only=True)
    registeredById = serializers.IntegerField(source='registered_by_id', read_only=True)
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)
    updatedAt = serializers.DateTimeField(source='updated_at', read_only=True)
    verificationNotes = serializers.CharField(source='verification_notes', read_only=True)
    verifiedBy = serializers.CharField(source='verified_by.full_name', read_only=True, allow_null=True)
    assignedTo = serializers.CharField(source='assigned_to.full_name', read_only=True, allow_null=True)
    assignedToId = serializers.IntegerField(source='assigned_to_id', read_only=True, allow_null=True)

    legalDetails = serializers.SerializerMethodField()
    informalDetails = serializers.SerializerMethodField()

    class Meta:
        model = Trader
        fields = [
            'id', 'traderId', 'traderType', 'status',
            'woredaId', 'kebeleId', 'woredaName', 'kebeleName',
            'registeredBy', 'registeredById', 'createdAt', 'updatedAt',
            'verificationNotes', 'verifiedBy', 'assignedTo', 'assignedToId',
            'legalDetails', 'informalDetails'
        ]

    def get_legalDetails(self, obj):
        if obj.trader_type == 'LEGAL' and hasattr(obj, 'legal_details'):
            data = LegalTraderSerializer(obj.legal_details).data
            data['region'] = obj.region.name if obj.region else 'Harari People Regional State'
            data['woredaId'] = obj.woreda_id
            data['kebeleId'] = obj.kebele_id
            return data
        return None

    def get_informalDetails(self, obj):
        if obj.trader_type == 'INFORMAL' and hasattr(obj, 'informal_details'):
            data = InformalTraderSerializer(obj.informal_details).data
            data['region'] = obj.region.name if obj.region else 'Harari People Regional State'
            data['woredaId'] = obj.woreda_id
            data['kebeleId'] = obj.kebele_id
            return data
        return None
