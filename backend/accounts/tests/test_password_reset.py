from datetime import date

from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.cache import cache
from django.test import TestCase, Client
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import User


class PasswordResetRequestTests(TestCase):
    """Tests for the password reset request endpoint."""

    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = User.objects.create_user(
            email='reset@example.com',
            username='resetuser',
            display_name='Reset User',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            password='OldStrongPass!234',
        )
        self.url = reverse('password-reset')

    def test_known_email_sends_mail(self):
        """A reset email is sent for a registered address."""
        response = self.client.post(self.url, {'email': 'reset@example.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('reset', mail.outbox[0].subject.lower())
        self.assertIn('uid=', mail.outbox[0].body)
        self.assertIn('token=', mail.outbox[0].body)

    def test_unknown_email_returns_200_without_mail(self):
        """Unknown addresses receive the same 200 response but no email."""
        response = self.client.post(self.url, {'email': 'nobody@example.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_invalid_email_format_returns_400_without_mail(self):
        """Malformed email addresses are rejected by field validation, no mail is sent."""
        response = self.client.post(self.url, {'email': 'not-an-email'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
        self.assertEqual(len(mail.outbox), 0)

    def test_inactive_user_receives_no_mail(self):
        """Inactive accounts do not receive reset emails."""
        self.user.is_active = False
        self.user.save(update_fields=['is_active'])
        response = self.client.post(self.url, {'email': 'reset@example.com'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(mail.outbox), 0)

    def test_rate_limit_blocks_after_three_requests(self):
        """The fourth request within the window is throttled."""
        for _ in range(3):
            self.client.post(self.url, {'email': 'reset@example.com'})
        response = self.client.post(self.url, {'email': 'reset@example.com'})
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)


class PasswordResetConfirmTests(TestCase):
    """Tests for the password reset confirmation endpoint."""

    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = User.objects.create_user(
            email='confirm@example.com',
            username='confirmuser',
            display_name='Confirm User',
            date_of_birth=date(2000, 1, 1),
            gender='female',
            password='OldStrongPass!234',
        )
        self.url = reverse('password-reset-confirm')
        self.uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = default_token_generator.make_token(self.user)

    def _payload(self, **overrides):
        """Build a valid confirmation payload with optional overrides."""
        data = {
            'uid': self.uidb64,
            'token': self.token,
            'new_password': 'NewStrongPass!567',
            'new_password_confirm': 'NewStrongPass!567',
        }
        data.update(overrides)
        return data

    def test_successful_reset_sets_new_password(self):
        """A valid token and strong password reset the account."""
        response = self.client.post(self.url, self._payload())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('NewStrongPass!567'))

    def test_login_with_new_password_works(self):
        """After a successful reset the user can authenticate with the new password."""
        self.client.post(self.url, self._payload())
        logged_in = self.client.login(
            email='confirm@example.com',
            password='NewStrongPass!567',
        )
        self.assertTrue(logged_in)

    def test_invalid_token_returns_400(self):
        """A wrong token is rejected with a generic message."""
        response = self.client.post(self.url, self._payload(token='bad-token'))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('OldStrongPass!234'))

    def test_token_invalid_after_password_change(self):
        """The reset token cannot be reused after a successful reset."""
        self.client.post(self.url, self._payload())
        reuse = self.client.post(self.url, self._payload())
        self.assertEqual(reuse.status_code, status.HTTP_400_BAD_REQUEST)

    def test_weak_password_returns_400(self):
        """Weak passwords are rejected with validator errors."""
        response = self.client.post(self.url, self._payload(
            new_password='123',
            new_password_confirm='123',
        ))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('OldStrongPass!234'))

    def test_missing_confirmation_returns_400(self):
        """A missing confirmation field is rejected."""
        response = self.client.post(self.url, {
            'uid': self.uidb64,
            'token': self.token,
            'new_password': 'NewStrongPass!567',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_mismatched_passwords_returns_400(self):
        """Mismatched passwords are rejected."""
        response = self.client.post(self.url, self._payload(
            new_password_confirm='DifferentPass!890',
        ))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_refresh_token_revoked_after_reset(self):
        """A refresh token issued before the reset can no longer be used."""
        refresh = RefreshToken.for_user(self.user)
        old_refresh = str(refresh)

        self.client.post(self.url, self._payload())

        refresh_url = reverse('token_refresh')
        response = self.client.post(refresh_url, {'refresh': old_refresh})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class PasswordResetCsrfTests(TestCase):
    """Tests that the reset endpoints enforce CSRF protection."""

    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)

    def test_request_requires_csrf(self):
        """Missing CSRF token on the reset request is rejected."""
        response = self.client.post(reverse('password-reset'), {'email': 'x@example.com'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_confirm_requires_csrf(self):
        """Missing CSRF token on the reset confirmation is rejected."""
        response = self.client.post(reverse('password-reset-confirm'), {
            'uid': 'abc',
            'token': 'def',
            'new_password': 'NewStrongPass!567',
            'new_password_confirm': 'NewStrongPass!567',
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)