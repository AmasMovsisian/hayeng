from datetime import date
from django.contrib.auth import get_user_model
from django.core import mail
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


def _extract_uid_token_from_email(body):
    import re
    match = re.search(r'uid=([^&]+)&token=([^\s]+)', body)
    if not match:
        raise AssertionError(f'Verification link not found in email body: {body!r}')
    return match.group(1), match.group(2)


class RegisterTests(APITestCase):
    def _payload(self, **overrides):
        data = {
            'email': 'hayk@example.com',
            'username': 'hayk',
            'display_name': 'Hayk',
            'date_of_birth': '2000-01-01',
            'gender': 'male',
            'password': 'StrongPass!123',
            'password_confirm': 'StrongPass!123',
        }
        data.update(overrides)
        return data

    def test_register_success(self):
        resp = self.client.post('/api/auth/register/', self._payload(), format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertTrue(User.objects.filter(username='hayk').exists())
        user = User.objects.get(username='hayk')
        self.assertFalse(user.email_verified)

    def test_username_case_insensitive_unique(self):
        self.client.post('/api/auth/register/', self._payload(username='Hayk'), format='json')
        resp = self.client.post('/api/auth/register/', self._payload(username='hayk'), format='json')
        self.assertEqual(resp.status_code, 400)

    def test_password_mismatch(self):
        resp = self.client.post('/api/auth/register/', self._payload(password_confirm='Other!123'), format='json')
        self.assertEqual(resp.status_code, 400)

    def test_display_name_invalid(self):
        resp = self.client.post('/api/auth/register/', self._payload(display_name=' Arman '), format='json')
        self.assertEqual(resp.status_code, 400)

    def test_register_requires_date_of_birth(self):
        payload = self._payload()
        payload.pop('date_of_birth')
        resp = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('date_of_birth', resp.data)

    def test_register_requires_gender(self):
        payload = self._payload()
        payload.pop('gender')
        resp = self.client.post('/api/auth/register/', payload, format='json')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('gender', resp.data)

    def test_register_sends_verification_email(self):
        self.client.post('/api/auth/register/', self._payload(), format='json')
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('verify-email', mail.outbox[0].body)
        self.assertEqual(mail.outbox[0].to, ['hayk@example.com'])


class LoginSessionTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='hayk@example.com',
            username='hayk',
            display_name='Hayk',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            password='StrongPass!123',
        )

    def test_login_success_sets_session(self):
        resp = self.client.post('/api/auth/login/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['username'], 'hayk')
        self.assertNotIn('password', resp.data)
        self.assertIn('sessionid', self.client.cookies)

    def test_login_wrong_password(self):
        resp = self.client.post('/api/auth/login/', {
            'email': 'hayk@example.com',
            'password': 'wrong',
        }, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_login_email_case_insensitive(self):
        resp = self.client.post('/api/auth/login/', {
            'email': 'HAYK@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        self.assertEqual(resp.status_code, 200)

    def test_me_requires_auth(self):
        resp = self.client.get('/api/auth/me/')
        self.assertEqual(resp.status_code, 401)

    def test_me_returns_user_after_login(self):
        self.client.post('/api/auth/login/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        resp = self.client.get('/api/auth/me/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['username'], 'hayk')
        self.assertFalse(resp.data['email_verified'])

    def test_logout_clears_session(self):
        self.client.post('/api/auth/login/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        resp = self.client.post('/api/auth/logout/')
        self.assertEqual(resp.status_code, 204)
        resp = self.client.get('/api/auth/me/')
        self.assertEqual(resp.status_code, 401)


class LoginJWTTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='hayk@example.com',
            username='hayk',
            display_name='Hayk',
            date_of_birth=date(2000, 1, 1),
            gender='male',
            password='StrongPass!123',
        )

    def test_token_obtain(self):
        resp = self.client.post('/api/auth/token/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_token_wrong_password(self):
        resp = self.client.post('/api/auth/token/', {
            'email': 'hayk@example.com',
            'password': 'wrong',
        }, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_token_refresh(self):
        r = self.client.post('/api/auth/token/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        refresh = r.data['refresh']
        resp = self.client.post('/api/auth/token/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('access', resp.data)

    def test_token_blacklist(self):
        r = self.client.post('/api/auth/token/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        refresh = r.data['refresh']
        resp = self.client.post('/api/auth/token/blacklist/', {'refresh': refresh}, format='json')
        self.assertEqual(resp.status_code, 200)
        resp = self.client.post('/api/auth/token/refresh/', {'refresh': refresh}, format='json')
        self.assertEqual(resp.status_code, 401)

    def test_token_contains_custom_claims(self):
        import jwt
        r = self.client.post('/api/auth/token/', {
            'email': 'hayk@example.com',
            'password': 'StrongPass!123',
        }, format='json')
        claims = jwt.decode(r.data['access'], options={"verify_signature": False})
        self.assertEqual(claims['username'], 'hayk')
        self.assertEqual(claims['display_name'], 'Hayk')


class VerifyEmailTests(APITestCase):
    def _register(self):
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
        user = self._register()
        uid, token = _extract_uid_token_from_email(mail.outbox[0].body)
        resp = self.client.post('/api/auth/verify-email/', {'uid': uid, 'token': token}, format='json')
        self.assertEqual(resp.status_code, 200, resp.data)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)

    def test_verify_email_invalid_token(self):
        self._register()
        uid, _ = _extract_uid_token_from_email(mail.outbox[0].body)
        resp = self.client.post('/api/auth/verify-email/', {'uid': uid, 'token': 'bad-token'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_verify_email_tampered_uid(self):
        self._register()
        _, token = _extract_uid_token_from_email(mail.outbox[0].body)
        resp = self.client.post('/api/auth/verify-email/', {'uid': 'garbage', 'token': token}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_verify_email_idempotent(self):
        user = self._register()
        uid, token = _extract_uid_token_from_email(mail.outbox[0].body)
        self.client.post('/api/auth/verify-email/', {'uid': uid, 'token': token}, format='json')
        resp = self.client.post('/api/auth/verify-email/', {'uid': uid, 'token': token}, format='json')
        self.assertEqual(resp.status_code, 200)
        user.refresh_from_db()
        self.assertTrue(user.email_verified)


class ResendVerificationTests(APITestCase):
    def _register(self):
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
        self._register()
        resp = self.client.post('/api/auth/resend-verification/', {'email': 'hayk@example.com'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)

    def test_resend_verification_unknown_email_still_200(self):
        resp = self.client.post('/api/auth/resend-verification/', {'email': 'nobody@example.com'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_resend_verification_already_verified_no_email(self):
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