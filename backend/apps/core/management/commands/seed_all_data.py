import os
from decimal import Decimal
from datetime import date
from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from django.utils import timezone

from apps.accounts.models import User
from apps.locations.models import Region, Woreda, Kebele
from apps.traders.models import Trader, LegalTrader, InformalTrader
from apps.formalization.models import FormalizationAssessment
from apps.verification.models import VerificationLog
from apps.audit.models import AuditLog


class Command(BaseCommand):
    help = 'Seeds all users, groups, locations, traders, and audit logs into the database.'

    def handle(self, *args, **options):
        self.stdout.write("Seeding groups and permissions...")
        groups = {
            'DATA_ENCODER': Group.objects.get_or_create(name='DATA_ENCODER')[0],
            'DIRECTOR_OF_TRADER_CONTROL': Group.objects.get_or_create(name='DIRECTOR_OF_TRADER_CONTROL')[0],
            'AGENCY_LEADER': Group.objects.get_or_create(name='AGENCY_LEADER')[0],
            'ADMINISTRATOR': Group.objects.get_or_create(name='ADMINISTRATOR')[0],
        }

        self.stdout.write("Seeding users...")
        users_data = [
            {
                'username': 'murad.amen',
                'full_name': 'Murad Amen',
                'email': 'murad.amen@harari.gov.et',
                'role': 'DATA_ENCODER',
                'department': 'Trader Registration & Records Unit',
                'group': groups['DATA_ENCODER'],
            },
            {
                'username': 'dr.ahmed.hassen',
                'full_name': 'Dr. Ahmed Hassen',
                'email': 'ahmed.hassen@harari.gov.et',
                'role': 'DIRECTOR',
                'department': 'Directorate of Trader Control & Formalization',
                'group': groups['DIRECTOR_OF_TRADER_CONTROL'],
            },
            {
                'username': 'fatuma.ali',
                'full_name': 'Fatuma Ali',
                'email': 'fatuma.ali@harari.gov.et',
                'role': 'AGENCY_LEADER',
                'department': 'Harari Trade & Industry Development Agency',
                'group': groups['AGENCY_LEADER'],
            },
            {
                'username': 'admin',
                'full_name': 'System Administrator',
                'email': 'admin@harari.gov.et',
                'role': 'SYSTEM_ADMINISTRATOR',
                'department': 'Information Technology Directorate',
                'is_staff': True,
                'is_superuser': True,
                'group': groups['ADMINISTRATOR'],
            },
        ]

        created_users = {}
        for ud in users_data:
            user, created = User.objects.get_or_create(
                username=ud['username'],
                defaults={
                    'full_name': ud['full_name'],
                    'email': ud['email'],
                    'role': ud['role'],
                    'department': ud['department'],
                    'is_staff': ud.get('is_staff', False),
                    'is_superuser': ud.get('is_superuser', False),
                }
            )
            user.set_password('password123')
            user.groups.add(ud['group'])
            user.save()
            created_users[ud['username']] = user

        self.stdout.write("Seeding locations...")
        region, _ = Region.objects.get_or_create(name='Harari Region', defaults={'code': 'HR-01'})

        woredas_data = [
            ('Amir Nur', 'AN-01', [('Kebele 01 (Jenila)', 'AN-K01'), ('Kebele 02 (Deker)', 'AN-K02'), ('Kebele 03 (Suktat)', 'AN-K03')]),
            ('Abadir', 'AB-02', [('Kebele 04 (Gedir Shingir)', 'AB-K04'), ('Kebele 05 (Feres Magala)', 'AB-K05')]),
            ('Shenkor', 'SH-03', [('Kebele 06 (Shenkor Center)', 'SH-K06'), ('Kebele 07 (Bete-Mekdes)', 'SH-K07')]),
            ("Jin'Eala", 'JN-04', [("Kebele 08 (Jin'Eala Upper)", 'JN-K08'), ("Kebele 09 (Jin'Eala Lower)", 'JN-K09')]),
            ('Aboker', 'AK-05', [('Kebele 10 (Aboker North)', 'AK-K10'), ('Kebele 11 (Aboker South)', 'AK-K11')]),
            ('Hakim', 'HK-06', [('Kebele 12 (Hakim Mountain Gate)', 'HK-K12'), ('Kebele 13 (Arategna)', 'HK-K13')]),
            ('Sofi', 'SF-07', [('Kebele 14 (Sofi Rural Commercial Center)', 'SF-K14'), ('Kebele 15 (Aw-Umer)', 'SF-K15')]),
            ('Erer', 'ER-08', [('Kebele 16 (Erer Guda)', 'ER-K16'), ('Kebele 17 (Erer Tiya)', 'ER-K17')]),
            ('Dire Teyyara', 'DT-09', [('Kebele 18 (Hasengey)', 'DT-K18'), ('Kebele 19 (Qile)', 'DT-K19')]),
        ]

        w_map = {}
        k_map = {}
        for w_name, w_code, kebeles in woredas_data:
            woreda, _ = Woreda.objects.get_or_create(name=w_name, defaults={'code': w_code, 'region': region})
            w_map[w_name] = woreda
            for k_name, k_code in kebeles:
                kebele, _ = Kebele.objects.get_or_create(woreda=woreda, code=k_code, defaults={'name': k_name})
                k_map[f"{w_name}_{k_code}"] = kebele

        encoder = created_users['murad.amen']
        director = created_users['dr.ahmed.hassen']

        self.stdout.write("Seeding traders...")
        w_an = w_map['Amir Nur']
        k_an1 = k_map['Amir Nur_AN-K01']
        w_ab = w_map['Abadir']
        k_ab4 = k_map['Abadir_AB-K04']
        w_sh = w_map['Shenkor']
        k_sh6 = k_map['Shenkor_SH-K06']
        w_jn = w_map["Jin'Eala"]
        k_jn8 = k_map["Jin'Eala_JN-K08"]
        w_ak = w_map['Aboker']
        k_ak10 = k_map['Aboker_AK-K10']
        w_hk = w_map['Hakim']
        k_hk12 = k_map['Hakim_HK-K12']

        # 1. HTT-000001 (Legal, Approved)
        if not Trader.objects.filter(trader_id='HTT-000001').exists():
            t1 = Trader.objects.create(
                trader_id='HTT-000001',
                trader_type='LEGAL',
                status='APPROVED',
                name='Jugol Heritage Coffee & Spice Trade PLC',
                owner_full_name='Abdulhakim Mohammed Nur',
                phone_number='+251 91 532 9844',
                woreda=w_an,
                kebele=k_an1,
                specific_location='H-104/Jugol Central',
                created_by=encoder,
                verified_by=director,
                verification_notes='All licenses, tax clearance, and TIN certificates verified against regional revenue registry.',
                verified_at=timezone.now(),
            )
            LegalTrader.objects.create(
                trader=t1,
                tin='0049281745',
                trade_registration_number='HR-TR-2024-00842',
                gender='MALE',
                age=44,
                business_sector='AGRICULTURE_AGRO_PROCESSING',
                trade_scale='WHOLESALE',
                business_ownership_type='PLC',
                issuing_institution='Harari Region Trade and Industry Development Bureau',
                date_of_issuance=date(2024, 4, 12),
                house_number_plot_id='H-104/Jugol',
                remarks='Certified exporter of specialty Harar Longberry coffee beans and traditional spice blends.',
                officer_signature='M.Amen',
            )

        # 2. HTT-000002 (Informal, Approved)
        if not Trader.objects.filter(trader_id='HTT-000002').exists():
            t2 = Trader.objects.create(
                trader_id='HTT-000002',
                trader_type='INFORMAL',
                status='APPROVED',
                name='Amina Zeinudin Ibrahim',
                owner_full_name='Amina Zeinudin Ibrahim',
                phone_number='+251 91 578 3491',
                woreda=w_ab,
                kebele=k_ab4,
                specific_location='Shoa Gate (Feres Magala outer perimeter)',
                created_by=encoder,
                verified_by=director,
                verification_notes='Approved for formalization pipeline. Allocated stall at Shoa Gate Artisanal Shed.',
                verified_at=timezone.now(),
            )
            InformalTrader.objects.create(
                trader=t2,
                national_id_resident_id='ET-HR-2023-99381',
                gender='FEMALE',
                age=36,
                specific_location_market_area='Shoa Gate (Feres Magala outer perimeter)',
                nature_of_trade_activity='HANDCRAFT_INFORMAL_PRODUCTION',
                estimated_capital_assets=Decimal('48500.00'),
                reason_for_operating_informally='LACK_OF_CAPITAL',
                formalization_status_recommendation='READY_FOR_TIN_MICRO_ENTERPRISE',
                enumerator_data_collector_name='Murad Amen',
                date_of_assessment=date(2026, 10, 2),
            )
            FormalizationAssessment.objects.create(
                trader=t2,
                status='READY_FOR_FORMALIZATION',
                support_package='Business bookkeeping starter pack & micro-loan recommendation',
                assigned_mentor=director,
                assessed_by=director,
                notes='Progressing towards formal licensing.'
            )

        # 3. HTT-000003 (Legal, Submitted / Pending)
        if not Trader.objects.filter(trader_id='HTT-000003').exists():
            t3 = Trader.objects.create(
                trader_id='HTT-000003',
                trader_type='LEGAL',
                status='SUBMITTED',
                name='Bete-Harar General Building Materials',
                owner_full_name='Solomon Tesfaye Mengistu',
                phone_number='+251 91 140 2278',
                woreda=w_sh,
                kebele=k_sh6,
                specific_location='B-48/Shenkor Center',
                created_by=encoder,
                submitted_at=timezone.now(),
            )
            LegalTrader.objects.create(
                trader=t3,
                tin='0071829410',
                trade_registration_number='HR-TR-2025-01933',
                gender='MALE',
                age=39,
                business_sector='RETAIL_WHOLESALE_GOODS',
                trade_scale='RETAIL',
                business_ownership_type='SOLE_PROPRIETORSHIP',
                issuing_institution='Harari Region Trade and Industry Development Bureau',
                date_of_issuance=date(2025, 2, 18),
                house_number_plot_id='B-48/Shenkor',
                remarks='Application submitted for warehouse inspection.',
                officer_signature='M.Amen',
            )

        # 4. HTT-000004 (Informal, Submitted / Pending)
        if not Trader.objects.filter(trader_id='HTT-000004').exists():
            t4 = Trader.objects.create(
                trader_id='HTT-000004',
                trader_type='INFORMAL',
                status='SUBMITTED',
                name='Muktar Umer Abdullahi',
                owner_full_name='Muktar Umer Abdullahi',
                phone_number='+251 92 344 1920',
                woreda=w_jn,
                kebele=k_jn8,
                specific_location="Jin'Eala Central Market Lane 3",
                created_by=encoder,
                submitted_at=timezone.now(),
            )
            InformalTrader.objects.create(
                trader=t4,
                national_id_resident_id='ET-HR-2024-44102',
                gender='MALE',
                age=28,
                specific_location_market_area="Jin'Eala Central Market Lane 3",
                nature_of_trade_activity='STREET_VENDING_OPEN_MARKET',
                estimated_capital_assets=Decimal('22000.00'),
                reason_for_operating_informally='LACK_OF_CAPITAL',
                formalization_status_recommendation='NEEDS_AWARENESS_LEGAL_SUPPORT',
                enumerator_data_collector_name='Murad Amen',
                date_of_assessment=date(2026, 10, 6),
            )
            FormalizationAssessment.objects.create(
                trader=t4,
                status='NEEDS_SUPPORT',
                support_package='Legal awareness orientation on tax obligations',
                assigned_mentor=director,
                assessed_by=encoder,
            )

        # 5. HTT-000005 (Legal, Needs Correction)
        if not Trader.objects.filter(trader_id='HTT-000005').exists():
            t5 = Trader.objects.create(
                trader_id='HTT-000005',
                trader_type='LEGAL',
                status='NEEDS_CORRECTION',
                name='Harar Pure Honey & Wax Processing',
                owner_full_name='Kedir Abdi Yusuf',
                phone_number='+251 91 566 8201',
                woreda=w_ak,
                kebele=k_ak10,
                specific_location='House #512, Aboker Old Town',
                created_by=encoder,
                assigned_director=director,
                correction_remarks='Attached commercial lease contract is expired. Please submit an updated lease agreement.',
            )
            LegalTrader.objects.create(
                trader=t5,
                tin='0089123456',
                trade_registration_number='HR-TR-2024-00412',
                gender='MALE',
                age=35,
                business_sector='AGRICULTURE_AGRO_PROCESSING',
                trade_scale='RETAIL',
                business_ownership_type='SOLE_PROPRIETORSHIP',
                issuing_institution='Harari Region Trade and Industry Development Bureau',
                date_of_issuance=date(2024, 7, 10),
                house_number_plot_id='House #512',
                remarks='Honey production facility inspected.',
                officer_signature='M.Amen',
            )

        # 6. HTT-000006 (Informal, Under Review)
        if not Trader.objects.filter(trader_id='HTT-000006').exists():
            t6 = Trader.objects.create(
                trader_id='HTT-000006',
                trader_type='INFORMAL',
                status='UNDER_REVIEW',
                name='Zahara Ahmed Roble',
                owner_full_name='Zahara Ahmed Roble',
                phone_number='+251 94 489 3110',
                woreda=w_hk,
                kebele=k_hk12,
                specific_location='Hakim Mountain Gate Roadside',
                created_by=encoder,
                assigned_director=director,
                submitted_at=timezone.now(),
            )
            InformalTrader.objects.create(
                trader=t6,
                national_id_resident_id='ET-HR-2022-77112',
                gender='FEMALE',
                age=31,
                specific_location_market_area='Hakim Mountain Gate Roadside',
                nature_of_trade_activity='PETTY_RETAIL',
                estimated_capital_assets=Decimal('31500.00'),
                reason_for_operating_informally='COMPLEX_BUREAUCRACY',
                formalization_status_recommendation='READY_FOR_TIN_MICRO_ENTERPRISE',
                enumerator_data_collector_name='Murad Amen',
                date_of_assessment=date(2026, 10, 7),
            )
            FormalizationAssessment.objects.create(
                trader=t6,
                status='READY_FOR_FORMALIZATION',
                support_package='Micro-finance connection',
                assigned_mentor=director,
                assessed_by=director,
            )

        self.stdout.write("Seeding initial audit logs...")
        AuditLog.objects.get_or_create(
            action='REGISTER_TRADER',
            trader_id='HTT-000001',
            defaults={
                'details': "Registered legal trader 'Jugol Heritage Coffee & Spice Trade PLC' with TIN 0049281745",
                'user': 'murad.amen',
            }
        )
        AuditLog.objects.get_or_create(
            action='APPROVE_TRADER',
            trader_id='HTT-000001',
            defaults={
                'details': "Marked as APPROVED. Verification verified against regional revenue registry.",
                'user': 'dr.ahmed.hassen',
            }
        )

        self.stdout.write(self.style.SUCCESS("All seed data successfully populated!"))
