from datetime import date
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from rest_framework.test import APITestCase

User = get_user_model()


class ResendVerificationTests(APITestCase):
    """Tests for the resend-verification endpoint."""

    def setUp(self):
        """Clear the cache before each test."""
        cache.clear()

    def _register(self):
        """Register a user, then clear the mail outbox."""
        payload = {
            'email': 'hayk@example.com',
            'username': 'hayk',
            'display_name': 'Hayk',
            'date_of_birth': '2000-01-01',
            'gender': 'male',
            'password': 'StrongPass!123',
            'password_confirm': 'StrongPass!123',
        }
        self.client.post('/api/auth/register/', payload, format='json')
        mail.outbox.clear()

    def test_resend_verification_sends_new_email(self):
        """Resending verification for an unverified user sends an email."""
        self._register()
        resp = self.client.post('/api/auth/resend-verification/', {'email': 'hayk@example.com'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_verification_unknown_email_still_200(self):
        """Unknown emails still return 200 and send no mail."""
        resp = self.client.post('/api/auth/resend-verification/', {'email': 'nobody@example.com'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_resend_verification_already_verified_no_email(self):
        """Already-verified users get no new email but still a 200."""
        user = User.objects.create_user(
            email='hayk@example.com',
            username='hayk',
            display_name='Hayk',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            password='StrongPass!123',
            email_verified=True,
        )
        resp = self.client.post('/api/auth/resend-verification/', {'email': 'hayk@example.com'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)