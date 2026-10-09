from rest_framework import serializers
from .models import AuditEvent

class AuditEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditEvent
        fields = [
            'id', 'actor', 'actor_username', 'actor_role',
            'action', 'entity_type', 'entity_id', 'previous_state',
            'new_state', 'reason', 'details', 'timestamp', 'metadata'
        ]
        read_only_fields = fields
