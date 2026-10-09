from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Standardizes error responses without leaking sensitive stack traces or internal secrets.
    """
    response = exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, dict) and 'detail' in response.data:
            response.data = {
                'success': False,
                'error': response.data['detail'],
                'errors': response.data
            }
        else:
            response.data = {
                'success': False,
                'error': 'Validation or processing error occurred',
                'errors': response.data
            }
    else:
        logger.error(f"Unhandled exception in API: {str(exc)}", exc_info=True)
        response = Response({
            'success': False,
            'error': 'An internal server error occurred. Please contact the administrator.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    return response
