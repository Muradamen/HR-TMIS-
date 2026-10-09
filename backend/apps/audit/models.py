from django.db import models
from django.utils.translation import gettext_lazy as _

class AuditLog(models.Model):
    ACTION_CHOICES = [
        ('REGISTER_TRADER', _('Register Trader')),
        ('UPDATE_TRADER', _('Update Trader')),
        ('SUBMIT_TRADER', _('Submit Trader')),
        ('CLAIM_REVIEW', _('Claim Review')),
        ('APPROVE_TRADER', _('Approve Trader')),
        ('RETURN_TRADER', _('Return Trader for Correction')),
        ('REJECT_TRADER', _('Reject Trader')),
        ('FORMALIZE_TRADER', _('Formalize Trader')),
        ('DELETE_TRADER', _('Delete Trader')),
        ('EXPORT_CSV', _('Export CSV Data')),
        ('EXPORT_EXCEL', _('Export Excel Data')),
        ('EXPORT_PDF', _('Export PDF Report')),
        ('PRINT_CERTIFICATE', _('Print Certificate')),
        ('LOGIN', _('User Login')),
        ('LOGOUT', _('User Logout')),
    ]

    action = models.CharField(max_length=50, choices=ACTION_CHOICES, db_index=True)
    trader_id = models.CharField(max_length=50, blank=True, db_index=True)
    details = models.TextField()
    user = models.CharField(max_length=150, default='system', db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = _('Audit Log')
        verbose_name_plural = _('Audit Logs')

    def __str__(self):
        return f"[{self.timestamp.strftime('%Y-%m-%d %H:%M')}] {self.user} - {self.action} ({self.trader_id})"
