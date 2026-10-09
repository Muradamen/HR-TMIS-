from django.db import models
from django.conf import settings

class VerificationLog(models.Model):
    ACTION_CHOICES = [
        ('CLAIM', 'Claim for Review'),
        ('ASSIGN', 'Assigned'),
        ('START_REVIEW', 'Review Started'),
        ('APPROVE', 'Approved'),
        ('REJECT', 'Rejected'),
        ('RETURN', 'Returned for Correction'),
    ]

    trader = models.ForeignKey('traders.Trader', on_delete=models.CASCADE, related_name='verification_history')
    officer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    notes = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.action} on {self.trader.trader_id} by {self.officer}"
