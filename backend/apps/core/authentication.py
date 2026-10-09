from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """Deprecated compatibility alias. Session-authenticated unsafe requests MUST pass CSRF."""
    def enforce_csrf(self, request):
        return super().enforce_csrf(request)
