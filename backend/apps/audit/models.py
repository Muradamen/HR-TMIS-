from django.db import models
from django.conf import settings
from django.core.exceptions import PermissionDenied

class AuditEvent(models.Model):
    ACTION_CHOICES = [
        ('LOGIN_SUCCESS', 'Login Success'),
        ('LOGIN_FAILED', 'Login Failed'),
        ('LOGOUT', 'Logout'),
        ('RECORD_CREATED', 'Record Created'),
        ('RECORD_UPDATED', 'Record Updated'),
        ('SUBMITTED', 'Submitted for Review'),
        ('RESUBMITTED', 'Resubmitted after Correction'),
        ('CLAIMED', 'Claimed for Review'),
        ('ASSIGNED', 'Assigned to Reviewer'),
        ('REVIEW_STARTED', 'Review Started'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('RETURNED_FOR_CORRECTION', 'Returned for Correction'),
        ('FORMALIZATION_ASSESSED', 'Formalization Assessed'),
        ('FORMALIZATION_UPDATED', 'Formalization Updated'),
        ('FORMALIZED', 'Trader Formalized'),
        ('ARCHIVED', 'Trader Archived'),
        ('EXPORT_CSV', 'Exported to CSV'),
        ('EXPORT_EXCEL', 'Exported to Excel'),
        ('EXPORT_PDF', 'Exported to PDF'),
        ('USER_CREATED', 'User Created'),
        ('USER_UPDATED', 'User Updated'),
        ('LOCATION_CREATED', 'Location Created'),
    ]

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_events'
    )
    actor_username = models.CharField(max_length=150, blank=True)
    actor_role = models.CharField(max_length=50, blank=True)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES, db_index=True)
    entity_type = models.CharField(max_length=50, db_index=True)
    entity_id = models.CharField(max_length=100, db_index=True)
    previous_state = models.CharField(max_length=50, blank=True)
    new_state = models.CharField(max_length=50, blank=True)
    reason = models.TextField(blank=True)
    details = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'ht_audit_events'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['action', 'timestamp']),
        ]

    def __str__(self):
        return f"[{self.timestamp:%Y-%m-%d %H:%M}] {self.actor_username or 'System'}: {self.action} on {self.entity_type} {self.entity_id}"

    def delete(self, *args, **kwargs):
        raise PermissionDenied("Audit events are immutable and cannot be deleted.")

    @classmethod
    def log(cls, actor, action, entity_type, entity_id, previous_state='', new_state='', reason='', details='', metadata=None):
        """Append-only helper to record an audit event."""
        actor_username = actor.username if (actor and hasattr(actor, 'username')) else 'System'
        actor_role = actor.get_normalized_role() if (actor and hasattr(actor, 'get_normalized_role')) else ''
        return cls.objects.create(
            actor=actor if (actor and getattr(actor, 'is_authenticated', False)) else None,
            actor_username=actor_username,
            actor_role=actor_role,
            action=action,
            entity_type=entity_type,
            entity_id=str(entity_id),
            previous_state=previous_state,
            new_state=new_state,
            reason=reason or '',
            details=details or '',
            metadata=metadata or {}
        )
