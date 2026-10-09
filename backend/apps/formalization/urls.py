from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FormalizationViewSet

router = DefaultRouter()
router.register('', FormalizationViewSet, basename='formalization')

urlpatterns = [
    path('', include(router.urls)),
]
