from datetime import date
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase

User = get_user_model()


class LoginJWTTests(APITestCase):
    """Tests for JWT login, refresh, blacklist and custom claims."""

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

    def test_token_obtain(self):
        """Valid credentials return access and refresh tokens."""
        resp = self.client.post('/api/auth/token/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_token_wrong_password(self):
        """Wrong password returns 401."""
        resp = self.client.post('/api/auth/token/', {
            'email': 'hayk@example.com',
            'password': 'wrong',
        }, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_token_refresh(self):
        """A valid refresh token yields a new access token."""
        r = self.client.post('/api/auth/token/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        refresh = r.data['refresh']
        resp = self.client.post('/api/auth/token/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)

    def test_token_blacklist(self):
        """A blacklisted refresh token can no longer be used."""
        r = self.client.post('/api/auth/token/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        refresh = r.data['refresh']
        resp = self.client.post('/api/auth/token/blacklist/', {'refresh': refresh}, format='json')
        self.assertEqual(resp.status_code, 200)
        resp = self.client.post('/api/auth/token/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_token_contains_custom_claims(self):
        """Access token includes username and display_name claims."""
        import jwt
        r = self.client.post('/api/auth/token/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        claims = jwt.decode(r.data['access'], options={"verify_signature": False})
        self.assertEqual(claims['username'], 'hayk')
        self.assertEqual(claims['display_name'], 'Hayk')