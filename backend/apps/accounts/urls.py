from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CsrfCookieView, LoginView, LogoutView, MeView, UserViewSet

router = DefaultRouter()
router.register('users', UserViewSet, basename='user')

urlpatterns = [
    path('csrf/', CsrfCookieView.as_view(), name='csrf-cookie'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),
    path('', include(router.urls)),
]
