from .models import AuditLog

def get_client_ip(request):
    if not request:
        return '127.0.0.1'
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '127.0.0.1')

def log_audit(
    action: str,
    target_id: str = '',
    request = None,
    user = None,
    actor_name: str = '',
    role: str = '',
    old_state: str = '',
    new_state: str = '',
    details: str = '',
) -> AuditLog:
    if request:
        ip = get_client_ip(request)
        method = request.method
        if not user and request.user.is_authenticated:
            user = request.user
    else:
        ip = '127.0.0.1'
        method = 'SYSTEM'

    if user and user.is_authenticated:
        actor = user.username
        user_role = getattr(user, 'role', '')
        user_obj = user
    else:
        actor = actor_name or 'system'
        user_role = role or 'ANONYMOUS'
        user_obj = None

    return AuditLog.objects.create(
        user=user_obj,
        actor_name=actor,
        role=user_role,
        action=action,
        ip_address=ip,
        http_method=method,
        target_id=target_id,
        old_state=old_state,
        new_state=new_state,
        details=details,
    )
