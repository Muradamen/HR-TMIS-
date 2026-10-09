from rest_framework import permissions

class IsDataEncoder(permissions.BasePermission):
    """Allows access only to Data Encoders."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_data_encoder)

class IsDirector(permissions.BasePermission):
    """Allows access only to Directors of Trader Control."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_director)

class IsAdministrator(permissions.BasePermission):
    """Allows access only to Administrators."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_administrator or request.user.is_superuser))

class IsAgencyLeader(permissions.BasePermission):
    """Allows access only to Agency Leaders."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_agency_leader)

class CanVerifyTrader(permissions.BasePermission):
    """
    Only Director of Trader Control can verify/approve/reject records.
    Administrators and Data Encoders are explicitly forbidden.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        # Administrator cannot approve/reject
        if request.user.is_administrator and not request.user.is_director:
            return False
        return request.user.is_director

class CanManageFormalization(permissions.BasePermission):
    """Directors and Encoders can manage formalization assessments."""
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return request.user.is_director or request.user.is_data_encoder
