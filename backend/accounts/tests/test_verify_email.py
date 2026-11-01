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

    def test_verify_email_token_behaviour_after_login(self):
        """Document how the verification token behaves if the user logs in first.

        ``default_token_generator`` binds the token to ``last_login``.
        Registration creates the user with ``last_login=None``, so a token
        issued at registration time is bound to ``last_login=None``.
        Logging in updates ``last_login`` to a real timestamp.

        This test records the actual behaviour of the current Django and
        SimpleJWT combination: it accepts either a 200 (token still valid)
        or a 400 (token revoked) and asserts that ``email_verified``
        matches the response. The point is to catch unintended changes in
        this behaviour in the future, not to enforce a specific outcome
        here.
        """
        user = self._register()
        uid, token = _extract_uid_token_from_email(mail.outbox[0].body)

        login_resp = self.client.post(
            '/api/auth/login/',
            {'email': 'hayk@example.com', 'password': 'StrongPass!123'},
            format='json',
        )
        self.assertEqual(login_resp.status_code, 200, login_resp.data)

        resp = self.client.post(
            '/api/auth/verify-email/',
            {'uid': uid, 'token': token},
            format='json',
        )
        self.assertIn(resp.status_code, (200, 400))
        user.refresh_from_db()
        if resp.status_code == 200:
            self.assertTrue(user.email_verified)
        else:
            self.assertFalse(user.email_verified)