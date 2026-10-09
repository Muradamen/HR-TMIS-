from django.db import models
from django.conf import settings
from apps.traders.models import Trader

class FormalizationStatus(models.TextChoices):
    NOT_ASSESSED = 'NOT_ASSESSED', 'Not Assessed'
    READY_FOR_FORMALIZATION = 'READY_FOR_FORMALIZATION', 'Ready for Formalization'
    NEEDS_SUPPORT = 'NEEDS_SUPPORT', 'Needs Support & Awareness'
    FOLLOW_UP_REQUIRED = 'FOLLOW_UP_REQUIRED', 'Follow-up Required'
    FORMALIZED = 'FORMALIZED', 'Formalized (Licensed)'

class FormalizationRecord(models.Model):
    trader = models.OneToOneField(
        Trader,
        on_delete=models.CASCADE,
        related_name='formalization_record'
    )
    status = models.CharField(
        max_length=50,
        choices=FormalizationStatus.choices,
        default=FormalizationStatus.NOT_ASSESSED,
        db_index=True
    )
    assessment_date = models.DateField(null=True, blank=True)
    assessing_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='formalization_assessments'
    )
    readiness_assessment = models.TextField(blank=True)
    barriers = models.TextField(blank=True)
    recommended_support = models.TextField(blank=True)
    follow_up_date = models.DateField(null=True, blank=True)
    support_provided = models.TextField(blank=True)
    formalization_notes = models.TextField(blank=True)

    formalized_date = models.DateField(null=True, blank=True)
    responsible_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='formalized_actions'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'ht_formalization_records'
        ordering = ['-updated_at']

    def __str__(self):
        return f"Formalization: {self.trader.trader_id} - {self.status}"
