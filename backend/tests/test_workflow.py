import pytest
from rest_framework.test import APIClient
from apps.traders.models import Trader, WorkflowStatus

@pytest.mark.django_db
def test_self_approval_blocked(setup_roles_and_locations):
    data = setup_roles_and_locations
    director = data['director']

    client = APIClient()
    client.force_authenticate(user=director)

    # Director registers a trader
    create_resp = client.post('/api/v1/traders/', {
        'traderType': 'LEGAL',
        'tradeName': 'Director Enterprise',
        'ownerFullName': 'Director Self',
        'tin': '1122334455',
        'tradeRegistrationNumber': 'HR-REG-DIR-01',
        'woredaId': data['woreda1'].id,
        'kebeleId': data['kebele1'].id,
        'dateOfIssuance': '2026-01-01',
        'businessSector': 'GENERAL_TRADE',
        'tradeScale': 'WHOLESALE',
        'businessOwnershipType': 'PLC',
    }, format='json')
    assert create_resp.status_code == 201
    trader_id = create_resp.data['traderId']

    # Director attempts to approve their own record: MUST BE FORBIDDEN (403)
    appr_resp = client.post(f'/api/v1/verification/{trader_id}/approve/', {'notes': 'Self approving'})
    assert appr_resp.status_code == 403
    assert 'Self-approval is forbidden' in appr_resp.data['error']

@pytest.mark.django_db
def test_rejection_and_correction_require_reason(setup_roles_and_locations):
    data = setup_roles_and_locations
    encoder = data['encoder']
    director = data['director']

    client = APIClient()
    client.force_authenticate(user=encoder)
    create_resp = client.post('/api/v1/traders/', {
        'traderType': 'LEGAL',
        'tradeName': 'Spice Market',
        'ownerFullName': 'Kadir Ahmed',
        'tin': '5544332211',
        'tradeRegistrationNumber': 'HR-REG-SPICE-01',
        'woredaId': data['woreda1'].id,
        'kebeleId': data['kebele1'].id,
        'dateOfIssuance': '2026-01-01',
        'businessSector': 'GENERAL_TRADE',
        'tradeScale': 'RETAIL',
        'businessOwnershipType': 'SOLE_PROPRIETORSHIP',
    }, format='json')
    trader_id = create_resp.data['traderId']

    client.force_authenticate(user=director)

    # Empty rejection reason fails
    rej_fail = client.post(f'/api/v1/verification/{trader_id}/reject/', {'reason': ''})
    assert rej_fail.status_code == 400

    # Empty correction reason fails
    corr_fail = client.post(f'/api/v1/verification/{trader_id}/return-for-correction/', {'notes': ''})
    assert corr_fail.status_code == 400

    # Valid return for correction succeeds
    corr_ok = client.post(f'/api/v1/verification/{trader_id}/return-for-correction/', {'notes': 'Need valid landlord lease agreement'})
    assert corr_ok.status_code == 200
    assert corr_ok.data['data']['status'] == 'NEEDS_CORRECTION'

    # Resubmission by encoder
    client.force_authenticate(user=encoder)
    resub_resp = client.post(f'/api/v1/traders/{trader_id}/resubmit/')
    assert resub_resp.status_code == 200
    assert resub_resp.data['data']['status'] == 'SUBMITTED'
