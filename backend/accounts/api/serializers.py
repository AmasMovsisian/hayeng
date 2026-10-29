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
    """Serializer for user registration with validation."""

    password = serializers.CharField(write_only=True)
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
        """Validate and normalize the email address."""
        normalized = value.lower().strip()
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError('This email is already registered.')
        return normalized

    def validate_username(self, value):
        """Validate username format, length and uniqueness."""
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
        """Validate date of birth and age constraints."""
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
        """Validate display name format, length and allowed characters."""
        if not value or not value.strip():
            raise serializers.ValidationError('Display name is required.')

        if len(value) > 32:
            raise serializers.ValidationError('Display name must be at most 32 characters.')

        if value != value.strip():
            raise serializers.ValidationError('Display name cannot start or end with spaces.')

        if '  ' in value:
            raise serializers.ValidationError('Display name cannot contain consecutive spaces.')

        if not re.fullmatch(r"[^\W\d_]+(?:[ \-_][^\W\d_]+)*", value):
            raise serializers.ValidationError(
                'Display name may contain only letters, spaces, hyphens, and underscores.'
            )

        if re.search(r'^[-_]|[-_]$|[-_]{2,}|[-_] | [-_]', value):
            raise serializers.ValidationError('Separators cannot be at the edges or repeated.')

        if len(value.split(' ')) > 2:
            raise serializers.ValidationError('Display name can have at most two parts.')

        if re.search(r'\d', value):
            raise serializers.ValidationError('Display name cannot contain digits.')

        return value

    def validate(self, data):
        """Cross-field validation for password rules and confirmation."""
        errors = {}

        user = User(
            email=data.get('email', ''),
            username=data.get('username', ''),
            display_name=data.get('display_name', ''),
        )
        try:
            validate_password(data.get('password', ''), user=user)
        except serializers.ValidationError as exc:
            errors['password'] = list(exc.detail)

        if data.get('password') != data.get('password_confirm'):
            errors['password_confirm'] = 'Passwords do not match.'

        if errors:
            raise serializers.ValidationError(errors)

        return data

    def create(self, validated_data):
        """Create a new user with a hashed password."""
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user