"""
ClusterPay SDK Exceptions
"""

class ClusterPayError(Exception):
    """Base exception for all ClusterPay SDK errors."""
    pass

class AuthenticationError(ClusterPayError):
    """Raised when the provided API key is invalid, missing, or unauthorized."""
    pass

class InvalidAmountError(ClusterPayError):
    """Raised when the specified checkout amount is invalid (e.g. <= 0)."""
    pass

class SessionNotFoundError(ClusterPayError):
    """Raised when a requested checkout session ID does not exist."""
    pass

class RateLimitError(ClusterPayError):
    """Raised when the API rate limit (60 requests/minute) is exceeded."""
    pass

class SignatureVerificationError(ClusterPayError):
    """Raised when an incoming webhook signature is invalid or has expired."""
    pass
