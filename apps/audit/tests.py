from django.test import TestCase, Client
from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.audit.services import log_audit

class AuditTrailTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_user(
            username='admin_audit',
            password='password123',
            role=User.Role.ADMINISTRATOR,
            is_superuser=True,
        )
        self.encoder = User.objects.create_user(
            username='encoder_audit',
            password='password123',
            role=User.Role.DATA_ENCODER,
        )

    def test_log_audit_service(self):
        entry = log_audit(
            action='TEST_ACTION',
            target_id='HT-2026-TEST',
            user=self.admin,
            details='Test audit log entry creation',
        )
        self.assertIsNotNone(entry.id)
        self.assertEqual(entry.action, 'TEST_ACTION')
        self.assertEqual(entry.actor_name, 'admin_audit')
        self.assertEqual(entry.role, User.Role.ADMINISTRATOR)

    def test_audit_log_access_control(self):
        # Encoder is NOT allowed to view audit trail (PermissionDenied 403)
        self.client.login(username='encoder_audit', password='password123')
        response = self.client.get('/audit/')
        self.assertEqual(response.status_code, 403)

        # Admin CAN view audit trail
        self.client.login(username='admin_audit', password='password123')
        response = self.client.get('/audit/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'System Audit Trail')
