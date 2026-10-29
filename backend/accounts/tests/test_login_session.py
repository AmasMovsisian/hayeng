from datetime import date
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase

User = get_user_model()


class LoginSessionTests(APITestCase):
    """Tests for session-based login, logout and the /me endpoint."""

    def setUp(self):
        """Create a test user and clear the cache."""
        cache.clear()
        self.user = User.objects.create_user(
            email='hayk@example.com',
            username='hayk',
            display_name='Hayk',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            password='StrongPass!123',
        )

    def test_login_success_sets_session(self):
        """Successful login returns the user and sets a session cookie."""
        resp = self.client.post('/api/auth/login/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['username'], 'hayk')
        self.assertNotIn('password', resp.data)
        self.assertIn('sessionid', self.client.cookies)

    def test_login_wrong_password(self):
        """Wrong password returns 400."""
        resp = self.client.post('/api/auth/login/', {
            'email': 'hayk@example.com',
            'password': 'wrong',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_login_email_case_insensitive(self):
        """Login is case-insensitive for email."""
        resp = self.client.post('/api/auth/login/', {
            'email': 'HAYK@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        self.assertEqual(resp.status_code, 200)

    def test_me_requires_auth(self):
        """Unauthenticated access to /me returns 401."""
        resp = self.client.get('/api/auth/me/')
        self.assertEqual(resp.status_code, 401)

    def test_me_returns_user_after_login(self):
        """After login, /me returns the authenticated user data."""
        self.client.post('/api/auth/login/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        resp = self.client.get('/api/auth/me/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['username'], 'hayk')
        self.assertFalse(resp.data['email_verified'])

    def test_logout_clears_session(self):
        """Logout clears the session so /me returns 401 again."""
        self.client.post('/api/auth/login/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        resp = self.client.post('/api/auth/logout/')
        self.assertEqual(resp.status_code, 204)
        resp = self.client.get('/api/auth/me/')
        self.assertEqual(resp.status_code, 401)