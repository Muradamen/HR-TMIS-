from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        SYSTEM_ADMINISTRATOR = 'SYSTEM_ADMINISTRATOR', 'System Administrator'
        DATA_ENCODER = 'DATA_ENCODER', 'Data Encoder'
        DIRECTOR = 'DIRECTOR', 'Director of Trader Control'
        AGENCY_LEADER = 'AGENCY_LEADER', 'Agency Leader'

    role = models.CharField(
        max_length=30,
        choices=Role.choices,
        default=Role.DATA_ENCODER,
    )

    def __str__(self):
        return self.get_full_name() or self.username
