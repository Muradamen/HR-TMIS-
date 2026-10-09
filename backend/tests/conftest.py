import pytest
from django.contrib.auth.models import Group
from django.utils import timezone
from apps.accounts.models import User
from apps.locations.models import Region, Woreda, Kebele
from apps.traders.models import Trader, LegalTrader, InformalTrader, WorkflowStatus

@pytest.fixture
def setup_roles_and_locations(db):
    for g in ['DATA_ENCODER', 'DIRECTOR_OF_TRADER_CONTROL', 'ADMINISTRATOR', 'AGENCY_LEADER']:
        Group.objects.get_or_create(name=g)

    region, _ = Region.objects.get_or_create(code='HR', defaults={'name': 'Harari People Regional State'})
    woreda1, _ = Woreda.objects.get_or_create(region=region, name='Amir Nur', defaults={'code': 'AN-01'})
    woreda2, _ = Woreda.objects.get_or_create(region=region, name='Shenkor', defaults={'code': 'SH-03'})
    kebele1, _ = Kebele.objects.get_or_create(woreda=woreda1, name='Kebele 01', defaults={'code': 'AN-K01'})
    kebele2, _ = Kebele.objects.get_or_create(woreda=woreda2, name='Kebele 02', defaults={'code': 'SH-K01'})

    encoder = User.objects.create_user(
        username='test_encoder',
        password='password123',
        email='encoder@harari.gov.et',
        full_name='Test Encoder',
        role='DATA_ENCODER'
    )

    director = User.objects.create_user(
        username='test_director',
        password='password123',
        email='director@harari.gov.et',
        full_name='Test Director',
        role='DIRECTOR_OF_TRADER_CONTROL'
    )

    admin = User.objects.create_user(
        username='test_admin',
        password='password123',
        email='admin@harari.gov.et',
        full_name='Test Admin',
        role='ADMINISTRATOR'
    )

    leader = User.objects.create_user(
        username='test_leader',
        password='password123',
        email='leader@harari.gov.et',
        full_name='Test Leader',
        role='AGENCY_LEADER'
    )

    return {
        'region': region,
        'woreda1': woreda1,
        'woreda2': woreda2,
        'kebele1': kebele1,
        'kebele2': kebele2,
        'encoder': encoder,
        'director': director,
        'admin': admin,
        'leader': leader,
    }
