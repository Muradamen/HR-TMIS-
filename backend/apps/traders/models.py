from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from decimal import Decimal

class Trader(models.Model):
    TRADER_TYPE_CHOICES = [
        ('LEGAL', _('Legal Trader')),
        ('INFORMAL', _('Informal Trader')),
    ]

    STATUS_CHOICES = [
        ('DRAFT', _('Draft')),
        ('SUBMITTED', _('Submitted')),
        ('UNDER_REVIEW', _('Under Review')),
        ('APPROVED', _('Approved')),
        ('NEEDS_CORRECTION', _('Needs Correction')),
        ('REJECTED', _('Rejected')),
        ('ARCHIVED', _('Archived')),
    ]

    trader_id = models.CharField(max_length=50, unique=True, db_index=True)
    trader_type = models.CharField(max_length=20, choices=TRADER_TYPE_CHOICES, db_index=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='SUBMITTED', db_index=True)

    name = models.CharField(max_length=255, help_text=_('Trade Name or Trader Full Name'))
    owner_full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=30, blank=True)

    woreda = models.ForeignKey('locations.Woreda', on_delete=models.PROTECT, related_name='traders')
    kebele = models.ForeignKey('locations.Kebele', on_delete=models.PROTECT, related_name='traders')
    specific_location = models.CharField(max_length=255, blank=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='registered_traders'
    )
    assigned_director = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_reviews'
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_trader_reviews'
    )
    assigned_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_traders'
    )
    verification_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    correction_remarks = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.trader_id} - {self.name} ({self.get_status_display()})"


class LegalTrader(models.Model):
    SECTOR_CHOICES = [
        ('GENERAL_TRADE', _('General Trade')),
        ('RETAIL_WHOLESALE_GOODS', _('Retail & Wholesale Goods')),
        ('AGRICULTURE_AGRO_PROCESSING', _('Agriculture & Agro Processing')),
        ('MANUFACTURING_PRODUCTION', _('Manufacturing & Production')),
        ('SERVICE_PROVIDER', _('Service Provider')),
        ('OTHER', _('Other')),
    ]

    SCALE_CHOICES = [
        ('WHOLESALE', _('Wholesale')),
        ('RETAIL', _('Retail')),
    ]

    OWNERSHIP_CHOICES = [
        ('SOLE_PROPRIETORSHIP', _('Sole Proprietorship')),
        ('PLC', _('Private Limited Company (PLC)')),
        ('PARTNERSHIP', _('Partnership')),
        ('ASSOCIATION_COOPERATIVE', _('Association / Cooperative')),
    ]

    GENDER_CHOICES = [
        ('MALE', _('Male')),
        ('FEMALE', _('Female')),
        ('OTHER', _('Other')),
    ]

    trader = models.OneToOneField(Trader, on_delete=models.CASCADE, related_name='legal_details')
    tin = models.CharField(max_length=50, unique=True, db_index=True)
    trade_registration_number = models.CharField(max_length=50, unique=True, db_index=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='MALE')
    age = models.PositiveIntegerField(default=30)
    business_sector = models.CharField(max_length=50, choices=SECTOR_CHOICES, default='GENERAL_TRADE')
    trade_scale = models.CharField(max_length=20, choices=SCALE_CHOICES, default='RETAIL')
    business_ownership_type = models.CharField(max_length=50, choices=OWNERSHIP_CHOICES, default='SOLE_PROPRIETORSHIP')
    issuing_institution = models.CharField(max_length=255, default='Harari Region Trade and Industry Development Bureau')
    date_of_issuance = models.DateField()
    house_number_plot_id = models.CharField(max_length=100, blank=True)
    remarks = models.TextField(blank=True)
    officer_signature = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"Legal: {self.trader.trader_id} - TIN {self.tin}"


class InformalTrader(models.Model):
    ACTIVITY_CHOICES = [
        ('STREET_VENDING_OPEN_MARKET', _('Street Vending & Open Market')),
        ('PETTY_RETAIL', _('Petty Retail')),
        ('HANDCRAFT_INFORMAL_PRODUCTION', _('Handcraft & Informal Production')),
        ('OTHER', _('Other')),
    ]

    REASON_CHOICES = [
        ('LACK_OF_CAPITAL', _('Lack of Working Capital')),
        ('COMPLEX_BUREAUCRACY', _('Complex Registration Bureaucracy')),
        ('TEMPORARY_SEASONAL_ACTIVITY', _('Temporary or Seasonal Trading Activity')),
        ('OTHER', _('Other')),
    ]

    RECOMMENDATION_CHOICES = [
        ('READY_FOR_TIN_MICRO_ENTERPRISE', _('Ready for TIN & Micro-Enterprise Transition')),
        ('NEEDS_AWARENESS_LEGAL_SUPPORT', _('Needs Awareness & Legal Advisory Support')),
        ('FOLLOW_UP_REQUIRED', _('Follow-up Field Inspection Required')),
    ]

    trader = models.OneToOneField(Trader, on_delete=models.CASCADE, related_name='informal_details')
    national_id_resident_id = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=10, choices=[('MALE', _('Male')), ('FEMALE', _('Female'))], default='MALE')
    age = models.PositiveIntegerField(default=28)
    specific_location_market_area = models.CharField(max_length=255)
    nature_of_trade_activity = models.CharField(max_length=50, choices=ACTIVITY_CHOICES, default='STREET_VENDING_OPEN_MARKET')
    estimated_capital_assets = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0.00'))
    reason_for_operating_informally = models.CharField(max_length=50, choices=REASON_CHOICES, default='LACK_OF_CAPITAL')
    formalization_status_recommendation = models.CharField(
        max_length=50,
        choices=RECOMMENDATION_CHOICES,
        default='READY_FOR_TIN_MICRO_ENTERPRISE'
    )
    enumerator_data_collector_name = models.CharField(max_length=255)
    date_of_assessment = models.DateField()

    def __str__(self):
        return f"Informal: {self.trader.trader_id} - {self.trader.name}"
