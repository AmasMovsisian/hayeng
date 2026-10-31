from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier

from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.db import connections
from django.test import TransactionTestCase, Client
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from accounts.models import User


class ConcurrentPasswordResetTests(TransactionTestCase):
    """Tests that two concurrent reset confirmations with the same token cannot both succeed."""

    reset_sequences = True

    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            email='race@example.com',
            username='raceuser',
            display_name='Race User',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            password='OldStrongPass!234',
        )
        self.uidb64 = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.token = default_token_generator.make_token(self.user)
        self.url = reverse('password-reset-confirm')

    def _post(self, barrier, new_password):
        """Fire the confirm request after all workers are ready."""
        client = Client()
        barrier.wait()
        response = client.post(self.url, {
            'uid': self.uidb64,
            'token': self.token,
            'new_password': new_password,
            'new_password_confirm': new_password,
        })
        connections.close_all()
        return response.status_code

    def test_only_one_concurrent_reset_succeeds(self):
        """Exactly one of two concurrent requests with the same token must succeed."""
        barrier = Barrier(2)
        passwords = ['RacePassOne!234', 'RacePassTwo!567']

        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [
                executor.submit(self._post, barrier, pwd) for pwd in passwords
            ]
            results = [f.result() for f in futures]

        self.assertEqual(sorted(results), sorted([200, 400]))

        self.user.refresh_from_db()
        matching = [
            pwd for pwd in passwords if self.user.check_password(pwd)
        ]
        self.assertEqual(len(matching), 1)

    def test_reused_token_is_rejected_after_successful_reset(self):
        """A token used once cannot be used again in a later request."""
        first = Client().post(self.url, {
            'uid': self.uidb64,
            'token': self.token,
            'new_password': 'FirstPass!234',
            'new_password_confirm': 'FirstPass!234',
        })
        self.assertEqual(first.status_code, 200)

        second = Client().post(self.url, {
            'uid': self.uidb64,
            'token': self.token,
            'new_password': 'SecondPass!567',
            'new_password_confirm': 'SecondPass!567',
        })
        self.assertEqual(second.status_code, 400)