from django.contrib.auth import login, logout, get_user_model
from django.db import IntegrityError, transaction
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenBlacklistView,
)

from ..emails import send_verification_email
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserSerializer,
    EmailTokenObtainPairSerializer,
    VerifyEmailSerializer,
    ResendVerificationSerializer,
)

User = get_user_model()


@method_decorator(csrf_protect, name='dispatch')
class RegisterView(generics.CreateAPIView):
    """API view for user registration with email verification."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'register'

    def create(self, request, *args, **kwargs):
        """Create a user and handle race-condition integrity errors."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            with transaction.atomic():
                self.perform_create(serializer)
        except IntegrityError as exc:
            msg = str(exc).lower()
            if 'email' in msg:
                raise serializers.ValidationError(
                    {'email': 'This email is already registered.'}
                )
            if 'username' in msg:
                raise serializers.ValidationError(
                    {'username': 'This username is already taken.'}
                )
            raise serializers.ValidationError(
                {'detail': 'Registration failed due to a concurrent request. Please try again.'}
            )
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        """Save the new user and send a verification email."""
        user = serializer.save()
        send_verification_email(user)


class CsrfTokenView(APIView):
    """API view that issues a CSRF token cookie."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        responses={204: None},
        tags=['auth'],
        description='Sets the csrftoken cookie. Frontend must call this before any POST/PUT/DELETE request.',
    )
    def get(self, request):
        """Set the CSRF cookie and return 204."""
        get_token(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_protect, name='dispatch')
class LoginView(APIView):
    """Session-based login view for web clients."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = 'login'

    @extend_schema(
        request=LoginSerializer,
        responses={200: UserSerializer},
        tags=['auth'],
        description='Session-based login for web clients (Angular). Sets HttpOnly session cookie.',
    )
    def post(self, request):
        """Authenticate the user and start a session."""
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


@method_decorator(csrf_protect, name='dispatch')
class LogoutView(APIView):
    """Session-based logout view for web clients."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=None,
        responses={204: None},
        tags=['auth'],
        description='Session-based logout for web clients. Deletes the session.',
    )
    def post(self, request):
        """End the current session."""
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """API view returning the currently authenticated user."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses={200: UserSerializer},
        tags=['auth'],
        description='Returns the currently authenticated user.',
    )
    def get(self, request):
        """Return serialized data of the authenticated user."""
        return Response(UserSerializer(request.user).data)


class EmailTokenObtainPairView(TokenObtainPairView):
    """JWT token view using email-based authentication."""

    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = 'login'


class RefreshTokenView(TokenRefreshView):
    """JWT token refresh view."""

    permission_classes = [permissions.AllowAny]


class BlacklistTokenView(TokenBlacklistView):
    """JWT token blacklist view."""

    permission_classes = [permissions.AllowAny]


@method_decorator(csrf_protect, name='dispatch')
class VerifyEmailView(APIView):
    """API view that verifies a user's email address."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = 'verify-email'

    @extend_schema(
        request=VerifyEmailSerializer,
        responses={
            200: inline_serializer(
                name='VerifyEmailResponse',
                fields={
                    'detail': serializers.CharField(),
                    'email_verified': serializers.BooleanField(),
                },
            )
        },
        tags=['auth'],
        description='Verifies the email address using uid + token from the verification email. Idempotent.',
    )
    def post(self, request):
        """Mark the user's email as verified (idempotent)."""
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        if not user.email_verified:
            user.email_verified = True
            user.save(update_fields=['email_verified'])
        return Response(
            {'detail': 'Email verified successfully.', 'email_verified': True},
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_protect, name='dispatch')
class ResendVerificationView(APIView):
    """API view that resends the email verification link."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = 'resend-verification'

    @extend_schema(
        request=ResendVerificationSerializer,
        responses={
            200: inline_serializer(
                name='ResendVerificationResponse',
                fields={'detail': serializers.CharField()},
            )
        },
        tags=['auth'],
        description='Resends the verification email. Always returns 200 to prevent email enumeration.',
    )
    def post(self, request):
        """Resend verification email without leaking account existence."""
        serializer = ResendVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email'].lower().strip()
        user = User.objects.filter(email__iexact=email).first()
        if user is not None and not user.email_verified and user.is_active:
            send_verification_email(user)
        return Response(
            {'detail': 'If the email is registered and unverified, a new link has been sent.'},
            status=status.HTTP_200_OK,
        )