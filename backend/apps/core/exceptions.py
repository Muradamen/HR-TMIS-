from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.utils.translation import gettext as _

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)

    if response is not None:
        error_code = 'GENERIC_ERROR'
        if response.status_code == 401:
            error_code = 'UNAUTHORIZED'
        elif response.status_code == 403:
            error_code = 'FORBIDDEN_ACTION'
        elif response.status_code == 404:
            error_code = 'RECORD_NOT_FOUND'
        elif response.status_code == 400:
            error_code = 'VALIDATION_FAILED'
        elif response.status_code == 409:
            error_code = 'CONFLICT'

        if isinstance(response.data, dict) and 'code' in response.data:
            error_code = response.data['code']

        detail_msg = ""
        if isinstance(response.data, dict):
            detail_msg = response.data.get('detail') or response.data.get('message') or ""
        elif isinstance(response.data, list) and response.data:
            detail_msg = str(response.data[0])

        response.data = {
            'code': error_code,
            'message': str(detail_msg or _('An error occurred while processing the request.')),
            'detail': str(detail_msg or _('An error occurred while processing the request.')),
            'status': response.status_code,
            'errors': response.data if isinstance(response.data, dict) else {'general': response.data}
        }

    return response
