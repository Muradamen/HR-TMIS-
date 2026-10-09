from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from apps.core.permissions import (
    CanApproveTrader,
    IsAdministrator,
    IsReportExporter,
    IsTraderReadAllowed,
)

User = get_user_model()


class RolePermissionTests(TestCase):
    def setUp(self):
        self.factory = APIRequestFactory()
        self.encoder = User.objects.create_user(
            username='encoder-test', email='encoder@example.test', password='Safe-Test-Pass-2026!',
            role='DATA_ENCODER',
        )
        self.director = User.objects.create_user(
            username='director-test', email='director@example.test', password='Safe-Test-Pass-2026!',
            role='DIRECTOR',
        )
        self.leader = User.objects.create_user(
            username='leader-test', email='leader@example.test', password='Safe-Test-Pass-2026!',
            role='AGENCY_LEADER',
        )
        self.admin = User.objects.create_user(
            username='admin-test', email='admin@example.test', password='Safe-Test-Pass-2026!',
            role='SYSTEM_ADMINISTRATOR',
        )

    def allowed(self, permission, user):
        request = self.factory.get('/')
        request.user = user
        return permission().has_permission(request, None)

    def test_only_director_can_make_verification_decisions(self):
        self.assertTrue(self.allowed(CanApproveTrader, self.director))
        self.assertFalse(self.allowed(CanApproveTrader, self.admin))
        self.assertFalse(self.allowed(CanApproveTrader, self.encoder))
        self.assertFalse(self.allowed(CanApproveTrader, self.leader))

    def test_exports_allow_scoped_encoders_and_oversight_roles(self):
        self.assertTrue(self.allowed(IsReportExporter, self.director))
        self.assertTrue(self.allowed(IsReportExporter, self.leader))
        self.assertTrue(self.allowed(IsReportExporter, self.encoder))
        self.assertFalse(self.allowed(IsReportExporter, self.admin))


    def test_trader_reads_require_a_recognized_operational_role(self):
        self.assertTrue(self.allowed(IsTraderReadAllowed, self.encoder))
        self.assertTrue(self.allowed(IsTraderReadAllowed, self.director))
        self.assertTrue(self.allowed(IsTraderReadAllowed, self.leader))
        self.assertTrue(self.allowed(IsTraderReadAllowed, self.admin))

    def test_administrator_does_not_inherit_verification_permission(self):
        self.assertTrue(self.allowed(IsAdministrator, self.admin))
        self.assertFalse(self.allowed(CanApproveTrader, self.admin))
        self.director.is_staff = True
        self.director.save(update_fields=['is_staff'])
        self.assertFalse(self.allowed(IsAdministrator, self.director))
