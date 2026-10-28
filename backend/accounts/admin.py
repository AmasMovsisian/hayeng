from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('email', 'username', 'display_name', 'email_verified', 'is_staff', 'is_active')
    list_filter = ('email_verified', 'is_staff', 'is_active', 'gender')
    search_fields = ('email', 'username', 'display_name')
    ordering = ('email',)

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Hayeng profile', {
            'fields': ('display_name', 'email_verified', 'date_of_birth', 'gender'),
        }),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Hayeng profile', {
            'fields': ('email', 'display_name', 'date_of_birth', 'gender'),
        }),
    )