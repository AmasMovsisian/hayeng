import re
from datetime import date
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    date_of_birth = serializers.DateField(required=True)
    gender = serializers.ChoiceField(choices=['male', 'female'], required=True)

    class Meta:
        model = User
        fields = [
            'email', 'username', 'display_name', 'date_of_birth', 'gender',
            'password', 'password_confirm',
        ]
        extra_kwargs = {
            'display_name': {'trim_whitespace': False},
        }

    def validate_email(self, value):
        normalized = value.lower().strip()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError('This email is already registered.')
        return normalized

    def validate_username(self, value):
        if not re.fullmatch(r'[A-Za-z][A-Za-z0-9_]*', value):
            raise serializers.ValidationError(
                'Username must start with a letter and contain only letters, numbers, and underscores.'
            )
        if len(value) < 3 or len(value) > 30:
            raise serializers.ValidationError('Username must be 3-30 characters.')
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('This username is already taken.')
        return value.lower()

    def validate_date_of_birth(self, value):
        if value is None:
            raise serializers.ValidationError('Date of birth is required.')
        today = date.today()
        if value > today:
            raise serializers.ValidationError('Date of birth cannot be in the future.')
        age = today.year - value.year - ((today.month, today.day) < (value.month, value.day))
        if age < 7:
            raise serializers.ValidationError('You must be at least 7 years old.')
        if age > 120:
            raise serializers.ValidationError('Please enter a valid date of birth.')
        return value

    def validate_display_name(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Display name is required.')

        if len(value) > 32:
            raise serializers.ValidationError('Display name must be at most 32 characters.')

        if value != value.strip():
            raise serializers.ValidationError('Display name cannot start or end with spaces.')

        if '  ' in value:
            raise serializers.ValidationError('Display name cannot contain consecutive spaces.')

        if not re.fullmatch(r'[\w \-]+', value):
            raise serializers.ValidationError('Display name contains invalid characters.')

        if re.search(r'^[-_]|[-_]$|[-_]{2,}|[-_] | [-_]', value):
            raise serializers.ValidationError('Separators cannot be at the edges or repeated.')

        if len(value.split(' ')) > 2:
            raise serializers.ValidationError('Display name can have at most two parts.')

        return value

    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match.'})
        return data

    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data['email'].lower().strip()
        password = data['password']
        user = authenticate(
            request=self.context.get('request'),
            username=email,
            password=password,
        )
        if user is None:
            raise serializers.ValidationError({'detail': 'Invalid email or password.'})
        if not user.is_active:
            raise serializers.ValidationError({'detail': 'Account is inactive.'})
        data['user'] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'display_name',
            'date_of_birth', 'gender', 'email_verified',
        ]
        read_only_fields = fields


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['display_name'] = user.display_name
        token['email'] = user.email
        return token


class VerifyEmailSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()

    def validate(self, data):
        try:
            uid = force_str(urlsafe_base64_decode(data['uid']))
            user = User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            raise serializers.ValidationError({'detail': 'Invalid verification link.'})

        if not default_token_generator.check_token(user, data['token']):
            raise serializers.ValidationError({'detail': 'Invalid or expired verification link.'})

        data['user'] = user
        return data


class ResendVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()