import time
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

_CRYPTO_CACHE = {
    "BNB": 600.0,
    "LTC": 85.0,
    "TON": 5.50,
    "POL": 0.45,
    "BTC": 90000.0,
    "_last_updated": 0
}

async def get_crypto_prices() -> dict:
    global _CRYPTO_CACHE
    now = time.time()
    if now - _CRYPTO_CACHE.get("_last_updated", 0) < 60:
        return _CRYPTO_CACHE

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get(
                'https://api.binance.com/api/v3/ticker/price?symbols=["BNBUSDT","LTCUSDT","TONUSDT","BTCUSDT","POLUSDT"]'
            )
            if res.status_code == 200:
                data = res.json()
                for item in data:
                    sym = item.get("symbol", "")
                    price = float(item.get("price", 0))
                    if sym == "BNBUSDT" and price > 0:
                        _CRYPTO_CACHE["BNB"] = price
                    elif sym == "LTCUSDT" and price > 0:
                        _CRYPTO_CACHE["LTC"] = price
                    elif sym == "TONUSDT" and price > 0:
                        _CRYPTO_CACHE["TON"] = price
                    elif sym == "BTCUSDT" and price > 0:
                        _CRYPTO_CACHE["BTC"] = price
                    elif sym == "POLUSDT" and price > 0:
                        _CRYPTO_CACHE["POL"] = price
                _CRYPTO_CACHE["_last_updated"] = now
    except Exception as e:
        logger.debug(f"Crypto price fetch failed (using cache): {e}")

    return _CRYPTO_CACHE

async def convert_to_usd(amount: float, currency: str) -> float:
    currency = currency.upper().strip()
    if currency == "USD":
        return amount
    rate = FIAT_RATES_CACHE.get(currency, 1.0)
    return round(amount * rate, 2)

