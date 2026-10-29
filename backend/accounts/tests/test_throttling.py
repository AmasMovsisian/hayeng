from datetime import date
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase

User = get_user_model()


class ThrottlingTests(APITestCase):
    """Tests for DRF ScopedRateThrottle on auth endpoints."""

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

    def test_login_throttle_blocks_after_10_attempts(self):
        """Login is throttled after 10 attempts within the window."""
        payload = {'email': 'hayk@example.com', 'password': 'wrong'}
        for i in range(10):
            resp = self.client.post('/api/auth/login/', payload, format='json')
            self.assertNotEqual(resp.status_code, 429, f'Attempt {i+1} got throttled too early')
        resp = self.client.post('/api/auth/login/', payload, format='json')
        self.assertEqual(resp.status_code, 429)

    def test_jwt_token_throttle_shares_login_scope(self):
        """JWT token endpoint shares the login throttle scope."""
        payload = {'email': 'hayk@example.com', 'password': 'wrong'}
        for i in range(10):
            resp = self.client.post('/api/auth/token/', payload, format='json')
            self.assertNotEqual(resp.status_code, 429, f'JWT attempt {i+1} got throttled too early')
        resp = self.client.post('/api/auth/token/', payload, format='json')
        self.assertEqual(resp.status_code, 429)

    def test_register_throttle_blocks_after_5_attempts(self):
        """Registration is throttled after 5 attempts within the window."""
        payload = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'display_name': 'New User',
            'date_of_birth': '2000-01-01',
            'gender': 'male',
            'password': 'StrongPass!123',
            'password_confirm': 'StrongPass!123',
        }
        for i in range(5):
            resp = self.client.post('/api/auth/register/', payload, format='json')
            self.assertNotEqual(resp.status_code, 429, f'Register attempt {i+1} got throttled too early')
        resp = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(resp.status_code, 429)

    def test_throttle_does_not_affect_me_endpoint(self):
        """The /me endpoint is not throttled."""
        self.client.force_login(self.user)
        for _ in range(20):
            resp = self.client.get('/api/auth/me/')
            self.assertNotEqual(resp.status_code, 429)