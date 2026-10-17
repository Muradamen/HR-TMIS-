from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.core.exceptions import PermissionDenied
from .models import AuditLog

@login_required
def audit_index(request):
    user = request.user
    if not (user.is_administrator or user.is_director or user.is_leader):
        raise PermissionDenied('Only Administrators, Directors, and Agency Leaders can inspect the audit trail.')

    logs = AuditLog.objects.all().order_by('-timestamp')[:100]
    return render(request, 'audit/index.html', {
        'title': 'Audit Trail & Compliance',
        'logs': logs,
    })
