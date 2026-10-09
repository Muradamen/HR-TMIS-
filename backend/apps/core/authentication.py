from rest_framework.authentication import SessionAuthentication

class StrictSessionAuthentication(SessionAuthentication):
    """Session-authenticated unsafe requests always pass Django CSRF validation."""
    def enforce_csrf(self, request):
        return super().enforce_csrf(request)
