from datetime import date
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient, APITestCase

User = get_user_model()


class JWTDoesNotAcceptSessionCookieTests(APITestCase):
    """JWT endpoints must only accept Bearer tokens, never session cookies."""

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

    def test_token_endpoint_rejects_session_cookie_without_credentials(self):
        """A session cookie alone must not yield a JWT (400 or 401 is safe, 200 would be a bug)."""
        self.client.force_login(self.user)
        self.assertIn('sessionid', self.client.cookies)
        resp = self.client.post('/api/auth/token/', {}, format='json')
        self.assertIn(resp.status_code, [400, 401])
        self.assertNotIn('access', resp.data)
        self.assertNotIn('refresh', resp.data)

    def test_token_endpoint_rejects_session_cookie_with_wrong_credentials(self):
        """Session cookie plus wrong credentials must return 401, never 200."""
        self.client.force_login(self.user)
        resp = self.client.post('/api/auth/token/', {
            'email': 'hayk@example.com',
            'password': 'wrong',
        }, format='json')
        self.assertEqual(resp.status_code, 401)
        self.assertNotIn('access', resp.data)

    def test_token_refresh_rejects_session_cookie(self):
        """Token refresh must reject a session cookie with an invalid refresh token."""
        self.client.force_login(self.user)
        resp = self.client.post(
            '/api/auth/token/refresh/', {'refresh': 'garbage'}, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_token_blacklist_rejects_session_cookie(self):
        """Token blacklist must reject a session cookie with an invalid refresh token."""
        self.client.force_login(self.user)
        resp = self.client.post(
            '/api/auth/token/blacklist/', {'refresh': 'garbage'}, format='json')
        self.assertIn(resp.status_code, [400, 401])

    def test_me_endpoint_accepts_session_cookie(self):
        """Control test: session cookie works on /api/auth/me/ via SessionAuthentication."""
        self.client.force_login(self.user)
        resp = self.client.get('/api/auth/me/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['username'], 'hayk')


class ThrottleIsPerClientTests(APITestCase):
    """The throttle must be per-IP, not global."""

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

    def _make_client(self, remote_addr):
        """Return an APIClient with a fixed REMOTE_ADDR."""
        client = APIClient()
        client.defaults['REMOTE_ADDR'] = remote_addr
        return client

    def test_different_ips_do_not_share_throttle_counter(self):
        """Exhausting one IP's limit must not throttle a different IP."""
        client_a = self._make_client('10.0.0.1')
        client_b = self._make_client('10.0.0.2')

        payload = {'email': 'hayk@example.com', 'password': 'wrong'}
        for _ in range(10):
            resp = client_a.post('/api/auth/login/', payload, format='json')
            self.assertNotEqual(resp.status_code, 429)
        resp = client_a.post('/api/auth/login/', payload, format='json')
        self.assertEqual(resp.status_code, 429)

        resp = client_b.post('/api/auth/login/', payload, format='json')
        self.assertNotEqual(resp.status_code, 429,
                            'Throttle is global - a different IP must not be blocked by another IP\'s counter')

    def test_same_ip_shares_counter_across_clients(self):
        """Two clients with the same IP share the throttle counter."""
        payload = {'email': 'hayk@example.com', 'password': 'wrong'}
        client_a = self._make_client('10.0.0.1')
        for _ in range(10):
            client_a.post('/api/auth/login/', payload, format='json')

        client_b = self._make_client('10.0.0.1')
        resp = client_b.post('/api/auth/login/', payload, format='json')
        self.assertEqual(resp.status_code, 429)