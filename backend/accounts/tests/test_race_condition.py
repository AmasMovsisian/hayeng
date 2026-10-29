from unittest.mock import patch
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import IntegrityError
from rest_framework.test import APITestCase

User = get_user_model()


class RaceConditionTests(APITestCase):
    """Tests for handling IntegrityError when two requests race."""

    def setUp(self):
        """Clear the cache before each test."""
        cache.clear()

    def _payload(self, **overrides):
        """Build a registration payload with optional overrides."""
        data = {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'display_name': 'New User',
            'date_of_birth': '2000-01-01',
            'gender': 'male',
            'password': 'StrongPass!123',
            'password_confirm': 'StrongPass!123',
        }
        data.update(overrides)
        return data

    def test_integrity_error_on_email_returns_400(self):
        """A duplicate-email IntegrityError maps to a 400 email error."""
        with patch(
            'accounts.api.serializers.RegisterSerializer.create',
            side_effect=IntegrityError(
                'duplicate key value violates unique constraint "accounts_user_email_key"'
            ),
        ):
            resp = self.client.post('/api/auth/register/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 400, resp.data)
        self.assertIn('email', resp.data)
        self.assertIn('already registered', str(resp.data['email']).lower())

    def test_integrity_error_on_username_returns_400(self):
        """A duplicate-username IntegrityError maps to a 400 username error."""
        with patch(
            'accounts.api.serializers.RegisterSerializer.create',
            side_effect=IntegrityError(
                'duplicate key value violates unique constraint "unique_username_ci"'
            ),
        ):
            resp = self.client.post('/api/auth/register/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 400, resp.data)
        self.assertIn('username', resp.data)
        self.assertIn('already taken', str(resp.data['username']).lower())

    def test_integrity_error_unknown_returns_generic_400(self):
        """An unknown IntegrityError maps to a generic 400 detail error."""
        with patch(
            'accounts.api.serializers.RegisterSerializer.create',
            side_effect=IntegrityError('some other constraint'),
        ):
            resp = self.client.post('/api/auth/register/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 400, resp.data)
        self.assertIn('detail', resp.data)

    def test_successful_registration_no_transaction_error(self):
        """A normal registration succeeds and creates the user."""
        with patch('accounts.api.views.send_verification_email'):
            resp = self.client.post('/api/auth/register/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())