from datetime import date
from decimal import Decimal
from django.test import TestCase, Client
from django.urls import reverse
from django.core.exceptions import PermissionDenied, ValidationError

from apps.accounts.models import User
from apps.locations.models import Woreda, Kebele
from apps.traders.models import Trader, LegalTrader, InformalTrader
from apps.traders.services import (
    generate_next_trader_code,
    execute_workflow_transition,
    export_traders_to_excel,
    export_trader_certificate_pdf,
)

class TraderWorkflowAndSecurityTests(TestCase):
    def setUp(self):
        self.woreda1 = Woreda.objects.create(name='Amir Nur', code='AN')
        self.kebele1 = Kebele.objects.create(woreda=self.woreda1, name='Kebele 01', code='AN-01')

        self.woreda2 = Woreda.objects.create(name='Abadir', code='AB')
        self.kebele2 = Kebele.objects.create(woreda=self.woreda2, name='Kebele 02', code='AB-02')

        self.encoder = User.objects.create_user(
            username='encoder_user',
            password='password123',
            role=User.Role.DATA_ENCODER,
        )
        self.director = User.objects.create_user(
            username='director_user',
            password='password123',
            role=User.Role.DIRECTOR_OF_TRADER_CONTROL,
        )
        self.admin = User.objects.create_user(
            username='admin_user',
            password='password123',
            role=User.Role.ADMINISTRATOR,
            is_superuser=True,
        )
        self.leader = User.objects.create_user(
            username='leader_user',
            password='password123',
            role=User.Role.AGENCY_LEADER,
        )

    def test_trader_code_format(self):
        code = generate_next_trader_code()
        self.assertTrue(code.startswith('HT-'))
        parts = code.split('-')
        self.assertEqual(len(parts), 3)
        self.assertEqual(len(parts[2]), 6)

    def test_workflow_state_machine_happy_path(self):
        trader = Trader.objects.create(
            trader_code='HT-2026-990001',
            trader_type=Trader.TraderType.LEGAL,
            status=Trader.Status.DRAFT,
            registered_by=self.encoder,
        )
        # 1. Encoder submits draft
        execute_workflow_transition(trader, Trader.Status.SUBMITTED, self.encoder)
        self.assertEqual(trader.status, Trader.Status.SUBMITTED)
        self.assertIsNotNone(trader.submitted_at)

        # 2. Director reviews
        execute_workflow_transition(trader, Trader.Status.UNDER_REVIEW, self.director)
        self.assertEqual(trader.status, Trader.Status.UNDER_REVIEW)
        self.assertEqual(trader.reviewed_by, self.director)

        # 3. Director approves
        execute_workflow_transition(trader, Trader.Status.APPROVED, self.director)
        self.assertEqual(trader.status, Trader.Status.APPROVED)
        self.assertEqual(trader.verified_by, self.director)
        self.assertIsNotNone(trader.verified_at)

    def test_self_approval_prevention_raises_permission_denied(self):
        """CRITICAL: A user cannot approve a record they registered themselves."""
        # Director registers a trader
        trader = Trader.objects.create(
            trader_code='HT-2026-990002',
            trader_type=Trader.TraderType.LEGAL,
            status=Trader.Status.UNDER_REVIEW,
            registered_by=self.director,
        )
        # Attempting self-approval MUST raise PermissionDenied
        with self.assertRaises(PermissionDenied):
            execute_workflow_transition(trader, Trader.Status.APPROVED, self.director)

    def test_disallowed_role_transitions(self):
        trader = Trader.objects.create(
            trader_code='HT-2026-990003',
            trader_type=Trader.TraderType.INFORMAL,
            status=Trader.Status.SUBMITTED,
            registered_by=self.encoder,
        )
        # Data encoder cannot approve records
        with self.assertRaises(PermissionDenied):
            execute_workflow_transition(trader, Trader.Status.APPROVED, self.encoder)

        # Agency leader has read-only analytics view and cannot approve records
        with self.assertRaises(PermissionDenied):
            execute_workflow_transition(trader, Trader.Status.APPROVED, self.leader)

    def test_invalid_state_transition(self):
        trader = Trader.objects.create(
            trader_code='HT-2026-990004',
            trader_type=Trader.TraderType.LEGAL,
            status=Trader.Status.DRAFT,
            registered_by=self.encoder,
        )
        # Cannot jump straight from DRAFT to APPROVED
        with self.assertRaises(ValidationError):
            execute_workflow_transition(trader, Trader.Status.APPROVED, self.director)

    def test_excel_export(self):
        trader = Trader.objects.create(
            trader_code='HT-2026-990005',
            trader_type=Trader.TraderType.LEGAL,
            status=Trader.Status.APPROVED,
            registered_by=self.encoder,
        )
        LegalTrader.objects.create(
            trader=trader,
            trade_name='Export Test PLC',
            owner_full_name='Test Owner',
            tin='0011223344',
            trade_registration_number='HR-TR-9901',
            gender='MALE',
            age=30,
            woreda=self.woreda1,
            kebele=self.kebele1,
            business_sector='GENERAL_TRADE',
            trade_scale='RETAIL',
            business_ownership_type='PLC',
            issuing_institution='Harari Trade Bureau',
            date_of_issuance=date(2026, 1, 1),
        )
        response = export_traders_to_excel(Trader.objects.filter(id=trader.id))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        )

    def test_pdf_certificate_export(self):
        trader = Trader.objects.create(
            trader_code='HT-2026-990006',
            trader_type=Trader.TraderType.INFORMAL,
            status=Trader.Status.APPROVED,
            registered_by=self.encoder,
            verified_by=self.director,
        )
        InformalTrader.objects.create(
            trader=trader,
            full_name='Amina Mohammed',
            gender='FEMALE',
            age=27,
            phone_number='+251911223344',
            woreda=self.woreda1,
            kebele=self.kebele1,
            specific_location_market_area='Jugol Market',
            nature_of_trade_activity='PETTY_RETAIL',
            estimated_capital_assets=Decimal('25000.00'),
            reason_for_operating_informally='LACK_OF_CAPITAL',
            date_of_assessment=date(2026, 2, 1),
            formalization_status_recommendation='READY_FOR_TIN_MICRO_ENTERPRISE',
        )
        response = export_trader_certificate_pdf(trader)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'application/pdf')
