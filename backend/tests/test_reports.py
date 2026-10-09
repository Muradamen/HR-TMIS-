import pytest
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_dashboard_and_exports(setup_roles_and_locations):
    data = setup_roles_and_locations
    leader = data['leader']

    client = APIClient()
    client.force_authenticate(user=leader)

    # Dashboard metrics
    dash_resp = client.get('/api/v1/reports/dashboard/')
    assert dash_resp.status_code == 200
    assert dash_resp.data['success'] is True
    assert 'metrics' in dash_resp.data
    assert 'woredaBreakdown' in dash_resp.data['metrics']

    # CSV Export
    csv_resp = client.get('/api/v1/reports/exports/csv/')
    assert csv_resp.status_code == 200
    assert 'text/csv' in csv_resp['Content-Type']

    # Excel Export
    excel_resp = client.get('/api/v1/reports/exports/excel/')
    assert excel_resp.status_code == 200
    assert 'spreadsheetml' in excel_resp['Content-Type']

    # PDF Export
    pdf_resp = client.get('/api/v1/reports/exports/pdf/')
    assert pdf_resp.status_code == 200
    assert 'application/pdf' in pdf_resp['Content-Type']
