import httpx
from typing import Optional, Dict, Any, List
from .exceptions import (
    ClusterPayError,
    AuthenticationError,
    InvalidAmountError,
    SessionNotFoundError,
    RateLimitError
)

class ClusterPay:
    """
    ⚡ ClusterPay Python SDK Client
    Provides synchronous and asynchronous methods for creating checkouts,
    querying settlement statuses, and managing payment sessions.
    """

    def __init__(
        self,
        api_key: str,
        base_url: str = "https://pay.rapidx.me",
        timeout: float = 15.0
    ):
        """
        Initialize the ClusterPay client.

        Parameters:
            api_key (str): Your 256-bit Merchant API Key ('CS_key_live_...').
            base_url (str): Your self-hosted or cloud ClusterPay gateway URL.
            timeout (float): HTTP request timeout in seconds (default: 15.0).
        """
        if not api_key or not isinstance(api_key, str):
            raise AuthenticationError("A valid API Key starting with 'CS_key_' is required.")
        self.api_key = api_key.strip()
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "ClusterPay-Python-SDK/2.1.0"
        }

    def _handle_response(self, res: httpx.Response) -> Dict[str, Any]:
        if res.status_code == 401:
            raise AuthenticationError("Invalid or unauthorized API key.")
        elif res.status_code == 403:
            raise AuthenticationError("Access denied: Account suspended or Client IP not whitelisted.")
        elif res.status_code == 404:
            raise SessionNotFoundError("Requested checkout session ID was not found.")
        elif res.status_code == 429:
            raise RateLimitError("Rate limit exceeded (60 checkouts/minute).")
        elif res.status_code >= 400:
            try:
                err_data = res.json()
                detail = err_data.get("detail", res.text)
            except Exception:
                detail = res.text
            raise ClusterPayError(f"HTTP {res.status_code}: {detail}")

        return res.json()

    def create_checkout(
        self,
        amount: float,
        callback_url: str,
        currency: str = "USD",
        custom_id: Optional[str] = None,
        description: Optional[str] = None,
        wallets: Optional[Dict[str, str]] = None,
        allowed_origins: Optional[List[str]] = None,
        allowed_ips: Optional[List[str]] = None,
        redirect_url: Optional[str] = None,
        expires_in_minutes: int = 15,
        surcharge_percent: float = 0.0,
        merchant_name: Optional[str] = None,
        merchant_url: Optional[str] = None,
        logo_url: Optional[str] = None,
        theme_color: Optional[str] = None,
        mode: str = "hosted",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Synchronously creates a new 6-decimal precision cryptocurrency checkout invoice.

        Parameters:
            amount (float): Invoice amount in specified fiat/crypto currency.
            callback_url (str): HTTPS webhook URL for payment confirmations.
            currency (str): Currency code (USD, INR, EUR, GBP, AED, JPY, USDT).
            custom_id (str, optional): Internal tracking reference (order_id, user_id).
            wallets (dict, optional): Destination wallet overrides (bep20, trc20, poly, arb, ton, ltc, btc).
        """
        if amount <= 0:
            raise InvalidAmountError("Payment amount must be greater than 0.")

        payload = {
            "amount": float(amount),
            "currency": currency.upper(),
            "callback_url": callback_url,
            "custom_id": custom_id,
            "description": description,
            "wallets": wallets or {},
            "allowed_origins": allowed_origins or [],
            "allowed_ips": allowed_ips or [],
            "redirect_url": redirect_url,
            "expires_in_minutes": expires_in_minutes,
            "surcharge_percent": surcharge_percent,
            "merchant_name": merchant_name,
            "merchant_url": merchant_url,
            "logo_url": logo_url,
            "theme_color": theme_color,
            "mode": mode,
            **kwargs
        }

        with httpx.Client(timeout=self.timeout) as client:
            res = client.post(f"{self.base_url}/api/v1/checkout", json=payload, headers=self.headers)
            return self._handle_response(res)

    async def create_checkout_async(
        self,
        amount: float,
        callback_url: str,
        currency: str = "USD",
        custom_id: Optional[str] = None,
        description: Optional[str] = None,
        wallets: Optional[Dict[str, str]] = None,
        allowed_origins: Optional[List[str]] = None,
        allowed_ips: Optional[List[str]] = None,
        redirect_url: Optional[str] = None,
        expires_in_minutes: int = 15,
        surcharge_percent: float = 0.0,
        merchant_name: Optional[str] = None,
        merchant_url: Optional[str] = None,
        logo_url: Optional[str] = None,
        theme_color: Optional[str] = None,
        mode: str = "hosted",
        **kwargs
    ) -> Dict[str, Any]:
        """
        Asynchronously creates a new cryptocurrency checkout invoice (Optimized for FastAPI & Telegram bots).
        """
        if amount <= 0:
            raise InvalidAmountError("Payment amount must be greater than 0.")

        payload = {
            "amount": float(amount),
            "currency": currency.upper(),
            "callback_url": callback_url,
            "custom_id": custom_id,
            "description": description,
            "wallets": wallets or {},
            "allowed_origins": allowed_origins or [],
            "allowed_ips": allowed_ips or [],
            "redirect_url": redirect_url,
            "expires_in_minutes": expires_in_minutes,
            "surcharge_percent": surcharge_percent,
            "merchant_name": merchant_name,
            "merchant_url": merchant_url,
            "logo_url": logo_url,
            "theme_color": theme_color,
            "mode": mode,
            **kwargs
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(f"{self.base_url}/api/v1/checkout", json=payload, headers=self.headers)
            return self._handle_response(res)

    def get_status(self, session_id: str) -> Dict[str, Any]:
        """Query the real-time settlement status of a session."""
        with httpx.Client(timeout=self.timeout) as client:
            res = client.get(f"{self.base_url}/api/v1/status/{session_id}", headers=self.headers)
            return self._handle_response(res)

    async def get_status_async(self, session_id: str) -> Dict[str, Any]:
        """Asynchronously query the settlement status of a session."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.get(f"{self.base_url}/api/v1/status/{session_id}", headers=self.headers)
            return self._handle_response(res)

    def resend_webhook(self, session_id: str) -> Dict[str, Any]:
        """Manually trigger a signed webhook re-delivery for a settled session."""
        with httpx.Client(timeout=self.timeout) as client:
            res = client.post(f"{self.base_url}/api/v1/webhook/resend/{session_id}", headers=self.headers)
            return self._handle_response(res)

    async def resend_webhook_async(self, session_id: str) -> Dict[str, Any]:
        """Asynchronously trigger a signed webhook re-delivery."""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(f"{self.base_url}/api/v1/webhook/resend/{session_id}", headers=self.headers)
            return self._handle_response(res)
