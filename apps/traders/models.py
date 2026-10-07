from django.conf import settings
from django.db import models


class Trader(models.Model):
    class TraderType(models.TextChoices):
        LEGAL = "LEGAL", "Legal Trader"
        INFORMAL = "INFORMAL", "Informal Trader"

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending Verification"
        APPROVED = "APPROVED", "Approved"
        RETURNED = "RETURNED", "Returned"

    trader_id = models.CharField(
        max_length=30,
        unique=True,
        editable=False,
    )

    trader_type = models.CharField(
        max_length=20,
        choices=TraderType.choices,
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )

    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="registered_traders",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.trader_id:
            last_trader = Trader.objects.order_by("-id").first()

            if last_trader:
                number = last_trader.id + 1
            else:
                number = 1

            self.trader_id = f"HTT-{number:06d}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.trader_id} - {self.trader_type}"


class LegalTrader(models.Model):
    trader = models.OneToOneField(
        Trader,
        on_delete=models.CASCADE,
        related_name="legal_details",
    )

    trade_name = models.CharField(max_length=200)
    owner_full_name = models.CharField(max_length=200)

    tin = models.CharField(
        max_length=100,
        verbose_name="TIN",
    )

    trade_registration_number = models.CharField(
        max_length=100,
    )

    gender = models.CharField(
        max_length=20,
        choices=[
            ("MALE", "Male"),
            ("FEMALE", "Female"),
            ("OTHER", "Other"),
        ],
    )

    age = models.PositiveIntegerField()

    region = models.CharField(max_length=100)

    woreda = models.ForeignKey(
        "locations.Woreda",
        on_delete=models.PROTECT,
        related_name="legal_traders",
    )

    kebele = models.ForeignKey(
        "locations.Kebele",
        on_delete=models.PROTECT,
        related_name="legal_traders",
    )

    house_number_plot_id = models.CharField(
        max_length=100,
        blank=True,
    )

    business_sector = models.CharField(
        max_length=100,
        choices=[
            ("GENERAL_TRADE", "General Trade"),
            ("RETAIL_WHOLESALE_GOODS", "Retail/Wholesale Goods"),
            ("AGRICULTURE_AGRO_PROCESSING", "Agriculture/Agro-processing"),
            ("MANUFACTURING_PRODUCTION", "Manufacturing/Production"),
            ("SERVICE_PROVIDER", "Service Provider"),
            ("OTHER", "Other"),
        ],
    )

    trade_scale = models.CharField(
        max_length=20,
        choices=[
            ("WHOLESALE", "Wholesale"),
            ("RETAIL", "Retail"),
        ],
    )

    business_ownership_type = models.CharField(
        max_length=50,
        choices=[
            ("SOLE_PROPRIETORSHIP", "Sole Proprietorship"),
            ("PLC", "Private Limited Company (PLC)"),
            ("PARTNERSHIP", "Partnership"),
            ("ASSOCIATION_COOPERATIVE", "Association/Cooperative"),
        ],
    )

    issuing_institution = models.CharField(
        max_length=200,
    )

    date_of_issuance = models.DateField()

    data_entered_by = models.CharField(
        max_length=200,
        blank=True,
    )

    remarks = models.TextField(
        blank=True,
    )

    officer_signature = models.CharField(
        max_length=200,
        blank=True,
    )

    verification_date = models.DateField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"{self.trader.trader_id} - {self.trade_name}"


class InformalTrader(models.Model):
    trader = models.OneToOneField(
        Trader,
        on_delete=models.CASCADE,
        related_name="informal_details",
    )

    full_name = models.CharField(max_length=200)

    gender = models.CharField(
        max_length=20,
        choices=[
            ("MALE", "Male"),
            ("FEMALE", "Female"),
        ],
    )

    age = models.PositiveIntegerField()

    national_id_resident_id = models.CharField(
        max_length=100,
        blank=True,
    )

    phone_number = models.CharField(
        max_length=20,
        blank=True,
    )

    region = models.CharField(max_length=100)

    woreda = models.ForeignKey(
        "locations.Woreda",
        on_delete=models.PROTECT,
        related_name="informal_traders",
    )

    kebele = models.ForeignKey(
        "locations.Kebele",
        on_delete=models.PROTECT,
        related_name="informal_traders",
    )

    specific_location_market_area = models.CharField(
        max_length=200,
    )

    nature_of_trade_activity = models.CharField(
        max_length=100,
        choices=[
            ("STREET_VENDING_OPEN_MARKET", "Street Vending/Open Market"),
            ("PETTY_RETAIL", "Petty Retail"),
            ("HANDCRAFT_INFORMAL_PRODUCTION", "Handcraft/Informal Production"),
            ("OTHER", "Other"),
        ],
    )

    estimated_capital_assets = models.DecimalField(
        max_digits=15,
        decimal_places=2,
    )

    reason_for_operating_informally = models.CharField(
        max_length=100,
        choices=[
            ("LACK_OF_CAPITAL", "Lack of Capital"),
            ("COMPLEX_BUREAUCRACY", "Complex Bureaucracy"),
            ("TEMPORARY_SEASONAL_ACTIVITY", "Temporary/Seasonal Activity"),
            ("OTHER", "Other"),
        ],
    )

    enumerator_data_collector_name = models.CharField(
        max_length=200,
        blank=True,
    )

    date_of_assessment = models.DateField()

    formalization_status_recommendation = models.CharField(
        max_length=100,
        choices=[
            (
                "READY_FOR_TIN_MICRO_ENTERPRISE",
                "Ready for TIN & Micro-Enterprise Registration",
            ),
            (
                "NEEDS_AWARENESS_LEGAL_SUPPORT",
                "Needs Awareness/Legal Support",
            ),
            (
                "FOLLOW_UP_REQUIRED",
                "Follow-up Required",
            ),
        ],
    )

    def __str__(self):
        return f"{self.trader.trader_id} - {self.full_name}"
