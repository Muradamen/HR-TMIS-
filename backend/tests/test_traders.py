import pytest
from rest_framework.test import APIClient
from apps.traders.models import Trader

@pytest.mark.django_db
def test_kebele_woreda_mismatch_rejected(setup_roles_and_locations):
    data = setup_roles_and_locations
    encoder = data['encoder']

    client = APIClient()
    client.force_authenticate(user=encoder)

    # Kebele 2 belongs to Woreda 2, not Woreda 1
    resp = client.post('/api/v1/traders/', {
        'traderType': 'LEGAL',
        'tradeName': 'Mismatch Shop',
        'ownerFullName': 'Owner Name',
        'tin': '1231231234',
        'tradeRegistrationNumber': 'HR-REG-MIS-01',
        'woredaId': data['woreda1'].id,
        'kebeleId': data['kebele2'].id, # Mismatch!
        'dateOfIssuance': '2026-01-01',
    }, format='json')
    assert resp.status_code == 400
    assert 'does not belong to Woreda' in resp.data['error']

@pytest.mark.django_db
def test_duplicate_tin_rejected(setup_roles_and_locations):
    data = setup_roles_and_locations
    encoder = data['encoder']

    client = APIClient()
    client.force_authenticate(user=encoder)

    payload = {
        'traderType': 'LEGAL',
        'tradeName': 'Shop One',
        'ownerFullName': 'Owner One',
        'tin': '9999888877',
        'tradeRegistrationNumber': 'HR-REG-DUP-01',
        'woredaId': data['woreda1'].id,
        'kebeleId': data['kebele1'].id,
        'dateOfIssuance': '2026-01-01',
    }
    r1 = client.post('/api/v1/traders/', payload, format='json')
    assert r1.status_code == 201

    payload2 = {
        'traderType': 'LEGAL',
        'tradeName': 'Shop Two',
        'ownerFullName': 'Owner Two',
        'tin': '9999888877', # Duplicate TIN
        'tradeRegistrationNumber': 'HR-REG-DUP-02',
        'woredaId': data['woreda1'].id,
        'kebeleId': data['kebele1'].id,
        'dateOfIssuance': '2026-01-01',
    }
    r2 = client.post('/api/v1/traders/', payload2, format='json')
    assert r2.status_code == 400
    assert 'already registered' in r2.data['error']

@pytest.mark.django_db
def test_informal_trader_distinct_classification(setup_roles_and_locations):
    data = setup_roles_and_locations
    encoder = data['encoder']
    director = data['director']

    client = APIClient()
    client.force_authenticate(user=encoder)

    # Register Informal Trader
    r = client.post('/api/v1/traders/', {
        'traderType': 'INFORMAL',
        'fullName': 'Fatuma Informal',
        'gender': 'FEMALE',
        'age': 29,
        'specificLocationMarketArea': 'Gidr Magala Stall #5',
        'estimatedCapitalAssets': '15000.00',
        'reasonForOperatingInformally': 'LACK_OF_CAPITAL',
        'natureOfTradeActivity': 'PETTY_RETAIL',
        'woredaId': data['woreda1'].id,
        'kebeleId': data['kebele1'].id,
        'dateOfAssessment': '2026-02-01',
        'formalizationStatusRecommendation': 'READY_FOR_TIN_MICRO_ENTERPRISE'
    }, format='json')
    assert r.status_code == 201
    tid = r.data['traderId']

    # Director approves informal trader
    client.force_authenticate(user=director)
    appr = client.post(f'/api/v1/verification/{tid}/approve/', {'notes': 'Informal registration verified'})
    assert appr.status_code == 200

    # Ensure trader remains classified as INFORMAL
    trader = Trader.objects.get(trader_id=tid)
    assert trader.status == 'APPROVED'
    assert trader.trader_type == 'INFORMAL'
    assert hasattr(trader, 'informal_details')
    assert not hasattr(trader, 'legal_details')
