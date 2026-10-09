from django.test import Client, TestCase
from apps.accounts.models import User


class LoginSecurityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='login-test',
            email='login-test@example.test',
            password='Strong-Test-Password-2026!',
            role='DATA_ENCODER',
        )

    def test_login_rejects_missing_csrf_token(self):
        client = Client(enforce_csrf_checks=True)
        response = client.post(
            '/api/v1/auth/login/',
            data='{"username":"login-test","password":"Strong-Test-Password-2026!"}',
            content_type='application/json',
        )
        self.assertEqual(response.status_code, 403)

    def test_email_login_succeeds_with_csrf_token(self):
        client = Client(enforce_csrf_checks=True)
        csrf_response = client.get('/api/v1/auth/csrf/')
        self.assertEqual(csrf_response.status_code, 200)
        token = csrf_response.json()['csrfToken']
        response = client.post(
            '/api/v1/auth/login/',
            data='{"email":"login-test@example.test","password":"Strong-Test-Password-2026!"}',
            content_type='application/json',
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('sessionid', client.cookies)
        self.assertEqual(response.json()['user']['email'], 'login-test@example.test')
