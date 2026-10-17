from django.conf import settings
from django.db import models

class AuditLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
    )
    actor_name = models.CharField(max_length=150, blank=True)
    role = models.CharField(max_length=50, blank=True)
    action = models.CharField(max_length=100, db_index=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    http_method = models.CharField(max_length=10, default='GET')
    target_id = models.CharField(max_length=100, db_index=True, blank=True)
    old_state = models.CharField(max_length=50, blank=True)
    new_state = models.CharField(max_length=50, blank=True)
    details = models.TextField(blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Audit Log'
        verbose_name_plural = 'Audit Logs'
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['action']),
            models.Index(fields=['target_id']),
        ]

    def __str__(self):
        return f'[{self.timestamp:%Y-%m-%d %H:%M:%S}] {self.actor_name} -> {self.action} ({self.target_id})'
