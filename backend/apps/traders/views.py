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
from apps.core.permissions import IsDataEncoder, IsAdministrator, IsDirector, IsAgencyLeader, IsTraderReadAllowed

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

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy',
                           'register_legal', 'register_informal', 'update_legal',
                           'update_informal', 'submit_record'):
            classes = [IsDataEncoder]
        else:
            classes = [IsTraderReadAllowed]
        return [cls() for cls in classes]

    def get_queryset(self):
        qs = Trader.objects.select_related(
            'woreda', 'woreda__region', 'kebele', 'created_by', 'verified_by', 'assigned_director',
            'legal_details', 'informal_details'
        ).all()

        params = self.request.query_params

        # Specific IDs list if provided
        ids = params.get('ids')
        if ids:
            id_list = [i.strip() for i in ids.split(',') if i.strip()]
            if id_list:
                qs = qs.filter(trader_id__in=id_list)

        # Region
        region = params.get('region')
        if region and region != 'ALL':
            if str(region).isdigit():
                qs = qs.filter(woreda__region_id=int(region))
            else:
                qs = qs.filter(woreda__region__name__icontains=region)

        # Business Sector
        sector = params.get('sector') or params.get('business_sector')
        if sector and sector != 'ALL':
            qs = qs.filter(legal_details__business_sector=sector)

        # Reviewer / Assigned Director
        reviewer = params.get('reviewer')
        if reviewer and reviewer != 'ALL':
            from django.db.models import Q
            qs = qs.filter(
                Q(verified_by__username__icontains=reviewer) |
                Q(verified_by__full_name__icontains=reviewer) |
                Q(assigned_director__username__icontains=reviewer) |
                Q(assigned_director__full_name__icontains=reviewer)
            )

        user = self.request.user
        if user.is_authenticated:
            if user.role == 'DATA_ENCODER' or user.groups.filter(name='DATA_ENCODER').exists():
                qs = qs.filter(created_by=user)
                if user.assigned_woreda_id:
                    qs = qs.filter(woreda_id=user.assigned_woreda_id)
            elif user.role == 'DIRECTOR' or user.groups.filter(name='DIRECTOR_OF_TRADER_CONTROL').exists():
                if user.assigned_woreda_id:
                    qs = qs.filter(woreda_id=user.assigned_woreda_id)

        return qs

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
            return Response({'detail': 'Invalid Woreda or Kebele ID.', 'code': 'INVALID_LOCATION'}, status=status.HTTP_400_BAD_REQUEST)

        if kebele.woreda_id != woreda.id:
            return Response(
                {'detail': 'Invalid Woreda/Kebele combination: the selected Kebele does not belong to the selected Woreda.', 'code': 'INVALID_WOREDA_KEBELE_COMBINATION'},
                status=status.HTTP_400_BAD_REQUEST
            )

        tin = data.get('tin', '').strip()
        trade_reg = data.get('tradeRegistrationNumber', '').strip()

        if LegalTrader.objects.filter(tin=tin).exists():
            return Response({'detail': 'A trader with this TIN is already registered.', 'code': 'DUPLICATE_TIN'}, status=status.HTTP_400_BAD_REQUEST)
        if LegalTrader.objects.filter(trade_registration_number=trade_reg).exists():
            return Response({'detail': 'A trader with this Registration Number already exists.', 'code': 'DUPLICATE_REGISTRATION_NUMBER'}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            target_status = 'SUBMITTED'
            trader = Trader.objects.create(
                trader_id=self.generate_trader_id(),
                trader_type='LEGAL',
                status=target_status,
                name=data.get('tradeName', ''),
                owner_full_name=data.get('ownerFullName', ''),
                phone_number=data.get('phoneNumber', ''),
                woreda=woreda,
                kebele=kebele,
                specific_location=data.get('houseNumberPlotId', ''),
                created_by=request.user if request.user.is_authenticated else None,
                submitted_at=timezone.now() if target_status == 'SUBMITTED' else None,
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
            return Response({'detail': 'Invalid Woreda or Kebele ID.', 'code': 'INVALID_LOCATION'}, status=status.HTTP_400_BAD_REQUEST)

        if kebele.woreda_id != woreda.id:
            return Response(
                {'detail': 'Invalid Woreda/Kebele combination: the selected Kebele does not belong to the selected Woreda.', 'code': 'INVALID_WOREDA_KEBELE_COMBINATION'},
                status=status.HTTP_400_BAD_REQUEST
            )

        capital = Decimal(str(data.get('estimatedCapitalAssets', 0)))
        target_status = 'SUBMITTED'

        with transaction.atomic():
            trader = Trader.objects.create(
                trader_id=self.generate_trader_id(),
                trader_type='INFORMAL',
                status=target_status,
                name=data.get('fullName', ''),
                owner_full_name=data.get('fullName', ''),
                phone_number=data.get('phoneNumber', ''),
                woreda=woreda,
                kebele=kebele,
                specific_location=data.get('specificLocationMarketArea', ''),
                created_by=request.user if request.user.is_authenticated else None,
                submitted_at=timezone.now() if target_status == 'SUBMITTED' else None,
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

    @action(detail=True, methods=['put', 'patch'], url_path='update-legal')
    def update_legal(self, request, trader_id=None):
        trader = self.get_object()
        if trader.trader_type != 'LEGAL':
            return Response({'detail': 'Not a legal trader.', 'code': 'INVALID_TYPE'}, status=status.HTTP_400_BAD_REQUEST)
        if trader.status not in ('DRAFT', 'NEEDS_CORRECTION', 'RETURNED'):
            return Response({'detail': 'Only draft or returned records may be edited.'}, status=status.HTTP_409_CONFLICT)

        data = request.data
        woreda_id = data.get('woredaId') or data.get('woreda')
        kebele_id = data.get('kebeleId') or data.get('kebele')

        if woreda_id and kebele_id:
            try:
                woreda = Woreda.objects.get(id=woreda_id)
                kebele = Kebele.objects.get(id=kebele_id)
                if kebele.woreda_id != woreda.id:
                    return Response({'detail': 'Invalid Woreda/Kebele combination.', 'code': 'INVALID_WOREDA_KEBELE_COMBINATION'}, status=status.HTTP_400_BAD_REQUEST)
                trader.woreda = woreda
                trader.kebele = kebele
            except (Woreda.DoesNotExist, Kebele.DoesNotExist):
                return Response({'detail': 'Invalid Woreda or Kebele ID.', 'code': 'INVALID_LOCATION'}, status=status.HTTP_400_BAD_REQUEST)

        if 'tradeName' in data:
            trader.name = data['tradeName']
        if 'ownerFullName' in data:
            trader.owner_full_name = data['ownerFullName']
        if 'phoneNumber' in data:
            trader.phone_number = data['phoneNumber']

        trader.save()

        legal = trader.legal_details
        if 'tin' in data:
            legal.tin = data['tin']
        if 'tradeRegistrationNumber' in data:
            legal.trade_registration_number = data['tradeRegistrationNumber']
        if 'businessSector' in data:
            legal.business_sector = data['businessSector']
        if 'tradeScale' in data:
            legal.trade_scale = data['tradeScale']
        if 'businessOwnershipType' in data:
            legal.business_ownership_type = data['businessOwnershipType']
        if 'houseNumberPlotId' in data:
            legal.house_number_plot_id = data['houseNumberPlotId']
        if 'remarks' in data:
            legal.remarks = data['remarks']
        legal.save()

        AuditLog.objects.create(
            action='UPDATE_TRADER',
            trader_id=trader.trader_id,
            details=f"Updated details for legal trader {trader.name}",
            user=request.user.username if request.user.is_authenticated else 'system',
        )

        return Response(TraderSerializer(trader).data)

    @action(detail=True, methods=['put', 'patch'], url_path='update-informal')
    def update_informal(self, request, trader_id=None):
        trader = self.get_object()
        if trader.trader_type != 'INFORMAL':
            return Response({'detail': 'Not an informal trader.', 'code': 'INVALID_TYPE'}, status=status.HTTP_400_BAD_REQUEST)
        if trader.status not in ('DRAFT', 'NEEDS_CORRECTION', 'RETURNED'):
            return Response({'detail': 'Only draft or returned records may be edited.'}, status=status.HTTP_409_CONFLICT)

        data = request.data
        woreda_id = data.get('woredaId') or data.get('woreda')
        kebele_id = data.get('kebeleId') or data.get('kebele')

        if woreda_id and kebele_id:
            try:
                woreda = Woreda.objects.get(id=woreda_id)
                kebele = Kebele.objects.get(id=kebele_id)
                if kebele.woreda_id != woreda.id:
                    return Response({'detail': 'Invalid Woreda/Kebele combination.', 'code': 'INVALID_WOREDA_KEBELE_COMBINATION'}, status=status.HTTP_400_BAD_REQUEST)
                trader.woreda = woreda
                trader.kebele = kebele
            except (Woreda.DoesNotExist, Kebele.DoesNotExist):
                return Response({'detail': 'Invalid Woreda or Kebele ID.', 'code': 'INVALID_LOCATION'}, status=status.HTTP_400_BAD_REQUEST)

        if 'fullName' in data:
            trader.name = data['fullName']
            trader.owner_full_name = data['fullName']
        if 'phoneNumber' in data:
            trader.phone_number = data['phoneNumber']

        trader.save()

        informal = trader.informal_details
        if 'nationalIdResidentId' in data:
            informal.national_id_resident_id = data['nationalIdResidentId']
        if 'natureOfTradeActivity' in data:
            informal.nature_of_trade_activity = data['natureOfTradeActivity']
        if 'estimatedCapitalAssets' in data:
            informal.estimated_capital_assets = Decimal(str(data['estimatedCapitalAssets']))
        if 'reasonForOperatingInformally' in data:
            informal.reason_for_operating_informally = data['reasonForOperatingInformally']
        if 'formalizationStatusRecommendation' in data:
            informal.formalization_status_recommendation = data['formalizationStatusRecommendation']
        if 'specificLocationMarketArea' in data:
            informal.specific_location_market_area = data['specificLocationMarketArea']
        informal.save()

        AuditLog.objects.create(
            action='UPDATE_TRADER',
            trader_id=trader.trader_id,
            details=f"Updated details for informal trader {trader.name}",
            user=request.user.username if request.user.is_authenticated else 'system',
        )

        return Response(TraderSerializer(trader).data)

    def destroy(self, request, *args, **kwargs):
        trader = self.get_object()
        if trader.created_by_id != request.user.id:
            return Response({'detail': 'You may only archive records you created.'},
                            status=status.HTTP_403_FORBIDDEN)
        if trader.status not in ('DRAFT', 'NEEDS_CORRECTION', 'RETURNED'):
            return Response({'detail': 'Submitted or finalized records cannot be archived through delete.'},
                            status=status.HTTP_409_CONFLICT)
        with transaction.atomic():
            trader.status = 'ARCHIVED'
            trader.save(update_fields=['status', 'updated_at'] if hasattr(trader, 'updated_at') else ['status'])
            AuditLog.objects.create(
                action='ARCHIVE_TRADER',
                trader_id=trader.trader_id,
                details=f"Archived trader '{trader.name}' ({trader.trader_type}); record retained for audit.",
                user=request.user.username,
            )
        return Response(TraderSerializer(trader).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='submit')
    def submit_record(self, request, trader_id=None):
        trader = self.get_object()
        if trader.status not in ['DRAFT', 'NEEDS_CORRECTION', 'RETURNED']:
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
