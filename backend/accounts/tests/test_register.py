from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from rest_framework.test import APITestCase

User = get_user_model()


class RegisterTests(APITestCase):
    """Tests for the registration endpoint and its side effects."""

    def setUp(self):
        """Clear the cache before each test."""
        cache.clear()

    def _payload(self, **overrides):
        """Build a registration payload with optional overrides."""
        data = {
            'email': 'hayk@example.com',
            'username': 'hayk',
            'display_name': 'Hayk',
            'date_of_birth': '2000-01-01',
            'gender': 'male',
            'password': 'StrongPass!123',
            'password_confirm': 'StrongPass!123',
        }
        data.update(overrides)
        return data

    def test_register_success(self):
        """Valid registration creates an unverified user."""
        resp = self.client.post('/api/auth/register/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertTrue(User.objects.filter(username='hayk').exists())
        user = User.objects.get(username='hayk')
        self.assertFalse(user.email_verified)

    def test_username_case_insensitive_unique(self):
        """Usernames are unique case-insensitively."""
        self.client.post('/api/auth/register/', self._payload(username='Hayk'), format='json')
        resp = self.client.post('/api/auth/register/', self._payload(username='hayk'), format='json')
        self.assertEqual(resp.status_code, 400)

    def test_password_mismatch(self):
        """Mismatched passwords are rejected."""
        resp = self.client.post('/api/auth/register/', self._payload(password_confirm='Other!123'), format='json')
        self.assertEqual(resp.status_code, 400)

    def test_display_name_invalid(self):
        """An invalid display name is rejected."""
        resp = self.client.post('/api/auth/register/', self._payload(display_name=' Arman '), format='json')
        self.assertEqual(resp.status_code, 400)

    def test_register_requires_date_of_birth(self):
        """Registration without date_of_birth is rejected."""
        payload = self._payload()
        payload.pop('date_of_birth')
        resp = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('date_of_birth', resp.data)

    def test_register_requires_gender(self):
        """Registration without gender is rejected."""
        payload = self._payload()
        payload.pop('gender')
        resp = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('gender', resp.data)

    def test_register_sends_verification_email(self):
        """Registration sends a verification email to the new user."""
        self.client.post('/api/auth/register/', self._payload(), format='json')
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('verify-email', mail.outbox[0].body)
        self.assertEqual(mail.outbox[0].to, ['hayk@example.com'])