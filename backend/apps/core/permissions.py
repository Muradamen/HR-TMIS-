from rest_framework import permissions

class IsDataEncoder(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and (
                request.user.role == 'DATA_ENCODER' or 
                request.user.groups.filter(name='DATA_ENCODER').exists()
            )
        )

class IsDirector(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and (
                request.user.role == 'DIRECTOR' or 
                request.user.groups.filter(name='DIRECTOR_OF_TRADER_CONTROL').exists()
            )
        )

class IsAdministrator(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and (
                request.user.role == 'SYSTEM_ADMINISTRATOR' or
                request.user.is_staff or
                request.user.groups.filter(name='ADMINISTRATOR').exists()
            )
        )

class IsAgencyLeader(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated and (
                request.user.role == 'AGENCY_LEADER' or
                request.user.groups.filter(name='AGENCY_LEADER').exists()
            )
        )

class CanApproveTrader(permissions.BasePermission):
    """
    Only Director of Trader Control can approve, reject, or return traders.
    Administrators and Data Encoders are strictly denied.
    """
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return bool(
            request.user.role == 'DIRECTOR' or
            request.user.groups.filter(name='DIRECTOR_OF_TRADER_CONTROL').exists()
        )
