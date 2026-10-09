import io
from decimal import Decimal
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from apps.accounts.models import User
from apps.locations.models import Region, Woreda, Kebele
from apps.traders.models import Trader, LegalTrader, InformalTrader
from apps.formalization.models import FormalizationAssessment
from apps.audit.models import AuditLog


class HTTMISIntegrationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create Region, Woredas, and Kebeles
        self.region = Region.objects.create(name='Harari Region', code='HR-01')
        self.woreda_an = Woreda.objects.create(name='Amir Nur', code='AN-01', region=self.region)
        self.kebele_an1 = Kebele.objects.create(name='Kebele 01 (Jenila)', code='AN-K01', woreda=self.woreda_an)

        self.woreda_ab = Woreda.objects.create(name='Abadir', code='AB-02', region=self.region)
        self.kebele_ab4 = Kebele.objects.create(name='Kebele 04 (Gedir Shingir)', code='AB-K04', woreda=self.woreda_ab)

        # Users
        self.encoder = User.objects.create_user(
            username='encoder1',
            password='password123',
            full_name='Abebe Data Encoder',
            role='DATA_ENCODER'
        )
        self.director = User.objects.create_user(
            username='director1',
            password='password123',
            full_name='Dr. Kebede Director',
            role='DIRECTOR'
        )
        self.admin = User.objects.create_user(
            username='admin1',
            password='password123',
            full_name='System Admin',
            role='SYSTEM_ADMINISTRATOR',
            is_staff=True
        )

    def test_woreda_kebele_mismatch_rejected(self):
        """Woreda and Kebele relationships must be validated server-side."""
        self.client.force_authenticate(user=self.encoder)

        # Mismatch: Kebele from Abadir passed with Amir Nur woreda ID
        payload = {
            'tradeName': 'Invalid Location Cafe',
            'ownerFullName': 'Test Owner',
            'phoneNumber': '+251911000000',
            'tin': '9988776655',
            'tradeRegistrationNumber': 'HR-TR-TEST-001',
            'woredaId': self.woreda_an.id,
            'kebeleId': self.kebele_ab4.id, # Kebele from Abadir!
            'gender': 'MALE',
            'age': 30,
            'businessSector': 'GENERAL_TRADE',
            'tradeScale': 'RETAIL',
            'businessOwnershipType': 'SOLE_PROPRIETORSHIP',
            'issuingInstitution': 'Harari Trade Bureau',
            'dateOfIssuance': '2024-01-01',
        }
        res = self.client.post('/api/v1/traders/legal/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res.data.get('code'), 'INVALID_WOREDA_KEBELE_COMBINATION')

    def test_legal_trader_registration_and_duplicate_tin_rejection(self):
        """Register legal trader, then verify duplicate TIN is rejected."""
        self.client.force_authenticate(user=self.encoder)

        payload = {
            'tradeName': 'Harar Spice PLC',
            'ownerFullName': 'Dawit Spice',
            'phoneNumber': '+251911223344',
            'tin': '1122334455',
            'tradeRegistrationNumber': 'HR-TR-2026-SPICE',
            'woredaId': self.woreda_an.id,
            'kebeleId': self.kebele_an1.id,
            'gender': 'MALE',
            'age': 40,
            'businessSector': 'AGRICULTURE_AGRO_PROCESSING',
            'tradeScale': 'WHOLESALE',
            'businessOwnershipType': 'PLC',
            'issuingInstitution': 'Harari Trade Bureau',
            'dateOfIssuance': '2025-05-10',
        }
        res = self.client.post('/api/v1/traders/legal/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['traderType'], 'LEGAL')
        trader_id = res.data['traderId']

        # Attempt duplicate TIN
        res_dup = self.client.post('/api/v1/traders/legal/', payload, format='json')
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(res_dup.data.get('code'), 'DUPLICATE_TIN')

    def test_informal_trader_registration_and_formalization(self):
        """Register informal trader and verify formalization remains separate."""
        self.client.force_authenticate(user=self.encoder)

        payload = {
            'fullName': 'Chaltu Gemechu',
            'phoneNumber': '+251933445566',
            'nationalIdResidentId': 'ET-HR-CHALTU-01',
            'woredaId': self.woreda_ab.id,
            'kebeleId': self.kebele_ab4.id,
            'specificLocationMarketArea': 'Gedir Shingir Market',
            'gender': 'FEMALE',
            'age': 29,
            'natureOfTradeActivity': 'STREET_VENDING_OPEN_MARKET',
            'estimatedCapitalAssets': 15000.0,
            'reasonForOperatingInformally': 'LACK_OF_CAPITAL',
            'formalizationStatusRecommendation': 'READY_FOR_TIN_MICRO_ENTERPRISE',
            'enumeratorDataCollectorName': 'Abebe Data Encoder',
            'dateOfAssessment': '2026-10-08',
        }
        res = self.client.post('/api/v1/traders/informal/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(res.data['traderType'], 'INFORMAL')
        trader_id = res.data['traderId']

        # Director approves registration
        self.client.force_authenticate(user=self.director)
        dec_res = self.client.post(
            f'/api/v1/verification/{trader_id}/decision/',
            {'status': 'APPROVED', 'notes': 'Field assessment confirmed'},
            format='json'
        )
        self.assertEqual(dec_res.status_code, status.HTTP_200_OK)

        # Ensure approved informal trader is STILL an informal trader (not converted to legal)
        trader = Trader.objects.get(trader_id=trader_id)
        self.assertEqual(trader.status, 'APPROVED')
        self.assertEqual(trader.trader_type, 'INFORMAL')

        # Assess formalization separately
        form_res = self.client.post(
            '/api/v1/formalization/assess/',
            {'trader_id': trader_id, 'status': 'READY_FOR_FORMALIZATION', 'support_package': 'Market stall grant'},
            format='json'
        )
        self.assertEqual(form_res.status_code, status.HTTP_200_OK)
        self.assertEqual(form_res.data['status'], 'READY_FOR_FORMALIZATION')

    def test_director_cannot_approve_own_submission(self):
        """Conflict of interest guard: Director cannot approve record they submitted."""
        # Director creates a submission
        trader = Trader.objects.create(
            trader_id='HTT-SELF-01',
            trader_type='LEGAL',
            status='SUBMITTED',
            name='Director Own Venture',
            owner_full_name='Dr. Kebede Director',
            woreda=self.woreda_an,
            kebele=self.kebele_an1,
            created_by=self.director,
        )
        LegalTrader.objects.create(
            trader=trader,
            tin='9999999999',
            trade_registration_number='HR-DIR-001',
            date_of_issuance='2025-01-01',
        )

        self.client.force_authenticate(user=self.director)
        res = self.client.post(
            f'/api/v1/verification/{trader.trader_id}/decision/',
            {'status': 'APPROVED', 'notes': 'Self approving'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('Conflict of interest', res.data.get('detail', ''))

    def test_admin_cannot_approve_trader(self):
        """Administrator cannot approve operational records without explicit Director role."""
        trader = Trader.objects.create(
            trader_id='HTT-TEST-ADMIN-01',
            trader_type='LEGAL',
            status='SUBMITTED',
            name='Test Trader',
            owner_full_name='Test Owner',
            woreda=self.woreda_an,
            kebele=self.kebele_an1,
            created_by=self.encoder,
        )

        self.client.force_authenticate(user=self.admin)
        res = self.client.post(
            f'/api/v1/verification/{trader.trader_id}/decision/',
            {'status': 'APPROVED', 'notes': 'Admin trying to approve'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)

    def test_rejection_requires_mandatory_reason(self):
        """Rejection or return requires a mandatory explanatory reason."""
        trader = Trader.objects.create(
            trader_id='HTT-TEST-REJ-01',
            trader_type='LEGAL',
            status='SUBMITTED',
            name='Test Trader Rej',
            owner_full_name='Test Owner',
            woreda=self.woreda_an,
            kebele=self.kebele_an1,
            created_by=self.encoder,
        )

        self.client.force_authenticate(user=self.director)
        # Attempt rejection without reason
        res = self.client.post(
            f'/api/v1/verification/{trader.trader_id}/decision/',
            {'status': 'REJECTED', 'notes': ''},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_multilingual_csv_export(self):
        """CSV export supports en, om, am with UTF-8 BOM."""
        self.client.force_authenticate(user=self.encoder)

        for lang in ['en', 'om', 'am']:
            res = self.client.get(f'/api/v1/reports/export/csv/?lang={lang}')
            self.assertEqual(res.status_code, status.HTTP_200_OK)
            self.assertTrue(res.content.startswith(b'\xef\xbb\xbf')) # UTF-8 BOM

    def test_excel_export(self):
        """Excel export generates valid XLSX file."""
        self.client.force_authenticate(user=self.encoder)
        res = self.client.get('/api/v1/reports/export/excel/?lang=en')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertEqual(
            res['Content-Type'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    def test_pdf_certificate_generation_and_unapproved_block(self):
        """Approved legal trader can generate PDF certificate; unapproved cannot."""
        # Unapproved
        trader_unapp = Trader.objects.create(
            trader_id='HTT-UNAPP-01',
            trader_type='LEGAL',
            status='SUBMITTED',
            name='Unapproved Co',
            owner_full_name='Unapproved Owner',
            woreda=self.woreda_an,
            kebele=self.kebele_an1,
        )
        LegalTrader.objects.create(
            trader=trader_unapp,
            tin='1234567890',
            trade_registration_number='HR-UNAPP-01',
            date_of_issuance='2025-01-01',
        )

        self.client.force_authenticate(user=self.director)
        res_fail = self.client.get(f'/api/v1/reports/certificate/{trader_unapp.trader_id}/pdf/')
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)

        # Approved
        trader_unapp.status = 'APPROVED'
        trader_unapp.save()

        res_ok = self.client.get(f'/api/v1/reports/certificate/{trader_unapp.trader_id}/pdf/?lang=am')
        self.assertEqual(res_ok.status_code, status.HTTP_200_OK)
        self.assertEqual(res_ok['Content-Type'], 'application/pdf')
        self.assertTrue(res_ok.content.startswith(b'%PDF'))
