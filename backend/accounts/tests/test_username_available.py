from datetime import date

from django.core.cache import cache
from django.test import TestCase, Client
from django.urls import reverse
from rest_framework import status

from accounts.models import User


class UsernameAvailableTests(TestCase):
    """Tests for the username availability endpoint."""

    def setUp(self):
        cache.clear()
        self.client = Client()
        self.url = reverse('username-available')
        self.existing = User.objects.create_user(
            email='existing@example.com',
            username='hayk',
            display_name='Hayk',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            password='StrongPass!234',
        )

    def test_available_username_returns_true(self):
        """A free, well-formed username reports as available."""
        response = self.client.get(self.url, {'username': 'newuser'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['available'])
        self.assertEqual(response.data['username'], 'newuser')

    def test_taken_username_returns_false(self):
        """An existing username reports as unavailable."""
        response = self.client.get(self.url, {'username': 'hayk'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['available'])

    def test_taken_username_is_case_insensitive(self):
        """Case variations of an existing username are treated as taken."""
        response = self.client.get(self.url, {'username': 'HayK'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['available'])
        self.assertEqual(response.data['username'], 'hayk')

    def test_too_short_username_returns_400(self):
        """Usernames shorter than three characters are rejected."""
        response = self.client.get(self.url, {'username': 'ab'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_username_starting_with_digit_returns_400(self):
        """Usernames starting with a digit are rejected."""
        response = self.client.get(self.url, {'username': '1abc'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_username_with_invalid_characters_returns_400(self):
        """Usernames containing characters other than letters, digits, underscore are rejected."""
        response = self.client.get(self.url, {'username': 'hayk-m'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_too_long_username_returns_400(self):
        """Usernames longer than thirty characters are rejected."""
        response = self.client.get(self.url, {'username': 'a' + 'b' * 30})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_username_returns_400(self):
        """A missing username parameter is rejected."""
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_rate_limit_blocks_after_sixty_requests(self):
        """The sixty-first request within the window is throttled."""
        for _ in range(60):
            self.client.get(self.url, {'username': 'hayk'})
        response = self.client.get(self.url, {'username': 'hayk'})
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)