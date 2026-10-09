from django.contrib.auth import authenticate, login, logout, get_user_model
from django.views.decorators.csrf import csrf_protect
from django.utils.decorators import method_decorator
from django.core.cache import cache
from rest_framework import status, viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import UserSerializer, LoginSerializer
from apps.core.permissions import IsAdministrator

User = get_user_model()
LOGIN_FAILURE_LIMIT = 8
LOGIN_LOCK_SECONDS = 15 * 60


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
        key = 'login-fail:' + str(request.META.get('REMOTE_ADDR', 'unknown')) + ':' + email
        if int(cache.get(key, 0)) >= LOGIN_FAILURE_LIMIT:
            return Response({'detail': 'Too many failed attempts. Try again later.'},
                            status=status.HTTP_429_TOO_MANY_REQUESTS)
        candidate = User.objects.filter(email__iexact=email).first() if '@' in identifier else User.objects.filter(username__iexact=identifier).first()
        user = authenticate(request, username=candidate.get_username(), password=password) if candidate else None
        if user is None or not user.is_active:
            cache.set(key, int(cache.get(key, 0)) + 1, LOGIN_LOCK_SECONDS)
            return Response({'detail': 'Invalid email or password.'}, status=status.HTTP_401_UNAUTHORIZED)
        cache.delete(key)
        login(request, user)
        request.session.set_expiry(1800)
        return Response({'message': 'Login successful.', 'user': UserSerializer(user).data})


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
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
    http_method_names = ['get', 'post', 'put', 'patch', 'head', 'options']

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])
