import pytest
from rest_framework.test import APIClient
from apps.accounts.models import User

@pytest.mark.django_db
def test_anonymous_access_denied(setup_roles_and_locations):
    client = APIClient()
    resp = client.get('/api/v1/traders/')
    assert resp.status_code in (401, 403)

@pytest.mark.django_db
def test_login_success_and_failure(setup_roles_and_locations):
    client = APIClient()

    # Invalid login
    resp = client.post('/api/v1/auth/login/', {'username': 'test_encoder', 'password': 'wrongpassword'}, format='json')
    assert resp.status_code == 401
    assert resp.data['success'] is False

    # Valid login
    resp = client.post('/api/v1/auth/login/', {'username': 'test_encoder', 'password': 'password123'}, format='json')
    assert resp.status_code == 200
    assert resp.data['success'] is True
    assert resp.data['user']['username'] == 'test_encoder'

@pytest.mark.django_db
def test_director_verification_permissions(setup_roles_and_locations):
    data = setup_roles_and_locations
    encoder = data['encoder']
    director = data['director']
    admin = data['admin']

    client = APIClient()

    # Create a trader submitted by encoder
    client.force_authenticate(user=encoder)
    create_resp = client.post('/api/v1/traders/', {
        'traderType': 'LEGAL',
        'tradeName': 'Amir Goods',
        'ownerFullName': 'Amir Umer',
        'tin': '9988776655',
        'tradeRegistrationNumber': 'HR-REG-TEST-01',
        'woredaId': data['woreda1'].id,
        'kebeleId': data['kebele1'].id,
        'dateOfIssuance': '2026-01-01',
        'businessSector': 'GENERAL_TRADE',
        'tradeScale': 'RETAIL',
        'businessOwnershipType': 'SOLE_PROPRIETORSHIP',
    }, format='json')
    assert create_resp.status_code == 201
    trader_id = create_resp.data['traderId']

    # 1. Encoder cannot approve (Forbidden)
    appr_resp = client.post(f'/api/v1/verification/{trader_id}/approve/', {'notes': 'trying to self approve'})
    assert appr_resp.status_code == 403

    # 2. Administrator cannot approve (Admins cannot approve operational records)
    client.force_authenticate(user=admin)
    appr_admin = client.post(f'/api/v1/verification/{trader_id}/approve/', {'notes': 'admin trying to approve'})
    assert appr_admin.status_code == 403

    # 3. Director can approve
    client.force_authenticate(user=director)
    appr_dir = client.post(f'/api/v1/verification/{trader_id}/approve/', {'notes': 'Director valid approval'})
    assert appr_dir.status_code == 200
    assert appr_dir.data['data']['status'] == 'APPROVED'
