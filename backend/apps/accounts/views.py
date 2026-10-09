from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.audit.models import AuditEvent
from .models import User
from .permissions import IsAdministrator
from .serializers import UserSerializer, LoginSerializer, UserCreateUpdateSerializer

@method_decorator(ensure_csrf_cookie, name='dispatch')
class CsrfTokenView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({'success': True, 'message': 'CSRF cookie established'})

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({'success': False, 'error': 'Invalid request data', 'errors': serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

        username = serializer.validated_data['username'].strip()
        password = serializer.validated_data['password']

        user = authenticate(request, username=username, password=password)
        if not user:
            # Fallback by email lookup
            try:
                user_obj = User.objects.get(email__iexact=username)
                user = authenticate(request, username=user_obj.username, password=password)
            except User.DoesNotExist:
                user = None

        if not user:
            AuditEvent.log(
                actor=None,
                action='LOGIN_FAILED',
                entity_type='USER',
                entity_id=username,
                details=f"Failed login attempt for username/email: {username}"
            )
            return Response({'success': False, 'error': 'Invalid username or password'}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_active:
            return Response({'success': False, 'error': 'Account is inactive. Contact Administrator.'}, status=status.HTTP_403_FORBIDDEN)

        login(request, user)

        AuditEvent.log(
            actor=user,
            action='LOGIN_SUCCESS',
            entity_type='USER',
            entity_id=str(user.id),
            details=f"User {user.username} ({user.get_normalized_role()}) logged in successfully"
        )

        user_data = UserSerializer(user).data
        return Response({
            'success': True,
            'message': 'Authentication successful',
            'user': user_data
        })

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        AuditEvent.log(
            actor=user,
            action='LOGOUT',
            entity_type='USER',
            entity_id=str(user.id),
            details=f"User {user.username} logged out"
        )
        logout(request)
        return Response({'success': True, 'message': 'Logged out successfully'})

class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({
            'success': True,
            'user': UserSerializer(request.user).data
        })

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('id')
    permission_classes = [IsAdministrator]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return UserCreateUpdateSerializer
        return UserSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        AuditEvent.log(
            actor=self.request.user,
            action='USER_CREATED',
            entity_type='USER',
            entity_id=str(user.id),
            details=f"Admin created user {user.username} with role {user.role}"
        )

    def perform_update(self, serializer):
        user = serializer.save()
        AuditEvent.log(
            actor=self.request.user,
            action='USER_UPDATED',
            entity_type='USER',
            entity_id=str(user.id),
            details=f"Admin updated user {user.username}"
        )
