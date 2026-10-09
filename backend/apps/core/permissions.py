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


class IsReportExporter(permissions.BasePermission):
    """Exports contain bulk personal/business data; limit them to oversight/review roles."""
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (
            user.role in ('DIRECTOR', 'AGENCY_LEADER') or
            user.groups.filter(name__in=('DIRECTOR_OF_TRADER_CONTROL', 'AGENCY_LEADER')).exists()
        ))


class IsFormalizationReader(permissions.BasePermission):
    """Allow review/oversight roles to read formalization records; never grants writes."""
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (
            user.role in ('DIRECTOR', 'AGENCY_LEADER', 'SYSTEM_ADMINISTRATOR') or
            user.groups.filter(name__in=('DIRECTOR_OF_TRADER_CONTROL', 'AGENCY_LEADER', 'ADMINISTRATOR')).exists()
        ))


class IsTraderReadAllowed(permissions.BasePermission):
    """Only operational and oversight roles may query trader records."""
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (
            user.role in ('DATA_ENCODER', 'DIRECTOR', 'AGENCY_LEADER', 'SYSTEM_ADMINISTRATOR') or
            user.groups.filter(name__in=('DATA_ENCODER', 'DIRECTOR_OF_TRADER_CONTROL', 'AGENCY_LEADER', 'ADMINISTRATOR')).exists()
        ))
