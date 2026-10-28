from django.urls import path

from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    MeView,
    EmailTokenObtainPairView,
    RefreshTokenView,
    BlacklistTokenView,
    VerifyEmailView,
    ResendVerificationView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),

    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', MeView.as_view(), name='me'),

    path('token/', EmailTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', RefreshTokenView.as_view(), name='token_refresh'),
    path('token/blacklist/', BlacklistTokenView.as_view(), name='token_blacklist'),

    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification/', ResendVerificationView.as_view(), name='resend-verification'),
]