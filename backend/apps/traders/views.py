from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from apps.audit.models import AuditEvent
from apps.locations.models import Region, Woreda, Kebele
from .models import Trader, LegalTrader, InformalTrader, WorkflowStatus, TraderType
from .serializers import TraderDetailSerializer, LegalTraderSerializer, InformalTraderSerializer

class TraderViewSet(viewsets.ModelViewSet):
    queryset = Trader.objects.all().select_related(
        'woreda', 'kebele', 'region', 'registered_by', 'verified_by', 'assigned_to',
        'legal_details', 'informal_details'
    ).order_by('-created_at')
    serializer_class = TraderDetailSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'trader_type', 'woreda', 'kebele']
    search_fields = [
        'trader_id', 'business_name', 'owner_full_name', 'phone_number',
        'legal_details__tin', 'legal_details__trade_registration_number',
        'legal_details__trade_name', 'informal_details__full_name',
        'informal_details__national_id_resident_id'
    ]
    ordering_fields = ['created_at', 'updated_at', 'trader_id', 'status']

    def get_object(self):
        lookup = self.kwargs.get('pk')
        if lookup and str(lookup).startswith('HTT-'):
            return Trader.objects.select_related(
                'woreda', 'kebele', 'region', 'registered_by', 'verified_by', 'assigned_to',
                'legal_details', 'informal_details'
            ).get(trader_id=lookup)
        return super().get_object()

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Operational filtering if requested
        woreda_id = self.request.query_params.get('woredaId')
        if woreda_id:
            qs = qs.filter(woreda_id=woreda_id)
        return qs

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        user = request.user
        data = request.data

        # Determine trader type
        trader_type = data.get('traderType') or data.get('trader_type')
        if not trader_type:
            if 'tin' in data or 'tradeRegistrationNumber' in data:
                trader_type = 'LEGAL'
            else:
                trader_type = 'INFORMAL'

        woreda_id = data.get('woredaId') or data.get('woreda_id')
        kebele_id = data.get('kebeleId') or data.get('kebele_id')

        if not woreda_id or not kebele_id:
            return Response({'success': False, 'error': 'Woreda and Kebele are mandatory'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            woreda = Woreda.objects.get(id=woreda_id)
            kebele = Kebele.objects.get(id=kebele_id)
        except (Woreda.DoesNotExist, Kebele.DoesNotExist):
            return Response({'success': False, 'error': 'Invalid Woreda or Kebele reference'}, status=status.HTTP_400_BAD_REQUEST)

        # Validate that Kebele belongs to the selected Woreda!
        if kebele.woreda_id != woreda.id:
            return Response({
                'success': False,
                'error': f"Kebele '{kebele.name}' does not belong to Woreda '{woreda.name}'"
            }, status=status.HTTP_400_BAD_REQUEST)

        region = woreda.region or Region.objects.first()
        status_val = data.get('status', WorkflowStatus.SUBMITTED)
        if status_val not in [WorkflowStatus.DRAFT, WorkflowStatus.SUBMITTED]:
            status_val = WorkflowStatus.SUBMITTED

        trader_id = Trader.generate_next_trader_id()

        if trader_type == 'LEGAL':
            tin = data.get('tin', '').strip()
            trade_reg = data.get('tradeRegistrationNumber', '').strip()
            trade_name = data.get('tradeName', '').strip()
            owner_name = data.get('ownerFullName', '').strip()

            if not tin or not trade_reg or not trade_name:
                return Response({'success': False, 'error': 'TIN, Registration Number, and Trade Name are required for legal traders'}, status=status.HTTP_400_BAD_REQUEST)

            # Uniqueness validation
            if LegalTrader.objects.filter(tin=tin).exists():
                return Response({'success': False, 'error': f"A legal trader with TIN '{tin}' is already registered"}, status=status.HTTP_400_BAD_REQUEST)
            if LegalTrader.objects.filter(trade_registration_number=trade_reg).exists():
                return Response({'success': False, 'error': f"A legal trader with Registration Number '{trade_reg}' is already registered"}, status=status.HTTP_400_BAD_REQUEST)

            trader = Trader.objects.create(
                trader_id=trader_id,
                trader_type='LEGAL',
                status=status_val,
                business_name=trade_name,
                owner_full_name=owner_name or trade_name,
                phone_number=data.get('phoneNumber', ''),
                region=region,
                woreda=woreda,
                kebele=kebele,
                business_address=data.get('houseNumberPlotId', ''),
                registered_by=user,
                submitted_at=timezone.now() if status_val == WorkflowStatus.SUBMITTED else None
            )

            date_issuance = data.get('dateOfIssuance') or timezone.now().date()
            LegalTrader.objects.create(
                trader=trader,
                trade_name=trade_name,
                owner_full_name=owner_name or trade_name,
                tin=tin,
                trade_registration_number=trade_reg,
                gender=data.get('gender', 'MALE'),
                age=int(data.get('age', 30)),
                house_number_plot_id=data.get('houseNumberPlotId', ''),
                business_sector=data.get('businessSector', 'GENERAL_TRADE'),
                trade_scale=data.get('tradeScale', 'RETAIL'),
                business_ownership_type=data.get('businessOwnershipType', 'SOLE_PROPRIETORSHIP'),
                issuing_institution=data.get('issuingInstitution', 'Harari Trade & Industry Development Agency'),
                date_of_issuance=date_issuance,
                remarks=data.get('remarks', '')
            )

        else: # INFORMAL
            full_name = data.get('fullName', '').strip()
            location = data.get('specificLocationMarketArea', '').strip()

            if not full_name or not location:
                return Response({'success': False, 'error': 'Full Name and Specific Location are required for informal traders'}, status=status.HTTP_400_BAD_REQUEST)

            trader = Trader.objects.create(
                trader_id=trader_id,
                trader_type='INFORMAL',
                status=status_val,
                business_name=f"{full_name} ({location})",
                owner_full_name=full_name,
                phone_number=data.get('phoneNumber', ''),
                region=region,
                woreda=woreda,
                kebele=kebele,
                business_address=location,
                registered_by=user,
                submitted_at=timezone.now() if status_val == WorkflowStatus.SUBMITTED else None
            )

            date_assessment = data.get('dateOfAssessment') or timezone.now().date()
            InformalTrader.objects.create(
                trader=trader,
                full_name=full_name,
                gender=data.get('gender', 'MALE'),
                age=int(data.get('age', 25)),
                national_id_resident_id=data.get('nationalIdResidentId', ''),
                phone_number=data.get('phoneNumber', ''),
                specific_location_market_area=location,
                nature_of_trade_activity=data.get('natureOfTradeActivity', 'PETTY_RETAIL'),
                estimated_capital_assets=data.get('estimatedCapitalAssets', 0.00),
                reason_for_operating_informally=data.get('reasonForOperatingInformally', 'LACK_OF_CAPITAL'),
                enumerator_data_collector_name=data.get('enumeratorDataCollectorName', user.full_name),
                date_of_assessment=date_assessment,
                formalization_status_recommendation=data.get('formalizationStatusRecommendation', 'READY_FOR_TIN_MICRO_ENTERPRISE')
            )

        # Audit event
        AuditEvent.log(
            actor=user,
            action='RECORD_CREATED',
            entity_type='TRADER',
            entity_id=trader.trader_id,
            new_state=trader.status,
            details=f"Registered {trader.trader_type} trader '{trader.business_name}' in Woreda {woreda.name}, Kebele {kebele.name}"
        )

        return Response({
            'success': True,
            'message': f"Trader {trader.trader_id} registered successfully",
            'traderId': trader.trader_id,
            'data': TraderDetailSerializer(trader).data
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        trader = self.get_object()
        if trader.status != WorkflowStatus.DRAFT:
            return Response({'success': False, 'error': f"Only DRAFT records can be submitted. Current status: {trader.status}"}, status=status.HTTP_400_BAD_REQUEST)

        trader.status = WorkflowStatus.SUBMITTED
        trader.submitted_at = timezone.now()
        trader.last_updated_by = request.user
        trader.save()

        AuditEvent.log(
            actor=request.user,
            action='SUBMITTED',
            entity_type='TRADER',
            entity_id=trader.trader_id,
            previous_state='DRAFT',
            new_state='SUBMITTED',
            details=f"Record submitted for verification by {request.user.full_name}"
        )
        return Response({'success': True, 'message': f"Trader {trader.trader_id} submitted for review", 'data': TraderDetailSerializer(trader).data})

    @action(detail=True, methods=['post'])
    def resubmit(self, request, pk=None):
        trader = self.get_object()
        if trader.status != WorkflowStatus.NEEDS_CORRECTION:
            return Response({'success': False, 'error': f"Only records in NEEDS_CORRECTION can be resubmitted. Current: {trader.status}"}, status=status.HTTP_400_BAD_REQUEST)

        trader.status = WorkflowStatus.SUBMITTED
        trader.submitted_at = timezone.now()
        trader.last_updated_by = request.user
        trader.save()

        AuditEvent.log(
            actor=request.user,
            action='RESUBMITTED',
            entity_type='TRADER',
            entity_id=trader.trader_id,
            previous_state='NEEDS_CORRECTION',
            new_state='SUBMITTED',
            details=f"Corrections resolved and resubmitted by {request.user.full_name}"
        )
        return Response({'success': True, 'message': f"Trader {trader.trader_id} resubmitted for review", 'data': TraderDetailSerializer(trader).data})

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        trader = self.get_object()
        events = AuditEvent.objects.filter(entity_type='TRADER', entity_id=trader.trader_id).order_by('-timestamp')
        from apps.audit.serializers import AuditEventSerializer
        return Response({'success': True, 'history': AuditEventSerializer(events, many=True).data})
