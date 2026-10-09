from django.db import models
from django.conf import settings
from apps.locations.models import Region, Woreda, Kebele

class TraderType(models.TextChoices):
    LEGAL = 'LEGAL', 'Legal Trader'
    INFORMAL = 'INFORMAL', 'Informal Trader'

class WorkflowStatus(models.TextChoices):
    DRAFT = 'DRAFT', 'Draft'
    SUBMITTED = 'SUBMITTED', 'Submitted'
    UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
    APPROVED = 'APPROVED', 'Approved'
    NEEDS_CORRECTION = 'NEEDS_CORRECTION', 'Needs Correction'
    REJECTED = 'REJECTED', 'Rejected'
    ARCHIVED = 'ARCHIVED', 'Archived'

class Trader(models.Model):
    trader_id = models.CharField(max_length=50, unique=True, db_index=True)
    trader_type = models.CharField(max_length=20, choices=TraderType.choices, db_index=True)
    status = models.CharField(max_length=30, choices=WorkflowStatus.choices, default=WorkflowStatus.SUBMITTED, db_index=True)

    business_name = models.CharField(max_length=255, blank=True)
    owner_full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=50, blank=True)

    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name='traders', null=True, blank=True)
    woreda = models.ForeignKey(Woreda, on_delete=models.PROTECT, related_name='traders')
    kebele = models.ForeignKey(Kebele, on_delete=models.PROTECT, related_name='traders')
    business_address = models.CharField(max_length=255, blank=True)

    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='registered_traders'
    )
    last_updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='updated_traders',
        null=True, blank=True
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='assigned_verifications'
    )
    claimed_at = models.DateTimeField(null=True, blank=True)

    submitted_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='verified_traders'
    )
    verification_notes = models.TextField(blank=True)
    rejection_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ht_traders'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'woreda']),
            models.Index(fields=['trader_type', 'status']),
            models.Index(fields=['created_at', 'status']),
        ]

    def __str__(self):
        return f"{self.trader_id} - {self.business_name or self.owner_full_name} ({self.status})"

    @classmethod
    def generate_next_trader_id(cls):
        """Generates the next sequential HTT identifier (e.g. HTT-000001)."""
        last = cls.objects.all().order_by('-id').first()
        next_id = (last.id + 1) if last else 1
        candidate = f"HTT-{next_id:06d}"
        while cls.objects.filter(trader_id=candidate).exists():
            next_id += 1
            candidate = f"HTT-{next_id:06d}"
        return candidate


class LegalTrader(models.Model):
    GENDER_CHOICES = [('MALE', 'Male'), ('FEMALE', 'Female'), ('OTHER', 'Other')]
    SECTOR_CHOICES = [
        ('GENERAL_TRADE', 'General Trade & Distribution'),
        ('RETAIL_WHOLESALE_GOODS', 'Retail & Wholesale Goods'),
        ('AGRICULTURE_AGRO_PROCESSING', 'Agriculture & Agro-Processing'),
        ('MANUFACTURING_PRODUCTION', 'Manufacturing & Light Production'),
        ('SERVICE_PROVIDER', 'Hotel, Tourism & Services'),
        ('OTHER', 'Other Commercial Sector'),
    ]
    SCALE_CHOICES = [('WHOLESALE', 'Wholesale'), ('RETAIL', 'Retail')]
    OWNERSHIP_CHOICES = [
        ('SOLE_PROPRIETORSHIP', 'Sole Proprietorship'),
        ('PLC', 'Private Limited Company (PLC)'),
        ('PARTNERSHIP', 'Partnership'),
        ('ASSOCIATION_COOPERATIVE', 'Cooperative / Association'),
    ]

    trader = models.OneToOneField(Trader, on_delete=models.CASCADE, related_name='legal_details')
    trade_name = models.CharField(max_length=255)
    owner_full_name = models.CharField(max_length=255)
    tin = models.CharField(max_length=50, db_index=True)
    trade_registration_number = models.CharField(max_length=100, db_index=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='MALE')
    age = models.PositiveIntegerField(default=30)
    house_number_plot_id = models.CharField(max_length=100, blank=True)
    business_sector = models.CharField(max_length=50, choices=SECTOR_CHOICES, default='GENERAL_TRADE')
    trade_scale = models.CharField(max_length=20, choices=SCALE_CHOICES, default='RETAIL')
    business_ownership_type = models.CharField(max_length=50, choices=OWNERSHIP_CHOICES, default='SOLE_PROPRIETORSHIP')
    issuing_institution = models.CharField(max_length=255, default='Harari Trade & Industry Development Agency')
    date_of_issuance = models.DateField()
    remarks = models.TextField(blank=True)
    officer_signature = models.CharField(max_length=255, blank=True)
    verification_date = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'ht_legal_traders'

    def __str__(self):
        return f"Legal: {self.trade_name} ({self.tin})"


class InformalTrader(models.Model):
    GENDER_CHOICES = [('MALE', 'Male'), ('FEMALE', 'Female')]
    NATURE_CHOICES = [
        ('STREET_VENDING_OPEN_MARKET', 'Street Vending & Open Market'),
        ('PETTY_RETAIL', 'Petty Retail / Kiosk / Corner Stand'),
        ('HANDCRAFT_INFORMAL_PRODUCTION', 'Handcraft & Informal Workshop'),
        ('OTHER', 'Other Informal Activity'),
    ]
    REASON_CHOICES = [
        ('LACK_OF_CAPITAL', 'Lack of Initial Working Capital'),
        ('COMPLEX_BUREAUCRACY', 'Complex Registration Procedures'),
        ('TEMPORARY_SEASONAL_ACTIVITY', 'Temporary / Seasonal Activity'),
        ('OTHER', 'Other Livelihood Challenges'),
    ]
    RECOMMENDATION_CHOICES = [
        ('READY_FOR_TIN_MICRO_ENTERPRISE', 'Ready for Formal TIN & Micro-Enterprise License'),
        ('NEEDS_AWARENESS_LEGAL_SUPPORT', 'Needs Financial Literacy & Legal Coaching'),
        ('FOLLOW_UP_REQUIRED', 'Follow-up Required (Transition in Progress)'),
    ]

    trader = models.OneToOneField(Trader, on_delete=models.CASCADE, related_name='informal_details')
    full_name = models.CharField(max_length=255)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='MALE')
    age = models.PositiveIntegerField(default=25)
    national_id_resident_id = models.CharField(max_length=100, blank=True, db_index=True)
    phone_number = models.CharField(max_length=50, blank=True)
    specific_location_market_area = models.CharField(max_length=255)
    nature_of_trade_activity = models.CharField(max_length=50, choices=NATURE_CHOICES, default='PETTY_RETAIL')
    estimated_capital_assets = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    reason_for_operating_informally = models.CharField(max_length=50, choices=REASON_CHOICES, default='LACK_OF_CAPITAL')
    enumerator_data_collector_name = models.CharField(max_length=255, blank=True)
    date_of_assessment = models.DateField()
    formalization_status_recommendation = models.CharField(
        max_length=50,
        choices=RECOMMENDATION_CHOICES,
        default='READY_FOR_TIN_MICRO_ENTERPRISE'
    )

    class Meta:
        db_table = 'ht_informal_traders'

    def __str__(self):
        return f"Informal: {self.full_name} ({self.specific_location_market_area})"
