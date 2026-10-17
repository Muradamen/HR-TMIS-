from django.conf import settings
from django.db import models

class Trader(models.Model):
    class TraderType(models.TextChoices):
        LEGAL = 'LEGAL', 'Legal Trader'
        INFORMAL = 'INFORMAL', 'Informal Trader'

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        SUBMITTED = 'SUBMITTED', 'Submitted for Verification'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
        APPROVED = 'APPROVED', 'Approved'
        NEEDS_CORRECTION = 'NEEDS_CORRECTION', 'Needs Correction'
        REJECTED = 'REJECTED', 'Rejected'
        ARCHIVED = 'ARCHIVED', 'Archived'

    trader_code = models.CharField(
        max_length=30,
        unique=True,
        db_index=True,
        help_text='Unique code formatted as HT-YYYY-000001',
    )
    trader_type = models.CharField(
        max_length=20,
        choices=TraderType.choices,
        db_index=True,
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='registered_traders',
    )
    submitted_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_traders',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_traders',
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    correction_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Trader'
        verbose_name_plural = 'Traders'
        indexes = [
            models.Index(fields=['trader_code']),
            models.Index(fields=['status']),
            models.Index(fields=['trader_type']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f'{self.trader_code} - {self.trader_type}'

    @property
    def display_name(self):
        if self.trader_type == self.TraderType.LEGAL and hasattr(self, 'legal_details'):
            return f'{self.legal_details.trade_name} ({self.legal_details.owner_full_name})'
        elif hasattr(self, 'informal_details'):
            return self.informal_details.full_name
        return self.trader_code

    @property
    def woreda(self):
        if self.trader_type == self.TraderType.LEGAL and hasattr(self, 'legal_details'):
            return self.legal_details.woreda
        elif hasattr(self, 'informal_details'):
            return self.informal_details.woreda
        return None

    @property
    def kebele(self):
        if self.trader_type == self.TraderType.LEGAL and hasattr(self, 'legal_details'):
            return self.legal_details.kebele
        elif hasattr(self, 'informal_details'):
            return self.informal_details.kebele
        return None


class LegalTrader(models.Model):
    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'
        OTHER = 'OTHER', 'Other'

    class BusinessSector(models.TextChoices):
        GENERAL_TRADE = 'GENERAL_TRADE', 'General Trade'
        RETAIL_WHOLESALE_GOODS = 'RETAIL_WHOLESALE_GOODS', 'Retail/Wholesale Goods'
        AGRICULTURE_AGRO_PROCESSING = 'AGRICULTURE_AGRO_PROCESSING', 'Agriculture/Agro-processing'
        MANUFACTURING_PRODUCTION = 'MANUFACTURING_PRODUCTION', 'Manufacturing/Production'
        SERVICE_PROVIDER = 'SERVICE_PROVIDER', 'Service Provider'
        OTHER = 'OTHER', 'Other'

    class TradeScale(models.TextChoices):
        WHOLESALE = 'WHOLESALE', 'Wholesale'
        RETAIL = 'RETAIL', 'Retail'

    class OwnershipType(models.TextChoices):
        SOLE_PROPRIETORSHIP = 'SOLE_PROPRIETORSHIP', 'Sole Proprietorship'
        PLC = 'PLC', 'Private Limited Company (PLC)'
        PARTNERSHIP = 'PARTNERSHIP', 'Partnership'
        ASSOCIATION_COOPERATIVE = 'ASSOCIATION_COOPERATIVE', 'Association/Cooperative'

    trader = models.OneToOneField(
        Trader,
        on_delete=models.CASCADE,
        related_name='legal_details',
    )
    trade_name = models.CharField(max_length=200)
    owner_full_name = models.CharField(max_length=200)
    tin = models.CharField(max_length=100, verbose_name='TIN')
    trade_registration_number = models.CharField(max_length=100)
    trade_license_number = models.CharField(max_length=100, blank=True)
    gender = models.CharField(max_length=20, choices=Gender.choices)
    age = models.PositiveIntegerField()
    region = models.CharField(max_length=100, default='Harari Region')
    woreda = models.ForeignKey(
        'locations.Woreda',
        on_delete=models.PROTECT,
        related_name='legal_traders',
    )
    kebele = models.ForeignKey(
        'locations.Kebele',
        on_delete=models.PROTECT,
        related_name='legal_traders',
    )
    house_number_plot_id = models.CharField(max_length=100, blank=True)
    business_sector = models.CharField(max_length=100, choices=BusinessSector.choices)
    trade_scale = models.CharField(max_length=20, choices=TradeScale.choices)
    business_ownership_type = models.CharField(max_length=50, choices=OwnershipType.choices)
    issuing_institution = models.CharField(max_length=200, default='Harari Trade & Industry Development Bureau')
    date_of_issuance = models.DateField()
    data_entered_by = models.CharField(max_length=200, blank=True)
    remarks = models.TextField(blank=True)
    officer_signature = models.CharField(max_length=200, blank=True)
    verification_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f'{self.trader.trader_code} - {self.trade_name}'


class InformalTrader(models.Model):
    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'

    class NatureOfTrade(models.TextChoices):
        STREET_VENDING_OPEN_MARKET = 'STREET_VENDING_OPEN_MARKET', 'Street Vending/Open Market'
        PETTY_RETAIL = 'PETTY_RETAIL', 'Petty Retail'
        HANDCRAFT_INFORMAL_PRODUCTION = 'HANDCRAFT_INFORMAL_PRODUCTION', 'Handcraft/Informal Production'
        OTHER = 'OTHER', 'Other'

    class ReasonForInformality(models.TextChoices):
        LACK_OF_CAPITAL = 'LACK_OF_CAPITAL', 'Lack of Capital'
        COMPLEX_BUREAUCRACY = 'COMPLEX_BUREAUCRACY', 'Complex Bureaucracy'
        TEMPORARY_SEASONAL_ACTIVITY = 'TEMPORARY_SEASONAL_ACTIVITY', 'Temporary/Seasonal Activity'
        OTHER = 'OTHER', 'Other'

    class FormalizationRecommendation(models.TextChoices):
        READY_FOR_TIN_MICRO_ENTERPRISE = (
            'READY_FOR_TIN_MICRO_ENTERPRISE',
            'Ready for TIN & Micro-Enterprise Registration',
        )
        NEEDS_AWARENESS_LEGAL_SUPPORT = (
            'NEEDS_AWARENESS_LEGAL_SUPPORT',
            'Needs Awareness/Legal Support',
        )
        FOLLOW_UP_REQUIRED = (
            'FOLLOW_UP_REQUIRED',
            'Follow-up Required',
        )

    trader = models.OneToOneField(
        Trader,
        on_delete=models.CASCADE,
        related_name='informal_details',
    )
    full_name = models.CharField(max_length=200)
    gender = models.CharField(max_length=20, choices=Gender.choices)
    age = models.PositiveIntegerField()
    national_id_resident_id = models.CharField(max_length=100, blank=True)
    phone_number = models.CharField(max_length=30)
    region = models.CharField(max_length=100, default='Harari Region')
    woreda = models.ForeignKey(
        'locations.Woreda',
        on_delete=models.PROTECT,
        related_name='informal_traders',
    )
    kebele = models.ForeignKey(
        'locations.Kebele',
        on_delete=models.PROTECT,
        related_name='informal_traders',
    )
    specific_location_market_area = models.CharField(max_length=200)
    nature_of_trade_activity = models.CharField(max_length=100, choices=NatureOfTrade.choices)
    estimated_capital_assets = models.DecimalField(max_digits=15, decimal_places=2)
    reason_for_operating_informally = models.CharField(max_length=100, choices=ReasonForInformality.choices)
    enumerator_data_collector_name = models.CharField(max_length=200, blank=True)
    date_of_assessment = models.DateField()
    formalization_status_recommendation = models.CharField(
        max_length=100,
        choices=FormalizationRecommendation.choices,
    )

    def __str__(self):
        return f'{self.trader.trader_code} - {self.full_name}'
