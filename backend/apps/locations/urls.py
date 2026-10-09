from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RegionViewSet, WoredaViewSet, KebeleViewSet

router = DefaultRouter()
router.register('regions', RegionViewSet, basename='region')
router.register('woredas', WoredaViewSet, basename='woreda')
router.register('kebeles', KebeleViewSet, basename='kebele')

urlpatterns = [
    path('', include(router.urls)),
]
