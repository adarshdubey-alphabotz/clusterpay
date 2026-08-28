"""
⚡ ClusterPay Python SDK
Non-custodial cryptocurrency checkout and payment gateway client.
"""

from .client import ClusterPay
from .webhook import verify_webhook_signature
from .exceptions import (
    ClusterPayError,
    AuthenticationError,
    InvalidAmountError,
    SessionNotFoundError,
    RateLimitError,
    SignatureVerificationError,
)

__version__ = "1.0.1"
__all__ = [
    "ClusterPay",
    "verify_webhook_signature",
    "ClusterPayError",
    "AuthenticationError",
    "InvalidAmountError",
    "SessionNotFoundError",
    "RateLimitError",
    "SignatureVerificationError",
]
