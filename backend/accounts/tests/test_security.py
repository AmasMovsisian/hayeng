from datetime import date
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase

User = get_user_model()


class LoginGenericErrorMessageTests(APITestCase):
    """Both login paths must return the same generic error for any failure."""

    def setUp(self):
        """Create active and inactive test users and clear the cache."""
        cache.clear()
        self.active = User.objects.create_user(
            email='active@example.com',
            username='active',
            display_name='Active',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            password='StrongPass!123',
        )
        self.inactive = User.objects.create_user(
            email='inactive@example.com',
            username='inactive',
            display_name='Inactive',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            password='StrongPass!123',
            is_active=False,
        )

    def _session_msg(self, email, password):
        """Post to the session login endpoint and return (status, body)."""
        resp = self.client.post('/api/auth/login/', {'email': email, 'password': password}, format='json')
        return resp.status_code, str(resp.data)

    def _jwt_msg(self, email, password):
        """Post to the JWT login endpoint and return (status, body)."""
        resp = self.client.post('/api/auth/token/', {'email': email, 'password': password}, format='json')
        return resp.status_code, str(resp.data)

    def test_session_wrong_password_does_not_leak(self):
        """Session login with a wrong password returns a generic error."""
        code, body = self._session_msg('active@example.com', 'wrong')
        self.assertEqual(code, 400)
        self.assertIn('Invalid email or password', body)
        self.assertNotIn('inactive', body.lower())

    def test_session_inactive_does_not_leak(self):
        """Session login for an inactive user returns a generic error."""
        code, body = self._session_msg('inactive@example.com', 'StrongPass!123')
        self.assertEqual(code, 400)
        self.assertIn('Invalid email or password', body)
        self.assertNotIn('inactive', body.lower())

    def test_jwt_inactive_does_not_leak(self):
        """JWT login for an inactive user returns a generic error."""
        code, body = self._jwt_msg('inactive@example.com', 'StrongPass!123')
        self.assertEqual(code, 401)
        self.assertNotIn('inactive', body.lower())
        self.assertIn('invalid email or password', body.lower())

    def test_jwt_wrong_password_does_not_leak(self):
        """JWT login with a wrong password returns a generic error."""
        code, body = self._jwt_msg('active@example.com', 'wrong')
        self.assertEqual(code, 401)
        self.assertIn('invalid email or password', body.lower())

    def test_all_four_cases_are_indistinguishable(self):
        """Nonexistent, wrong-password and inactive cases are indistinguishable."""
        cases = [
            ('nonexistent@example.com', 'whatever'),
            ('active@example.com', 'wrong'),
            ('inactive@example.com', 'StrongPass!123'),
        ]
        for email, pwd in cases:
            code, body = self._jwt_msg(email, pwd)
            self.assertEqual(code, 401, f'{email}: expected 401, got {code}')
            self.assertNotIn('inactive', body.lower())
            self.assertNotIn('no active account', body.lower())


class PasswordValidatorTests(APITestCase):
    """Tests for Django's password validators via the RegisterSerializer."""

    def setUp(self):
        """Clear the cache before each test."""
        cache.clear()

    def _payload(self, password='StrongPass!123', password_confirm=None, **overrides):
        """Build a registration payload with configurable passwords."""
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'display_name': 'New User',
            'date_of_birth': '2000-01-01',
            'gender': 'male',
            'password': password,
            'password_confirm': password_confirm if password_confirm is not None else password,
        }
        data.update(overrides)
        return data

    def _assert_password_rejected(self, resp):
        """Assert the response reports a non-field (password) error."""
        self.assertEqual(resp.status_code, 400, resp.data)
        self.assertIn('non_field_errors', resp.data)

    def test_password_too_short_rejected(self):
        """Passwords that are too short are rejected."""
        resp = self.client.post('/api/auth/register/', self._payload(password='Short1!'), format='json')
        self._assert_password_rejected(resp)

    def test_password_too_common_rejected(self):
        """Common passwords are rejected."""
        resp = self.client.post('/api/auth/register/', self._payload(password='password123'), format='json')
        self._assert_password_rejected(resp)

    def test_password_all_numeric_rejected(self):
        """Fully numeric passwords are rejected."""
        resp = self.client.post('/api/auth/register/', self._payload(password='1234567890'), format='json')
        self._assert_password_rejected(resp)

    def test_password_similar_to_email_rejected(self):
        """Passwords similar to the email are rejected."""
        resp = self.client.post(
            '/api/auth/register/',
            self._payload(password='newuser@example.com', password_confirm='newuser@example.com'),
            format='json',
        )
        self._assert_password_rejected(resp)

    def test_password_similar_to_username_rejected(self):
        """Passwords similar to the username are rejected."""
        resp = self.client.post(
            '/api/auth/register/',
            self._payload(password='newuser123', password_confirm='newuser123'),
            format='json',
        )
        self._assert_password_rejected(resp)

    def test_strong_password_accepted(self):
        """A strong password is accepted."""
        resp = self.client.post('/api/auth/register/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 201, resp.data)

    def test_mismatch_and_weak_password_both_reported(self):
        """Mismatch and weak password are both reported together."""
        resp = self.client.post(
            '/api/auth/register/',
            self._payload(password='12345678', password_confirm='different123'),
            format='json',
        )
        self.assertEqual(resp.status_code, 400)
        self.assertIn('non_field_errors', resp.data)