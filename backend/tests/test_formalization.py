import pytest
from rest_framework.test import APIClient
from apps.formalization.models import FormalizationRecord, FormalizationStatus
from apps.traders.models import Trader, InformalTrader

@pytest.mark.django_db
def test_formalization_workflow(setup_roles_and_locations):
    data = setup_roles_and_locations
    encoder = data['encoder']
    director = data['director']

    # Create an informal trader
    trader = Trader.objects.create(
        trader_id='HTT-TEST-INF',
        trader_type='INFORMAL',
        status='APPROVED',
        business_name='Informal Test',
        owner_full_name='Test Owner',
        woreda=data['woreda1'],
        kebele=data['kebele1'],
        registered_by=encoder
    )
    InformalTrader.objects.create(
        trader=trader,
        full_name='Test Owner',
        date_of_assessment='2026-01-01',
        specific_location_market_area='Market Spot'
    )
    rec = FormalizationRecord.objects.create(
        trader=trader,
        status=FormalizationStatus.NOT_ASSESSED
    )

    client = APIClient()
    client.force_authenticate(user=director)

    # Assess formalization
    assess_resp = client.post(f'/api/v1/formalization/{rec.id}/assess/', {
        'status': 'READY_FOR_FORMALIZATION',
        'readinessAssessment': 'Strong candidate for formal licensing',
        'recommendedSupport': 'Bookkeeping training'
    }, format='json')
    assert assess_resp.status_code == 200
    assert assess_resp.data['data']['status'] == 'READY_FOR_FORMALIZATION'

    # Formalize
    form_resp = client.post(f'/api/v1/formalization/{rec.id}/formalize/', {
        'notes': 'Granted TIN and formalized'
    }, format='json')
    assert form_resp.status_code == 200
    assert form_resp.data['data']['status'] == 'FORMALIZED'

    rec.refresh_from_db()
    assert rec.status == FormalizationStatus.FORMALIZED
    assert rec.responsible_officer_id == director.id
