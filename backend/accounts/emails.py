from django.conf import settings
from django.core.mail import send_mail
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from django.contrib.auth.tokens import default_token_generator


def send_verification_email(user):
    """Send an email verification link to the given user."""
    uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    verify_path = reverse('verify-email-page')
    verify_url = f"{settings.FRONTEND_URL}{verify_path}?uid={uidb64}&token={token}"

    subject = 'Verify your Hayeng email'
    message = (
        f"Hi {user.display_name},\n\n"
        f"Please verify your email address by clicking the link below:\n\n"
        f"{verify_url}\n\n"
        f"If you did not register for Hayeng, you can ignore this email.\n\n"
        f"— The Hayeng Team"
    )
    send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )