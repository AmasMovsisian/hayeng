from datetime import date
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client
from rest_framework.test import APITestCase

User = get_user_model()


class CsrfEnforcementTests(APITestCase):
    """CSRF enforcement tests using a client with enforce_csrf_checks=True."""

    def setUp(self):
        """Create a test user and a CSRF-enforcing client."""
        cache.clear()
        self.user = User.objects.create_user(
            email='hayk@example.com',
            username='hayk',
            display_name='Hayk',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            password='StrongPass!123',
        )
        self.csrf_client = Client(enforce_csrf_checks=True)

    def _get_csrf_token(self):
        """Fetch the CSRF cookie and return its token value."""
        resp = self.csrf_client.get('/api/auth/csrf/')
        self.assertEqual(resp.status_code, 204)
        self.assertIn('csrftoken', self.csrf_client.cookies)
        return self.csrf_client.cookies['csrftoken'].value

    def test_csrf_endpoint_sets_cookie(self):
        """The CSRF endpoint must set a non-trivial csrftoken cookie."""
        resp = self.csrf_client.get('/api/auth/csrf/')
        self.assertEqual(resp.status_code, 204)
        self.assertIn('csrftoken', self.csrf_client.cookies)
        self.assertTrue(len(self.csrf_client.cookies['csrftoken'].value) > 20)

    def test_login_without_csrf_token_is_rejected(self):
        """Login without a CSRF token must return 403."""
        resp = self.csrf_client.post('/api/auth/login/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_login_with_valid_csrf_token_succeeds(self):
        """Login with a valid CSRF token must succeed."""
        token = self._get_csrf_token()
        resp = self.csrf_client.post(
            '/api/auth/login/',
            {'email': 'hayk@example.com', 'password': 'StrongPass!123'},
            format='json',
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['username'], 'hayk')

    def test_login_with_wrong_csrf_token_is_rejected(self):
        """Login with an invalid CSRF token must return 403."""
        self._get_csrf_token()
        resp = self.csrf_client.post(
            '/api/auth/login/',
            {'email': 'hayk@example.com', 'password': 'StrongPass!123'},
            format='json',
            HTTP_X_CSRFTOKEN='wrong-token-value',
        )
        self.assertEqual(resp.status_code, 403)

    def test_register_without_csrf_is_rejected(self):
        """Registration without a CSRF token must return 403."""
        resp = self.csrf_client.post('/api/auth/register/', {
            'email': 'new@example.com',
            'username': 'newuser',
            'display_name': 'New User',
            'date_of_birth': '2000-01-01',
            'gender': 'male',
            'password': 'StrongPass!123',
            'password_confirm': 'StrongPass!123',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_register_with_csrf_succeeds(self):
        """Registration with a valid CSRF token must succeed."""
        token = self._get_csrf_token()
        resp = self.csrf_client.post(
            '/api/auth/register/',
            {
                'email': 'new@example.com',
                'username': 'newuser',
                'display_name': 'New User',
                'date_of_birth': '2000-01-01',
                'gender': 'male',
                'password': 'StrongPass!123',
                'password_confirm': 'StrongPass!123',
            },
            format='json',
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_login_view_actually_protected_against_csrf(self):
        """Login view must reject requests lacking a CSRF token."""
        resp = self.csrf_client.post('/api/auth/login/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_register_view_actually_protected_against_csrf(self):
        """Register view must reject requests lacking a CSRF token."""
        resp = self.csrf_client.post('/api/auth/register/', {
            'email': 'new@example.com',
            'username': 'newuser',
            'display_name': 'New User',
            'date_of_birth': '2000-01-01',
            'gender': 'male',
            'password': 'StrongPass!123',
            'password_confirm': 'StrongPass!123',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_logout_without_csrf_is_rejected(self):
        """Logout without a CSRF token must return 403."""
        resp = self.csrf_client.post('/api/auth/logout/')
        self.assertEqual(resp.status_code, 403)

    def test_verify_email_without_csrf_is_rejected(self):
        """Email verification without a CSRF token must return 403."""
        resp = self.csrf_client.post('/api/auth/verify-email/', {
            'uid': 'some-uid',
            'token': 'some-token',
        }, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_resend_verification_without_csrf_is_rejected(self):
        """Resend verification without a CSRF token must return 403."""
        resp = self.csrf_client.post('/api/auth/resend-verification/', {
            'email': 'hayk@example.com',
        }, format='json')
        self.assertEqual(resp.status_code, 403)