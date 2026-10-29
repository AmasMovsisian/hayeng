from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models import UniqueConstraint
from django.db.models.functions import Lower


class User(AbstractUser):
    """Custom user model using email as the login identifier."""

    email = models.EmailField(unique=True)
    username = models.CharField(max_length=30)
    display_name = models.CharField(max_length=32)
    email_verified = models.BooleanField(default=False)
    date_of_birth = models.DateField(null=False, blank=False)
    gender = models.CharField(
        max_length=10,
        choices=[('male', 'Male'), ('female', 'Female')],
        blank=False,
    )

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'display_name', 'date_of_birth', 'gender']

    class Meta:
        constraints = [
            UniqueConstraint(Lower('username'), name='unique_username_ci'),
        ]

    def save(self, *args, **kwargs):
        """Normalize username and email to lowercase before saving."""
        if self.username:
            self.username = self.username.lower()
        if self.email:
            self.email = self.email.lower()
        super().save(*args, **kwargs)