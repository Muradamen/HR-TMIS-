from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoginView, LogoutView, MeView, CsrfTokenView, UserViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('csrf/', CsrfTokenView.as_view(), name='auth-csrf'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('', include(router.urls)),
]
