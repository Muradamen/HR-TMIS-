from django.test import TestCase, Client
from django.urls import reverse
from apps.accounts.models import User

class AccountAuthenticationTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.encoder = User.objects.create_user(
            username='encoder',
            password='encoder12345',
            role=User.Role.DATA_ENCODER,
            first_name='Dawit',
            last_name='Bekele',
        )
        self.director = User.objects.create_user(
            username='director',
            password='director12345',
            role=User.Role.DIRECTOR_OF_TRADER_CONTROL,
            first_name='Tigist',
            last_name='Haile',
        )

    def test_unauthenticated_user_redirected_to_login(self):
        response = self.client.get('/dashboard/')
        self.assertEqual(response.status_code, 302)
        self.assertTrue(response.url.startswith('/login/'))

    def test_successful_login(self):
        response = self.client.post('/login/', {
            'username': 'encoder',
            'password': 'encoder12345',
        })
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, '/dashboard/')

    def test_failed_login(self):
        response = self.client.post('/login/', {
            'username': 'encoder',
            'password': 'wrongpassword',
        })
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Invalid username or password')

    def test_authenticated_dashboard_rendering(self):
        self.client.login(username='director', password='director12345')
        response = self.client.get('/dashboard/')
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, 'Director Verification & Control Dashboard')
        self.assertContains(response, 'Self-Approval Prevention Active')

    def test_switch_user_view(self):
        self.client.login(username='encoder', password='encoder12345')
        response = self.client.get('/switch-user/?user=director')
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, '/dashboard/')
