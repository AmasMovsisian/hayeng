from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from rest_framework.test import APITestCase

User = get_user_model()


def _extract_uid_token_from_email(body):
    """Extract the uid and token from a verification email body."""
    import re
    match = re.search(r'uid=([^&]+)&token=([^\s]+)', body)
    if not match:
        raise AssertionError(f'Verification link not found in email body: {body!r}')
    return match.group(1), match.group(2)


class VerifyEmailTests(APITestCase):
    """Tests for the email verification endpoint."""

    def setUp(self):
        """Clear the cache before each test."""
        cache.clear()

    def _register(self):
        """Register a user and return the created instance."""
        payload = {
            'email': 'hayk@example.com',
            'username': 'hayk',
            'display_name': 'Hayk',
            'date_of_birth': '2000-01-01',
            'gender': 'male',
            'password': 'StrongPass!123',
            'password_confirm': 'StrongPass!123',
        }
        resp = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        return User.objects.get(email='hayk@example.com')

    def test_verify_email_success(self):
        """A valid uid and token verifies the email."""
        user = self._register()
        uid, token = _extract_uid_token_from_email(mail.outbox[0].body)
        resp = self.client.post('/api/auth/verify-email/', {'uid': uid, 'token': token}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)

    def test_verify_email_invalid_token(self):
        """An invalid token is rejected."""
        self._register()
        uid, _ = _extract_uid_token_from_email(mail.outbox[0].body)
        resp = self.client.post('/api/auth/verify-email/', {'uid': uid, 'token': 'bad-token'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_verify_email_tampered_uid(self):
        """A tampered uid is rejected."""
        self._register()
        _, token = _extract_uid_token_from_email(mail.outbox[0].body)
        resp = self.client.post('/api/auth/verify-email/', {'uid': 'garbage', 'token': token}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_verify_email_idempotent(self):
        """Repeating verification with the same token still returns 200."""
        user = self._register()
        uid, token = _extract_uid_token_from_email(mail.outbox[0].body)
        self.client.post('/api/auth/verify-email/', {'uid': uid, 'token': token}, format='json')
        resp = self.client.post('/api/auth/verify-email/', {'uid': uid, 'token': token}, format='json')
        self.assertEqual(resp.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)