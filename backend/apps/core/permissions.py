from rest_framework import permissions


def _authenticated(user):
    return bool(user and user.is_authenticated)


def _has_group(user, *names):
    return user.groups.filter(name__in=names).exists()


class IsDataEncoder(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not _authenticated(user):
            return False
        if user.role in ('SYSTEM_ADMINISTRATOR', 'DIRECTOR', 'AGENCY_LEADER'):
            return False
        if _has_group(user, 'ADMINISTRATOR', 'DIRECTOR_OF_TRADER_CONTROL', 'AGENCY_LEADER'):
            return False
        return user.role == 'DATA_ENCODER' or _has_group(user, 'DATA_ENCODER')


class IsDirector(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not _authenticated(user):
            return False
        if user.role in ('SYSTEM_ADMINISTRATOR', 'DATA_ENCODER', 'AGENCY_LEADER'):
            return False
        if _has_group(user, 'ADMINISTRATOR', 'DATA_ENCODER', 'AGENCY_LEADER'):
            return False
        return user.role == 'DIRECTOR' or _has_group(user, 'DIRECTOR_OF_TRADER_CONTROL')


class IsAdministrator(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not _authenticated(user):
            return False
        if user.role in ('DATA_ENCODER', 'DIRECTOR', 'AGENCY_LEADER'):
            return False
        if _has_group(user, 'DATA_ENCODER', 'DIRECTOR_OF_TRADER_CONTROL', 'AGENCY_LEADER'):
            return False
        return user.role == 'SYSTEM_ADMINISTRATOR' or _has_group(user, 'ADMINISTRATOR')


class IsAgencyLeader(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not _authenticated(user):
            return False
        if user.role in ('SYSTEM_ADMINISTRATOR', 'DATA_ENCODER', 'DIRECTOR'):
            return False
        if _has_group(user, 'ADMINISTRATOR', 'DATA_ENCODER', 'DIRECTOR_OF_TRADER_CONTROL'):
            return False
        return user.role == 'AGENCY_LEADER' or _has_group(user, 'AGENCY_LEADER')


class CanApproveTrader(permissions.BasePermission):
    """Only the Director of Trader Control may decide workflow outcomes."""
    def has_permission(self, request, view):
        return IsDirector().has_permission(request, view)


class IsReportExporter(permissions.BasePermission):
    """Data Encoders may export only their own scoped records; Directors and Agency Leaders may export oversight data."""
    def has_permission(self, request, view):
        return any(
            permission().has_permission(request, view)
            for permission in (IsDataEncoder, IsDirector, IsAgencyLeader)
        )


class IsOversightReporter(permissions.BasePermission):
    """Dashboard-wide statistics are limited to Directors and Agency Leaders."""
    def has_permission(self, request, view):
        return (
            IsDirector().has_permission(request, view) or
            IsAgencyLeader().has_permission(request, view)
        )


class IsTraderReadAllowed(permissions.BasePermission):
    """Only known operational and oversight roles may query trader records."""
    def has_permission(self, request, view):
        user = request.user
        if not _authenticated(user):
            return False
        return (
            user.role in ('DATA_ENCODER', 'DIRECTOR', 'AGENCY_LEADER', 'SYSTEM_ADMINISTRATOR') or
            _has_group(user, 'DATA_ENCODER', 'DIRECTOR_OF_TRADER_CONTROL', 'AGENCY_LEADER', 'ADMINISTRATOR')
        )


class IsFormalizationReader(permissions.BasePermission):
    """Directors and oversight roles may read formalization records."""
    def has_permission(self, request, view):
        user = request.user
        if not _authenticated(user):
            return False
        if user.role == 'DATA_ENCODER' or _has_group(user, 'DATA_ENCODER'):
            return False
        return (
            user.role in ('DIRECTOR', 'AGENCY_LEADER', 'SYSTEM_ADMINISTRATOR') or
            _has_group(user, 'DIRECTOR_OF_TRADER_CONTROL', 'AGENCY_LEADER', 'ADMINISTRATOR')
        )


class IsAuditReader(permissions.BasePermission):
    """Audit trails are limited to review and oversight roles."""
    def has_permission(self, request, view):
        user = request.user
        if not _authenticated(user):
            return False
        if user.role == 'DATA_ENCODER' or _has_group(user, 'DATA_ENCODER'):
            return False
        return (
            user.role in ('DIRECTOR', 'AGENCY_LEADER', 'SYSTEM_ADMINISTRATOR') or
            _has_group(user, 'DIRECTOR_OF_TRADER_CONTROL', 'AGENCY_LEADER', 'ADMINISTRATOR')
        )
