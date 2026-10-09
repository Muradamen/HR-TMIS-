from django.contrib.auth.models import AbstractUser, Group
from django.db import models

class UserRole(models.TextChoices):
    DATA_ENCODER = 'DATA_ENCODER', 'Data Encoder'
    DIRECTOR_OF_TRADER_CONTROL = 'DIRECTOR_OF_TRADER_CONTROL', 'Director of Trader Control'
    ADMINISTRATOR = 'ADMINISTRATOR', 'Administrator'
    AGENCY_LEADER = 'AGENCY_LEADER', 'Agency Leader'

class User(AbstractUser):
    ROLE_CHOICES = [
        ('DATA_ENCODER', 'Data Encoder'),
        ('DIRECTOR', 'Director of Trader Control'),
        ('DIRECTOR_OF_TRADER_CONTROL', 'Director of Trader Control'),
        ('ADMINISTRATOR', 'Administrator'),
        ('SYSTEM_ADMINISTRATOR', 'Administrator'),
        ('AGENCY_LEADER', 'Agency Leader'),
    ]

    full_name = models.CharField(max_length=255, blank=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='DATA_ENCODER')
    department = models.CharField(max_length=255, blank=True, default='Harari Trade & Industry Development Agency')
    phone_number = models.CharField(max_length=50, blank=True)
    assigned_woreda_id = models.IntegerField(null=True, blank=True, help_text="Optional operational assignment to a Woreda")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ht_users'
        ordering = ['id']

    def __str__(self):
        return f"{self.username} ({self.get_normalized_role()})"

    def get_normalized_role(self):
        if self.role in ('DIRECTOR', 'DIRECTOR_OF_TRADER_CONTROL'):
            return 'DIRECTOR_OF_TRADER_CONTROL'
        if self.role in ('ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'):
            return 'ADMINISTRATOR'
        if self.role == 'AGENCY_LEADER':
            return 'AGENCY_LEADER'
        return 'DATA_ENCODER'

    @property
    def is_data_encoder(self):
        return self.get_normalized_role() == 'DATA_ENCODER'

    @property
    def is_director(self):
        return self.get_normalized_role() == 'DIRECTOR_OF_TRADER_CONTROL'

    @property
    def is_administrator(self):
        return self.get_normalized_role() == 'ADMINISTRATOR'

    @property
    def is_agency_leader(self):
        return self.get_normalized_role() == 'AGENCY_LEADER'

    def save(self, *args, **kwargs):
        if not self.full_name and (self.first_name or self.last_name):
            self.full_name = f"{self.first_name} {self.last_name}".strip()
        super().save(*args, **kwargs)

        # Synchronize with Django Groups
        normalized_group_name = self.get_normalized_role()
        group, _ = Group.objects.get_or_create(name=normalized_group_name)
        if not self.groups.filter(name=normalized_group_name).exists():
            self.groups.clear()
            self.groups.add(group)
