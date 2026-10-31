from datetime import date

from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.test import TestCase, Client
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import status

from accounts.models import User


class SessionInvalidationAfterPasswordResetTests(TestCase):
    """Tests that a password reset invalidates existing Django sessions."""

    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = User.objects.create_user(
            email='sessionreset@example.com',
            username='sessionreset',
            display_name='Session Reset',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            password='OldStrongPass!234',
        )

    def _make_valid_token(self):
        """Return a reset token that matches the user's current last_login."""
        self.user.refresh_from_db()
        uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        return uidb64, token

    def test_existing_session_is_invalidated_after_reset(self):
        """An active session stops being authenticated after a password reset."""
        logged_in = self.client.login(
            email='sessionreset@example.com',
            password='OldStrongPass!234',
        )
        self.assertTrue(logged_in)

        me_response = self.client.get(reverse('me'))
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)

        uidb64, token = self._make_valid_token()
        confirm_response = self.client.post(reverse('password-reset-confirm'), {
            'uid': uidb64,
            'token': token,
            'new_password': 'NewStrongPass!567',
            'new_password_confirm': 'NewStrongPass!567',
        })
        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)

        after_response = self.client.get(reverse('me'))
        self.assertIn(
            after_response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )

    def test_session_does_not_authenticate_after_reset_even_without_relogin(self):
        """The old session cookie alone must not authenticate after the reset."""
        self.client.login(
            email='sessionreset@example.com',
            password='OldStrongPass!234',
        )
        old_session_cookie = self.client.cookies.get('sessionid')
        self.assertIsNotNone(old_session_cookie)

        uidb64, token = self._make_valid_token()
        confirm_response = self.client.post(reverse('password-reset-confirm'), {
            'uid': uidb64,
            'token': token,
            'new_password': 'NewStrongPass!567',
            'new_password_confirm': 'NewStrongPass!567',
        })
        self.assertEqual(confirm_response.status_code, status.HTTP_200_OK)

        fresh_client = Client()
        if old_session_cookie is not None:
            fresh_client.cookies['sessionid'] = old_session_cookie.value
        after_response = fresh_client.get(reverse('me'))
        self.assertIn(
            after_response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )