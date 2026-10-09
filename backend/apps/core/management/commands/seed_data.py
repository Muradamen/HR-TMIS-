import os
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from django.utils import timezone
from apps.accounts.models import User
from apps.locations.models import Region, Woreda, Kebele
from apps.traders.models import Trader, LegalTrader, InformalTrader, WorkflowStatus, TraderType
from apps.formalization.models import FormalizationRecord, FormalizationStatus
from apps.audit.models import AuditEvent

class Command(BaseCommand):
    help = 'Seeds Harari Region administrative locations, authorized role users, and sample traders'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting HT-TMIS idempotent database seeding...'))

        # 1. Create Groups
        groups = ['DATA_ENCODER', 'DIRECTOR_OF_TRADER_CONTROL', 'ADMINISTRATOR', 'AGENCY_LEADER']
        for g in groups:
            Group.objects.get_or_create(name=g)

        # 2. Region
        region, _ = Region.objects.get_or_create(
            code='HR',
            defaults={'name': 'Harari People Regional State', 'is_active': True}
        )

        # 3. 9 Official Woredas
        woreda_data = [
            ('Amir Nur', 'AN-01'),
            ('Abadir', 'AB-02'),
            ('Shenkor', 'SH-03'),
            ("Jin'Eala", 'JN-04'),
            ('Aboker', 'AK-05'),
            ('Hakim', 'HK-06'),
            ('Sofi', 'SF-07'),
            ('Erer', 'ER-08'),
            ('Dire Teyyara', 'DT-09'),
        ]

        woredas = {}
        for name, code in woreda_data:
            w, _ = Woreda.objects.get_or_create(
                region=region,
                name=name,
                defaults={'code': code, 'is_active': True}
            )
            woredas[name] = w

        # 4. Kebeles
        kebele_data = [
            # Amir Nur
            ('Amir Nur', 'Kebele 01 (Jugol Central)', 'AN-K01'),
            ('Amir Nur', 'Kebele 02 (Medhane Alem)', 'AN-K02'),
            ('Amir Nur', 'Kebele 03 (Feres Magala)', 'AN-K03'),
            # Abadir
            ('Abadir', 'Kebele 01 (Shoa Gate)', 'AB-K01'),
            ('Abadir', 'Kebele 02 (Buda Gate)', 'AB-K02'),
            ('Abadir', 'Kebele 03 (Erer Gate)', 'AB-K03'),
            # Shenkor
            ('Shenkor', 'Kebele 01 (Ras Hotel Area)', 'SH-K01'),
            ('Shenkor', 'Kebele 02 (Gidr Magala)', 'SH-K02'),
            ('Shenkor', 'Kebele 03 (Cinema Area)', 'SH-K03'),
            # Jin'Eala
            ("Jin'Eala", 'Kebele 01 (Sanga Ber)', 'JN-K01'),
            ("Jin'Eala", 'Kebele 02 (Arategna)', 'JN-K02'),
            # Aboker
            ('Aboker', 'Kebele 01 (Jegol Old Town)', 'AK-K01'),
            ('Aboker', 'Kebele 02 (Nursery Area)', 'AK-K02'),
            # Hakim
            ('Hakim', 'Kebele 01 (Hakim Gara)', 'HK-K01'),
            ('Hakim', 'Kebele 02 (Aboker Stadium)', 'HK-K02'),
            # Sofi
            ('Sofi', 'Sofi Rural Center', 'SF-K01'),
            ('Sofi', 'Genda-Kore Kebele', 'SF-K02'),
            # Erer
            ('Erer', 'Erer Wolia Kebele', 'ER-K01'),
            ('Erer', 'Erer Dodota Kebele', 'ER-K02'),
            # Dire Teyyara
            ('Dire Teyyara', 'Dire Teyyara Central', 'DT-K01'),
            ('Dire Teyyara', 'Hasengey Kebele', 'DT-K02'),
        ]

        kebeles = {}
        for w_name, k_name, k_code in kebele_data:
            w = woredas[w_name]
            k, _ = Kebele.objects.get_or_create(
                woreda=w,
                name=k_name,
                defaults={'code': k_code, 'is_active': True}
            )
            kebeles[k_name] = k

        # 5. Users
        user_specs = [
            {
                'username': 'murad.amen',
                'email': 'murad.amen@harari.gov.et',
                'full_name': 'Murad Amen',
                'role': 'DATA_ENCODER',
                'department': 'Trader Registration & Records Unit',
            },
            {
                'username': 'dr.ahmed.hassen',
                'email': 'ahmed.hassen@harari.gov.et',
                'full_name': 'Dr. Ahmed Hassen',
                'role': 'DIRECTOR_OF_TRADER_CONTROL',
                'department': 'Directorate of Trader Control & Formalization',
            },
            {
                'username': 'fatuma.ali',
                'email': 'fatuma.ali@harari.gov.et',
                'full_name': 'Fatuma Ali',
                'role': 'AGENCY_LEADER',
                'department': 'Harari Trade & Industry Development Agency',
            },
            {
                'username': 'admin',
                'email': 'admin@harari.gov.et',
                'full_name': 'System Administrator',
                'role': 'ADMINISTRATOR',
                'department': 'Information Technology Directorate',
                'is_staff': True,
                'is_superuser': True,
            },
        ]

        users = {}
        for u_spec in user_specs:
            uname = u_spec['username']
            u, created = User.objects.get_or_create(
                username=uname,
                defaults={
                    'email': u_spec['email'],
                    'full_name': u_spec['full_name'],
                    'role': u_spec['role'],
                    'department': u_spec['department'],
                    'is_staff': u_spec.get('is_staff', False),
                    'is_superuser': u_spec.get('is_superuser', False),
                }
            )
            # Ensure password is set to password123
            u.set_password('password123')
            u.role = u_spec['role']
            u.full_name = u_spec['full_name']
            u.save()
            users[uname] = u

        # 6. Sample Traders
        encoder = users['murad.amen']
        director = users['dr.ahmed.hassen']

        # Sample Legal Trader 1 (Approved)
        w_amir = woredas['Amir Nur']
        k_jugol = kebeles['Kebele 01 (Jugol Central)']
        t1, created1 = Trader.objects.get_or_create(
            trader_id='HTT-000001',
            defaults={
                'trader_type': 'LEGAL',
                'status': WorkflowStatus.APPROVED,
                'business_name': 'Harar Coffee Roasting & Export Enterprise',
                'owner_full_name': 'Abdulmalik Umer',
                'phone_number': '+251915001122',
                'region': region,
                'woreda': w_amir,
                'kebele': k_jugol,
                'business_address': 'Jugol H.No 245/B',
                'registered_by': encoder,
                'verified_by': director,
                'verified_at': timezone.now(),
                'verification_notes': 'Valid tax clearance and standard premises inspection verified.',
            }
        )
        if created1:
            LegalTrader.objects.get_or_create(
                trader=t1,
                defaults={
                    'trade_name': 'Harar Coffee Roasting & Export Enterprise',
                    'owner_full_name': 'Abdulmalik Umer',
                    'tin': '0012345678',
                    'trade_registration_number': 'HR/REG/2024/0089',
                    'gender': 'MALE',
                    'age': 38,
                    'house_number_plot_id': 'Jugol H.No 245/B',
                    'business_sector': 'AGRICULTURE_AGRO_PROCESSING',
                    'trade_scale': 'WHOLESALE',
                    'business_ownership_type': 'PLC',
                    'issuing_institution': 'Harari Trade & Industry Development Agency',
                    'date_of_issuance': '2024-03-15',
                    'officer_signature': director.full_name,
                    'verification_date': timezone.now().date(),
                }
            )
            AuditEvent.log(
                actor=director,
                action='APPROVED',
                entity_type='TRADER',
                entity_id='HTT-000001',
                details='Approved initial coffee roasting business registration'
            )

        # Sample Informal Trader 2 (Pending/Submitted)
        w_shenkor = woredas['Shenkor']
        k_ras = kebeles['Kebele 01 (Ras Hotel Area)']
        t2, created2 = Trader.objects.get_or_create(
            trader_id='HTT-000002',
            defaults={
                'trader_type': 'INFORMAL',
                'status': WorkflowStatus.SUBMITTED,
                'business_name': 'Zeyneba Mohammed (Near Ras Hotel Gate)',
                'owner_full_name': 'Zeyneba Mohammed',
                'phone_number': '+251915443322',
                'region': region,
                'woreda': w_shenkor,
                'kebele': k_ras,
                'business_address': 'Near Ras Hotel Gate',
                'registered_by': encoder,
                'submitted_at': timezone.now(),
            }
        )
        if created2:
            InformalTrader.objects.get_or_create(
                trader=t2,
                defaults={
                    'full_name': 'Zeyneba Mohammed',
                    'gender': 'FEMALE',
                    'age': 28,
                    'national_id_resident_id': 'ET-HR-2023-88741',
                    'phone_number': '+251915443322',
                    'specific_location_market_area': 'Near Ras Hotel Gate',
                    'nature_of_trade_activity': 'PETTY_RETAIL',
                    'estimated_capital_assets': 24500.00,
                    'reason_for_operating_informally': 'LACK_OF_CAPITAL',
                    'enumerator_data_collector_name': encoder.full_name,
                    'date_of_assessment': '2026-02-10',
                    'formalization_status_recommendation': 'READY_FOR_TIN_MICRO_ENTERPRISE',
                }
            )
            FormalizationRecord.objects.get_or_create(
                trader=t2,
                defaults={
                    'status': FormalizationStatus.READY_FOR_FORMALIZATION,
                    'assessment_date': '2026-02-10',
                    'assessing_officer': encoder,
                    'readiness_assessment': 'Possesses steady petty retail cashflow. Candidate for micro-enterprise licensing.',
                    'recommended_support': 'Microfinance capital linkage and bookkeeping orientation.'
                }
            )
            AuditEvent.log(
                actor=encoder,
                action='SUBMITTED',
                entity_type='TRADER',
                entity_id='HTT-000002',
                details='Submitted informal trader record for directorate review'
            )

        # Sample Legal Trader 3 (Needs Correction)
        w_abadir = woredas['Abadir']
        k_shoa = kebeles['Kebele 01 (Shoa Gate)']
        t3, created3 = Trader.objects.get_or_create(
            trader_id='HTT-000003',
            defaults={
                'trader_type': 'LEGAL',
                'status': WorkflowStatus.NEEDS_CORRECTION,
                'business_name': 'Shoa Gate Spices & Traditional Goods',
                'owner_full_name': 'Mekonnen Wolde',
                'phone_number': '+251922778899',
                'region': region,
                'woreda': w_abadir,
                'kebele': k_shoa,
                'business_address': 'Shoa Gate Market St. #12',
                'registered_by': encoder,
                'verified_by': director,
                'verification_notes': 'Please upload clear landlord lease agreement or certified ownership deed for plot #12.',
            }
        )
        if created3:
            LegalTrader.objects.get_or_create(
                trader=t3,
                defaults={
                    'trade_name': 'Shoa Gate Spices & Traditional Goods',
                    'owner_full_name': 'Mekonnen Wolde',
                    'tin': '0098765432',
                    'trade_registration_number': 'HR/REG/2025/1102',
                    'gender': 'MALE',
                    'age': 44,
                    'house_number_plot_id': 'Shoa Gate Market St. #12',
                    'business_sector': 'RETAIL_WHOLESALE_GOODS',
                    'trade_scale': 'RETAIL',
                    'business_ownership_type': 'SOLE_PROPRIETORSHIP',
                    'issuing_institution': 'Harari Trade & Industry Development Agency',
                    'date_of_issuance': '2025-08-20',
                    'remarks': 'Awaiting lease document revision.',
                }
            )
            AuditEvent.log(
                actor=director,
                action='RETURNED_FOR_CORRECTION',
                entity_type='TRADER',
                entity_id='HTT-000003',
                reason='Please upload clear landlord lease agreement or certified ownership deed for plot #12.',
                details='Returned to encoder for document verification'
            )

        self.stdout.write(self.style.SUCCESS('Successfully seeded HT-TMIS database with 9 Woredas, Kebeles, Users, and Traders!'))
