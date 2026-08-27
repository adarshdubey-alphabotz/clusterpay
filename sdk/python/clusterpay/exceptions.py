class ClusterPayError(Exception):
    """Base exception for all ClusterPay SDK errors."""
    pass

class AuthenticationError(ClusterPayError):
    """Raised when the API key is missing, invalid, or disabled."""
    pass

class InvalidAmountError(ClusterPayError):
    """Raised when an invalid or negative payment amount is requested."""
    pass

class WebhookVerificationError(ClusterPayError):
    """Raised when webhook signature, timestamp, or nonce verification fails."""
    pass

class SessionNotFoundError(ClusterPayError):
    """Raised when querying a non-existent or expired checkout session."""
    pass

class RateLimitError(ClusterPayError):
    """Raised when API rate limits are exceeded."""
    pass
