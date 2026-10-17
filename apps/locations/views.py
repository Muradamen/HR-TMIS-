from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from .models import Woreda

@login_required
def locations_index(request):
    woredas = Woreda.objects.filter(is_active=True).prefetch_related('kebeles').order_by('name')
    return render(request, 'locations/index.html', {
        'title': 'Locations - Woredas & Kebeles',
        'woredas': woredas,
    })
