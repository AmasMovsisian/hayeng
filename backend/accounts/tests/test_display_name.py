from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APITestCase

User = get_user_model()


class DisplayNameValidationTests(APITestCase):
    """Tests for display_name validation rules."""

    def setUp(self):
        """Clear the cache before each test."""
        cache.clear()

    def _payload(self, display_name):
        """Build a registration payload with the given display name."""
        return {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'display_name': display_name,
            'date_of_birth': '2000-01-01',
            'gender': 'male',
            'password': 'StrongPass!123',
            'password_confirm': 'StrongPass!123',
        }

    def _assert_accepted(self, display_name):
        """Assert that the display name is accepted on registration."""
        resp = self.client.post('/api/auth/register/', self._payload(display_name), format='json')
        self.assertEqual(resp.status_code, 201, f'{display_name!r} should be accepted: {resp.data}')

    def _assert_rejected(self, display_name):
        """Assert that the display name is rejected with a field error."""
        resp = self.client.post('/api/auth/register/', self._payload(display_name), format='json')
        self.assertEqual(resp.status_code, 400, f'{display_name!r} should be rejected')
        self.assertIn('display_name', resp.data)

    def test_single_name_accepted(self):
        """A single-word name is accepted."""
        self._assert_accepted('Hayk')

    def test_two_part_name_accepted(self):
        """A two-part name is accepted."""
        self._assert_accepted('Hayk Movsisyan')

    def test_hyphenated_name_accepted(self):
        """A hyphenated name is accepted."""
        self._assert_accepted('Hayk-Movsisyan')

    def test_underscore_name_accepted(self):
        """An underscore-separated name is accepted."""
        self._assert_accepted('Hayk_Movsisyan')

    def test_armenian_name_accepted(self):
        """An Armenian two-part name is accepted."""
        self._assert_accepted('Հայկ Մովսիսյան')

    def test_armenian_single_accepted(self):
        """An Armenian single name is accepted."""
        self._assert_accepted('Հայկ')

    def test_digits_rejected(self):
        """Names containing digits are rejected."""
        self._assert_rejected('Hayk123')

    def test_digit_in_middle_rejected(self):
        """Names with a digit in the middle are rejected."""
        self._assert_rejected('Hayk2Movsisyan')

    def test_leading_space_rejected(self):
        """Names with a leading space are rejected."""
        self._assert_rejected(' Hayk')

    def test_trailing_space_rejected(self):
        """Names with a trailing space are rejected."""
        self._assert_rejected('Hayk ')

    def test_consecutive_spaces_rejected(self):
        """Names with consecutive spaces are rejected."""
        self._assert_rejected('Hayk  Movsisyan')

    def test_leading_hyphen_rejected(self):
        """Names with a leading hyphen are rejected."""
        self._assert_rejected('-Hayk')

    def test_trailing_hyphen_rejected(self):
        """Names with a trailing hyphen are rejected."""
        self._assert_rejected('Hayk-')

    def test_leading_underscore_rejected(self):
        """Names with a leading underscore are rejected."""
        self._assert_rejected('_Hayk')

    def test_trailing_underscore_rejected(self):
        """Names with a trailing underscore are rejected."""
        self._assert_rejected('Hayk_')

    def test_double_hyphen_rejected(self):
        """Names with a double hyphen are rejected."""
        self._assert_rejected('Hayk--Movsisyan')

    def test_double_underscore_rejected(self):
        """Names with a double underscore are rejected."""
        self._assert_rejected('Hayk__Movsisyan')

    def test_hyphen_before_space_rejected(self):
        """Names with a hyphen before a space are rejected."""
        self._assert_rejected('Hayk- Movsisyan')

    def test_hyphen_after_space_rejected(self):
        """Names with a hyphen after a space are rejected."""
        self._assert_rejected('Hayk -Movsisyan')

    def test_three_parts_rejected(self):
        """Names with more than two parts are rejected."""
        self._assert_rejected('Hayk Movsisyan Test')

    def test_only_spaces_rejected(self):
        """Names consisting only of spaces are rejected."""
        self._assert_rejected('   ')

    def test_empty_rejected(self):
        """Empty names are rejected."""
        self._assert_rejected('')

    def test_special_chars_rejected(self):
        """Names with special characters are rejected."""
        self._assert_rejected('Hayk!')

    def test_too_long_rejected(self):
        """Names exceeding 32 characters are rejected."""
        self._assert_rejected('A' * 33)

    def test_max_length_accepted(self):
        """Names with exactly 32 characters are accepted."""
        self._assert_accepted('A' * 32)