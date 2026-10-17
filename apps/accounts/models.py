from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        DATA_ENCODER = 'DATA_ENCODER', 'Data Encoder'
        DIRECTOR_OF_TRADER_CONTROL = 'DIRECTOR_OF_TRADER_CONTROL', 'Director of Trader Control'
        ADMINISTRATOR = 'ADMINISTRATOR', 'Administrator'
        AGENCY_LEADER = 'AGENCY_LEADER', 'Agency Leader'

    role = models.CharField(
        max_length=35,
        choices=Role.choices,
        default=Role.DATA_ENCODER,
        help_text='System role governing RBAC access and workflow authorization',
    )
    phone_number = models.CharField(max_length=25, blank=True)
    department = models.CharField(max_length=150, default='Trade & Industry Development Bureau')

    class Meta:
        ordering = ['username']
        verbose_name = 'User'
        verbose_name_plural = 'Users'

    def __str__(self):
        full_name = self.get_full_name()
        return f'{full_name} ({self.username})' if full_name else self.username

    @property
    def is_encoder(self):
        return self.role == self.Role.DATA_ENCODER

    @property
    def is_director(self):
        return self.role == self.Role.DIRECTOR_OF_TRADER_CONTROL

    @property
    def is_administrator(self):
        return self.role == self.Role.ADMINISTRATOR or self.is_superuser

    @property
    def is_leader(self):
        return self.role == self.Role.AGENCY_LEADER
