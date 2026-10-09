import uuid
from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from .models import Trader, LegalTrader, InformalTrader
from .serializers import TraderSerializer
from apps.locations.models import Woreda, Kebele
from apps.audit.models import AuditLog
from apps.core.permissions import IsDataEncoder, IsAdministrator

class TraderViewSet(viewsets.ModelViewSet):
    queryset = Trader.objects.select_related(
        'woreda', 'kebele', 'created_by', 'verified_by', 'legal_details', 'informal_details'
    ).all()
    serializer_class = TraderSerializer
    lookup_field = 'trader_id'
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'trader_type', 'woreda', 'kebele']
    search_fields = [
        'trader_id',
        'name',
        'owner_full_name',
        'phone_number',
        'legal_details__tin',
        'legal_details__trade_registration_number',
        'informal_details__national_id_resident_id',
    ]
    ordering_fields = ['created_at', 'status', 'trader_id']

    def generate_trader_id(self):
        last_trader = Trader.objects.order_by('-id').first()
        next_num = (last_trader.id + 1) if last_trader else 1
        return f"HTT-{next_num:06d}"

    @action(detail=False, methods=['post'], url_path='legal')
    def register_legal(self, request):
        data = request.data
        woreda_id = data.get('woredaId') or data.get('woreda')
        kebele_id = data.get('kebeleId') or data.get('kebele')

        try:
            woreda = Woreda.objects.get(id=woreda_id)
            kebele = Kebele.objects.get(id=kebele_id)
        except (Woreda.DoesNotExist, Kebele.DoesNotExist):
            return Response({'detail': 'Invalid Woreda or Kebele ID.'}, status=status.HTTP_400_BAD_REQUEST)

        tin = data.get('tin', '').strip()
        trade_reg = data.get('tradeRegistrationNumber', '').strip()

        if LegalTrader.objects.filter(tin=tin).exists():
            return Response({'detail': 'A trader with this TIN is already registered.'}, status=status.HTTP_400_BAD_REQUEST)
        if LegalTrader.objects.filter(trade_registration_number=trade_reg).exists():
            return Response({'detail': 'A trader with this Registration Number already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            trader = Trader.objects.create(
                trader_id=self.generate_trader_id(),
                trader_type='LEGAL',
                status='SUBMITTED',
                name=data.get('tradeName', ''),
                owner_full_name=data.get('ownerFullName', ''),
                phone_number=data.get('phoneNumber', ''),
                woreda=woreda,
                kebele=kebele,
                specific_location=data.get('houseNumberPlotId', ''),
                created_by=request.user if request.user.is_authenticated else None,
                submitted_at=timezone.now(),
            )

            LegalTrader.objects.create(
                trader=trader,
                tin=tin,
                trade_registration_number=trade_reg,
                gender=data.get('gender', 'MALE'),
                age=int(data.get('age', 30)),
                business_sector=data.get('businessSector', 'GENERAL_TRADE'),
                trade_scale=data.get('tradeScale', 'RETAIL'),
                business_ownership_type=data.get('businessOwnershipType', 'SOLE_PROPRIETORSHIP'),
                issuing_institution=data.get('issuingInstitution', 'Harari Region Trade Bureau'),
                date_of_issuance=data.get('dateOfIssuance', timezone.now().date()),
                house_number_plot_id=data.get('houseNumberPlotId', ''),
                remarks=data.get('remarks', ''),
                officer_signature=data.get('officerSignature', request.user.username if request.user.is_authenticated else ''),
            )

            AuditLog.objects.create(
                action='REGISTER_TRADER',
                trader_id=trader.trader_id,
                details=f"Registered legal trader '{trader.name}' with TIN {tin}",
                user=request.user.username if request.user.is_authenticated else 'system',
            )

        return Response(TraderSerializer(trader).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['post'], url_path='informal')
    def register_informal(self, request):
        data = request.data
        woreda_id = data.get('woredaId') or data.get('woreda')
        kebele_id = data.get('kebeleId') or data.get('kebele')

        try:
            woreda = Woreda.objects.get(id=woreda_id)
            kebele = Kebele.objects.get(id=kebele_id)
        except (Woreda.DoesNotExist, Kebele.DoesNotExist):
            return Response({'detail': 'Invalid Woreda or Kebele ID.'}, status=status.HTTP_400_BAD_REQUEST)

        capital = Decimal(str(data.get('estimatedCapitalAssets', 0)))

        with transaction.atomic():
            trader = Trader.objects.create(
                trader_id=self.generate_trader_id(),
                trader_type='INFORMAL',
                status='SUBMITTED',
                name=data.get('fullName', ''),
                owner_full_name=data.get('fullName', ''),
                phone_number=data.get('phoneNumber', ''),
                woreda=woreda,
                kebele=kebele,
                specific_location=data.get('specificLocationMarketArea', ''),
                created_by=request.user if request.user.is_authenticated else None,
                submitted_at=timezone.now(),
            )

            InformalTrader.objects.create(
                trader=trader,
                national_id_resident_id=data.get('nationalIdResidentId', ''),
                gender=data.get('gender', 'MALE'),
                age=int(data.get('age', 25)),
                specific_location_market_area=data.get('specificLocationMarketArea', ''),
                nature_of_trade_activity=data.get('natureOfTradeActivity', 'STREET_VENDING_OPEN_MARKET'),
                estimated_capital_assets=capital,
                reason_for_operating_informally=data.get('reasonForOperatingInformally', 'LACK_OF_CAPITAL'),
                formalization_status_recommendation=data.get('formalizationStatusRecommendation', 'READY_FOR_TIN_MICRO_ENTERPRISE'),
                enumerator_data_collector_name=data.get('enumeratorDataCollectorName', request.user.username if request.user.is_authenticated else 'Enumerator'),
                date_of_assessment=data.get('dateOfAssessment', timezone.now().date()),
            )

            AuditLog.objects.create(
                action='REGISTER_TRADER',
                trader_id=trader.trader_id,
                details=f"Assessed informal trader '{trader.name}' with estimated capital {capital} ETB",
                user=request.user.username if request.user.is_authenticated else 'system',
            )

        return Response(TraderSerializer(trader).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_record(self, request, trader_id=None):
        trader = self.get_object()
        if trader.status not in ['DRAFT', 'NEEDS_CORRECTION']:
            return Response({'detail': f'Cannot submit record in status {trader.status}'}, status=status.HTTP_400_BAD_REQUEST)

        trader.status = 'SUBMITTED'
        trader.submitted_at = timezone.now()
        trader.save()

        AuditLog.objects.create(
            action='UPDATE_TRADER',
            trader_id=trader.trader_id,
            details=f"Submitted record for verification",
            user=request.user.username if request.user.is_authenticated else 'system',
        )
        return Response(TraderSerializer(trader).data)
