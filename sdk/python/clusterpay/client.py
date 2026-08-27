import httpx
from typing import Optional, Dict, Any

class ClusterPay:
    def __init__(self, api_key: str, base_url: str = "https://pay.rapidx.me"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "User-Agent": "ClusterPay-Python-SDK/2.0"
        }

    def create_checkout(self, amount: float, callback_url: str, **kwargs) -> Dict[str, Any]:
        """Create a new checkout session synchronously."""
        payload = {"amount": amount, "callback_url": callback_url, **kwargs}
        with httpx.Client(timeout=15.0) as client:
            res = client.post(f"{self.base_url}/api/v1/checkout", json=payload, headers=self.headers)
            res.raise_for_status()
            return res.json()

    async def create_checkout_async(self, amount: float, callback_url: str, **kwargs) -> Dict[str, Any]:
        """Create a new checkout session asynchronously."""
        payload = {"amount": amount, "callback_url": callback_url, **kwargs}
        async with httpx.AsyncClient(timeout=15.0) as client:
            res = await client.post(f"{self.base_url}/api/v1/checkout", json=payload, headers=self.headers)
            res.raise_for_status()
            return res.json()

    def get_status(self, session_id: str) -> Dict[str, Any]:
        """Check live payment settlement status."""
        with httpx.Client(timeout=10.0) as client:
            res = client.get(f"{self.base_url}/api/v1/status/{session_id}", headers=self.headers)
            res.raise_for_status()
            return res.json()
