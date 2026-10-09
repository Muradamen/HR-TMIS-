from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class FormalizationAssessment(models.Model):
    STATUS_CHOICES = [
        ('NOT_ASSESSED', _('Not Assessed')),
        ('READY_FOR_FORMALIZATION', _('Ready for Formalization')),
        ('NEEDS_SUPPORT', _('Needs Support & Training')),
        ('FOLLOW_UP_REQUIRED', _('Follow-up Inspection Required')),
        ('FORMALIZED', _('Formalized to Legal Enterprise')),
    ]

    trader = models.OneToOneField(
        'traders.Trader',
        on_delete=models.CASCADE,
        related_name='formalization_assessment'
    )
    status = models.CharField(
        max_length=40,
        choices=STATUS_CHOICES,
        default='NOT_ASSESSED',
        db_index=True
    )
    support_package = models.CharField(
        max_length=255,
        blank=True,
        help_text=_('Type of institutional assistance provided (e.g., Bookkeeping training, workspace allocation)')
    )
    target_date = models.DateField(null=True, blank=True)
    formalized_date = models.DateField(null=True, blank=True)
    assigned_mentor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mentored_formalizations'
    )
    notes = models.TextField(blank=True)
    assessed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conducted_formalization_assessments'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"Formalization for {self.trader.trader_id} - {self.get_status_display()}"
