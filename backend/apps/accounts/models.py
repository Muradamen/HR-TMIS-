from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils.translation import gettext_lazy as _

class User(AbstractUser):
    ROLE_CHOICES = [
        ('DATA_ENCODER', _('Data Encoder')),
        ('DIRECTOR', _('Director of Trader Control')),
        ('AGENCY_LEADER', _('Agency Leader')),
        ('SYSTEM_ADMINISTRATOR', _('System Administrator')),
    ]

    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='DATA_ENCODER')
    department = models.CharField(max_length=255, default='Trade & Industry Bureau')
    phone_number = models.CharField(max_length=30, blank=True)
    assigned_woreda = models.ForeignKey(
        'locations.Woreda',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_officers',
        help_text=_('Optional operational Woreda assignment')
    )

    def save(self, *args, **kwargs):
        if not self.full_name and (self.first_name or self.last_name):
            self.full_name = f"{self.first_name} {self.last_name}".strip()
        elif not self.full_name:
            self.full_name = self.username
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.get_role_display()})"
