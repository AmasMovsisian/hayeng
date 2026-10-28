from django.contrib.auth import login, logout, get_user_model
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


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = serializer.save()
        send_verification_email(user)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=LoginSerializer,
        responses={200: UserSerializer},
        tags=['auth'],
        description='Session-based login for web clients (Angular). Sets HttpOnly session cookie.',
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=None,
        responses={204: None},
        tags=['auth'],
        description='Session-based logout for web clients. Deletes the session.',
    )
    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        responses={200: UserSerializer},
        tags=['auth'],
        description='Returns the currently authenticated user.',
    )
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class EmailTokenObtainPairView(TokenObtainPairView):
    serializer_class = EmailTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]


class RefreshTokenView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class BlacklistTokenView(TokenBlacklistView):
    permission_classes = [permissions.AllowAny]


class VerifyEmailView(APIView):
    permission_classes = [permissions.AllowAny]

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


class ResendVerificationView(APIView):
    permission_classes = [permissions.AllowAny]

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