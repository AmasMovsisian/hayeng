from datetime import date

from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.test import TestCase, Client
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from freezegun import freeze_time
from rest_framework import status

from accounts.models import User


class AccessTokenLifetimeAfterPasswordResetTests(TestCase):
    """Tests how pre-reset access tokens behave after a password reset.

    With CHECK_REVOKE_TOKEN enabled, SimpleJWT compares the password hash
    embedded in the token claim against the current hash on every request.
    A password reset therefore invalidates existing access tokens immediately,
    which is stricter than the expiry-based assumption in ADR 0007.
    """

    def setUp(self):
        cache.clear()
        self.client = Client()
        self.user = User.objects.create_user(
            email='accesstoken@example.com',
            username='accesstoken',
            display_name='Access Token',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            password='OldStrongPass!234',
        )

    def _obtain_access_token(self):
        """Log in via the JWT endpoint and return the access token string."""
        response = self.client.post(reverse('token_obtain_pair'), {
            'email': 'accesstoken@example.com',
            'password': 'OldStrongPass!234',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data['access']

    def _reset_password(self):
        """Perform a password reset for the test user."""
        self.user.refresh_from_db()
        uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        token = default_token_generator.make_token(self.user)
        response = self.client.post(reverse('password-reset-confirm'), {
            'uid': uidb64,
            'token': token,
            'new_password': 'NewStrongPass!567',
            'new_password_confirm': 'NewStrongPass!567',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def _call_me_with_token(self, access_token):
        """Call /me with the given bearer token."""
        return self.client.get(
            reverse('me'),
            HTTP_AUTHORIZATION=f'Bearer {access_token}',
        )

    def test_access_token_rejected_immediately_after_reset(self):
        """A pre-reset access token is rejected right after the password reset."""
        access = self._obtain_access_token()
        self._reset_password()

        response = self._call_me_with_token(access)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @freeze_time('2026-01-01 12:00:00')
    def test_access_token_rejected_after_expiry(self):
        """A pre-reset access token is rejected once it has expired."""
        access = self._obtain_access_token()

        with freeze_time('2026-01-01 12:16:00'):
            response = self._call_me_with_token(access)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)