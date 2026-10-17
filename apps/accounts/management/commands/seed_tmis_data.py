import json
import os
from datetime import datetime
from pathlib import Path
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group
from django.utils import timezone

from apps.accounts.models import User
from apps.locations.models import Woreda, Kebele
from apps.traders.models import Trader, LegalTrader, InformalTrader
from apps.audit.models import AuditLog

class Command(BaseCommand):
    help = 'Seeds HT-TMIS initial reference data, RBAC groups, users, and traders'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Seeding HT-TMIS database..."))

        # 1. Groups / Roles
        roles = [
            User.Role.DATA_ENCODER,
            User.Role.DIRECTOR_OF_TRADER_CONTROL,
            User.Role.ADMINISTRATOR,
            User.Role.AGENCY_LEADER,
        ]
        for role in roles:
            group, created = Group.objects.get_or_create(name=role)
            if created:
                self.stdout.write(f"  + Group created: {role}")

        # 2. Users
        users_meta = [
            {
                'username': 'encoder',
                'password': 'encoder12345',
                'first_name': 'Dawit',
                'last_name': 'Bekele',
                'email': 'encoder@harar-trade.gov.et',
                'role': User.Role.DATA_ENCODER,
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'director',
                'password': 'director12345',
                'first_name': 'Tigist',
                'last_name': 'Haile',
                'email': 'director@harar-trade.gov.et',
                'role': User.Role.DIRECTOR_OF_TRADER_CONTROL,
                'is_staff': False,
                'is_superuser': False,
            },
            {
                'username': 'admin',
                'password': 'admin12345',
                'first_name': 'Murad',
                'last_name': 'Amen',
                'email': 'admin@harar-trade.gov.et',
                'role': User.Role.ADMINISTRATOR,
                'is_staff': True,
                'is_superuser': True,
            },
            {
                'username': 'leader',
                'password': 'leader12345',
                'first_name': 'Ambassador',
                'last_name': 'Yusuf',
                'email': 'leader@harar-trade.gov.et',
                'role': User.Role.AGENCY_LEADER,
                'is_staff': False,
                'is_superuser': False,
            },
        ]

        user_map = {}
        for u in users_meta:
            user = User.objects.filter(username=u['username']).first()
            if not user:
                user = User.objects.create_user(
                    username=u['username'],
                    password=u['password'],
                    email=u['email'],
                    first_name=u['first_name'],
                    last_name=u['last_name'],
                    role=u['role'],
                    is_staff=u['is_staff'],
                    is_superuser=u['is_superuser'],
                )
                self.stdout.write(f"  + User created: {u['username']} ({u['role']})")
            else:
                user.set_password(u['password'])
                user.role = u['role']
                user.is_staff = u['is_staff']
                user.is_superuser = u['is_superuser']
                user.save()
            group = Group.objects.filter(name=u['role']).first()
            if group:
                user.groups.add(group)
            user_map[u['username']] = user

        # 3. Woredas & Kebeles (Harari Region Administrative Units)
        woredas_data = [
            {'id': 1, 'name': 'Amir Nur', 'code': 'AN'},
            {'id': 2, 'name': 'Abadir', 'code': 'AB'},
            {'id': 3, 'name': 'Shenkor', 'code': 'SH'},
            {'id': 4, 'name': "Jin'Eala", 'code': 'JN'},
            {'id': 5, 'name': 'Hakim', 'code': 'HK'},
            {'id': 6, 'name': 'Dire Teyara', 'code': 'DT'},
            {'id': 7, 'name': 'Erer', 'code': 'ER'},
            {'id': 8, 'name': 'Sofi', 'code': 'SF'},
            {'id': 9, 'name': 'Awumer', 'code': 'AW'},
        ]

        woreda_map = {}
        for w in woredas_data:
            w_obj, _ = Woreda.objects.update_or_create(
                code=w['code'],
                defaults={'name': w['name'], 'region': 'Harari Region', 'is_active': True},
            )
            woreda_map[w['id']] = w_obj
            woreda_map[w['code']] = w_obj

        kebeles_data = [
            {'woreda_id': 1, 'name': 'Kebele 01 (Harar Jugol)', 'code': 'AN-01'},
            {'woreda_id': 1, 'name': 'Kebele 02 (Shoa Gate)', 'code': 'AN-02'},
            {'woreda_id': 1, 'name': 'Kebele 03 (Erer Gate)', 'code': 'AN-03'},
            {'woreda_id': 2, 'name': 'Kebele 01 (Ras Hotel Area)', 'code': 'AB-01'},
            {'woreda_id': 2, 'name': 'Kebele 02 (Stadium Area)', 'code': 'AB-02'},
            {'woreda_id': 3, 'name': 'Kebele 01 (Shenkor Central)', 'code': 'SH-01'},
            {'woreda_id': 3, 'name': 'Kebele 02 (Botte)', 'code': 'SH-02'},
            {'woreda_id': 4, 'name': "Kebele 01 (Jin'Eala North)", 'code': 'JN-01'},
            {'woreda_id': 4, 'name': "Kebele 02 (Gidir Magala)", 'code': 'JN-02'},
            {'woreda_id': 5, 'name': 'Kebele 01 (Hakim Summit)', 'code': 'HK-01'},
            {'woreda_id': 5, 'name': 'Kebele 02 (Arategna)', 'code': 'HK-02'},
            {'woreda_id': 6, 'name': 'Kebele 01 (Dire Teyara Rural)', 'code': 'DT-01'},
            {'woreda_id': 7, 'name': 'Kebele 01 (Erer Valley)', 'code': 'ER-01'},
            {'woreda_id': 8, 'name': 'Kebele 01 (Sofi Agro Market)', 'code': 'SF-01'},
            {'woreda_id': 9, 'name': 'Kebele 01 (Awumer Center)', 'code': 'AW-01'},
        ]

        kebele_map = {}
        for k in kebeles_data:
            w_obj = woreda_map[k['woreda_id']]
            k_obj, _ = Kebele.objects.update_or_create(
                woreda=w_obj,
                code=k['code'],
                defaults={'name': k['name'], 'is_active': True},
            )
            kebele_map[k['code']] = k_obj

        self.stdout.write(self.style.SUCCESS(f"  + Synced {len(woredas_data)} Woredas and {len(kebeles_data)} Kebeles."))

        # 4. Import from tmis_store.json if exists
        store_path = Path('data/tmis_store.json')
        if store_path.exists():
            try:
                with open(store_path, 'r', encoding='utf-8') as f:
                    store_data = json.load(f)
                    traders_json = store_data.get('traders', [])
                    audit_json = store_data.get('auditLogs', [])

                    for t in traders_json:
                        t_code = t['trader_code']
                        t_type = t['trader_type']
                        status = t['status']
                        reg_by = user_map.get(t['registered_by'], user_map['encoder'])
                        rev_by = user_map.get(t.get('reviewed_by'))
                        ver_by = user_map.get(t.get('verified_by'))

                        trader_obj, _ = Trader.objects.update_or_create(
                            trader_code=t_code,
                            defaults={
                                'trader_type': t_type,
                                'status': status,
                                'registered_by': reg_by,
                                'reviewed_by': rev_by,
                                'verified_by': ver_by,
                                'correction_notes': t.get('correction_notes', ''),
                                'rejection_reason': t.get('rejection_reason', ''),
                            }
                        )

                        if t_type == 'LEGAL' and 'legal_details' in t:
                            ld = t['legal_details']
                            w = woreda_map.get(ld.get('woreda_id'), woreda_map[1])
                            k = Kebele.objects.filter(woreda=w).first()
                            LegalTrader.objects.update_or_create(
                                trader=trader_obj,
                                defaults={
                                    'trade_name': ld.get('trade_name', 'Commercial Trader'),
                                    'owner_full_name': ld.get('owner_full_name', 'Trader Owner'),
                                    'tin': ld.get('tin', '0000000000'),
                                    'trade_registration_number': ld.get('trade_registration_number', 'HR-TR-001'),
                                    'trade_license_number': ld.get('trade_license_number', ''),
                                    'gender': ld.get('gender', 'MALE'),
                                    'age': ld.get('age', 35),
                                    'region': ld.get('region', 'Harari Region'),
                                    'woreda': w,
                                    'kebele': k,
                                    'house_number_plot_id': ld.get('house_number_plot_id', ''),
                                    'business_sector': ld.get('business_sector', 'GENERAL_TRADE'),
                                    'trade_scale': ld.get('trade_scale', 'RETAIL'),
                                    'business_ownership_type': ld.get('business_ownership_type', 'SOLE_PROPRIETORSHIP'),
                                    'issuing_institution': ld.get('issuing_institution', 'Harari Trade & Industry Development Bureau'),
                                    'date_of_issuance': ld.get('date_of_issuance', '2026-01-01'),
                                    'data_entered_by': ld.get('data_entered_by', 'Dawit Bekele'),
                                    'remarks': ld.get('remarks', ''),
                                }
                            )

                        elif t_type == 'INFORMAL' and 'informal_details' in t:
                            id_data = t['informal_details']
                            w = woreda_map.get(id_data.get('woreda_id'), woreda_map[1])
                            k = Kebele.objects.filter(woreda=w).first()
                            InformalTrader.objects.update_or_create(
                                trader=trader_obj,
                                defaults={
                                    'full_name': id_data.get('full_name', 'Informal Vendor'),
                                    'gender': id_data.get('gender', 'FEMALE'),
                                    'age': id_data.get('age', 30),
                                    'national_id_resident_id': id_data.get('national_id_resident_id', ''),
                                    'phone_number': id_data.get('phone_number', '+251911000000'),
                                    'region': id_data.get('region', 'Harari Region'),
                                    'woreda': w,
                                    'kebele': k,
                                    'specific_location_market_area': id_data.get('specific_location_market_area', 'Local Market'),
                                    'nature_of_trade_activity': id_data.get('nature_of_trade_activity', 'PETTY_RETAIL'),
                                    'estimated_capital_assets': Decimal(str(id_data.get('estimated_capital_assets', 15000))),
                                    'reason_for_operating_informally': id_data.get('reason_for_operating_informally', 'LACK_OF_CAPITAL'),
                                    'enumerator_data_collector_name': id_data.get('enumerator_data_collector_name', 'Dawit Bekele'),
                                    'date_of_assessment': id_data.get('date_of_assessment', '2026-01-01'),
                                    'formalization_status_recommendation': id_data.get('formalization_status_recommendation', 'READY_FOR_TIN_MICRO_ENTERPRISE'),
                                }
                            )

                    for al in audit_json:
                        u = user_map.get(al.get('user'))
                        AuditLog.objects.get_or_create(
                            action=al.get('action', 'SYSTEM_EVENT'),
                            target_id=al.get('target_id', ''),
                            defaults={
                                'user': u,
                                'actor_name': al.get('user', 'system'),
                                'role': u.role if u else 'SYSTEM',
                                'ip_address': al.get('ip_address', '127.0.0.1'),
                                'details': al.get('details', ''),
                            }
                        )

                    self.stdout.write(self.style.SUCCESS(f"  + Loaded {len(traders_json)} traders & {len(audit_json)} audit logs from tmis_store.json."))
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  ! Warning loading tmis_store.json: {e}"))

        self.stdout.write(self.style.SUCCESS("Database seeding completed successfully."))
