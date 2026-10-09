from django.contrib.auth import authenticate, login, logout, get_user_model
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
import hashlib
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import UserSerializer, LoginSerializer
from .models import LoginAttempt
from apps.core.permissions import IsAdministrator
from apps.audit.models import AuditLog

User = get_user_model()
LOGIN_FAILURE_LIMIT = 8
LOGIN_LOCK_SECONDS = 15 * 60


def _login_attempt_key(request, identifier):
    raw = f"{request.META.get('REMOTE_ADDR', 'unknown')}:{identifier.strip().lower()}"
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()


def _login_is_locked(key):
    now = timezone.now()
    with transaction.atomic():
        attempt, _ = LoginAttempt.objects.select_for_update().get_or_create(
            key=key, defaults={'window_started_at': now}
        )
        if attempt.locked_until and attempt.locked_until > now:
            return True
        if now - attempt.window_started_at >= timedelta(seconds=LOGIN_LOCK_SECONDS):
            attempt.attempts = 0
            attempt.window_started_at = now
            attempt.locked_until = None
            attempt.save(update_fields=['attempts', 'window_started_at', 'locked_until', 'updated_at'])
        return attempt.attempts >= LOGIN_FAILURE_LIMIT


def _record_login_failure(key):
    now = timezone.now()
    with transaction.atomic():
        attempt, _ = LoginAttempt.objects.select_for_update().get_or_create(
            key=key, defaults={'window_started_at': now}
        )
        if now - attempt.window_started_at >= timedelta(seconds=LOGIN_LOCK_SECONDS):
            attempt.attempts = 0
            attempt.window_started_at = now
            attempt.locked_until = None
        attempt.attempts += 1
        if attempt.attempts >= LOGIN_FAILURE_LIMIT:
            attempt.locked_until = now + timedelta(seconds=LOGIN_LOCK_SECONDS)
        attempt.save(update_fields=['attempts', 'window_started_at', 'locked_until', 'updated_at'])

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfCookieView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'csrfToken': get_token(request)})


@method_decorator(csrf_protect, name='dispatch')
class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        identifier = serializer.validated_data['identifier']
        email = identifier.lower()
        password = serializer.validated_data['password']
        key = _login_attempt_key(request, identifier)
        if _login_is_locked(key):
            return Response({'detail': 'Too many failed attempts. Try again later.'},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)
        candidate = User.objects.filter(email__iexact=email).first() if '@' in identifier else User.objects.filter(username__iexact=identifier).first()
        user = authenticate(request, username=candidate.get_username(), password=password) if candidate else None
        if user is None or not user.is_active:
            _record_login_failure(key)
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)
        LoginAttempt.objects.filter(key=key).delete()
        login(request, user)
        request.session.set_expiry(1800)
        AuditLog.objects.create(
            action='LOGIN', details='Successful login', user=user.username,
            ip_address=request.META.get('REMOTE_ADDR') or None,
        )
        return Response({'message': 'Login successful.', 'user': UserSerializer(user).data})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        AuditLog.objects.create(
            action='LOGOUT', details='User logged out', user=request.user.username,
            ip_address=request.META.get('REMOTE_ADDR') or None,
        )
        logout(request)
        response = Response({'message': 'Logged out successfully.'})
        response.delete_cookie('sessionid', samesite='Lax')
        return response


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    serializer_class = UserSerializer
    permission_classes = [IsAdministrator]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def perform_update(self, serializer):
        instance = self.get_object()
        requested_role = serializer.validated_data.get('role', instance.role)
        if instance.pk == self.request.user.pk and requested_role != instance.role:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('You cannot change your own operational role.')
        serializer.save()

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])
