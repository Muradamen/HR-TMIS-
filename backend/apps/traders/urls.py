from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TraderViewSet

router = DefaultRouter()
router.register('', TraderViewSet, basename='trader')

urlpatterns = [
    path('', include(router.urls)),
]
