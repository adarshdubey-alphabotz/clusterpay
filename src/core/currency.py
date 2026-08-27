import httpx
import logging

logger = logging.getLogger(__name__)

FIAT_RATES_CACHE = {
    "USD": 1.0,
    "EUR": 1.08,
    "GBP": 1.28,
    "INR": 0.012,
    "CAD": 0.74,
    "AUD": 0.66,
    "AED": 0.272,
    "RUB": 0.011
}

async def convert_to_usd(amount: float, currency: str) -> float:
    currency = currency.upper().strip()
    if currency == "USD":
        return amount
    rate = FIAT_RATES_CACHE.get(currency, 1.0)
    return round(amount * rate, 2)
