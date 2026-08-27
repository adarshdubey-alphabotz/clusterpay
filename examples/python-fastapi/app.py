import hmac
import hashlib
from fastapi import FastAPI, Request, Header, HTTPException
import httpx

app = FastAPI(title="Merchant Store")
API_KEY = "CS_key_YOUR_SECRET_KEY"
BASE_URL = "https://pay.rapidx.me"

@app.post("/create-order")
async def create_order():
    payload = {
        "amount": 25.00,
        "currency": "USD",
        "callback_url": "https://yourdomain.com/webhook",
        "custom_id": "inv_55412",
        "description": "Digital Goods Purchase"
    }
    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{BASE_URL}/api/v1/checkout",
            json=payload,
            headers={"Authorization": f"Bearer {API_KEY}"}
        )
        return res.json()

@app.post("/webhook")
async def handle_webhook(request: Request, x_clusterpay_signature: str = Header(None)):
    raw_body = await request.body()
    if not x_clusterpay_signature:
        raise HTTPException(status_code=401, detail="Missing signature")

    expected_sig = hmac.new(API_KEY.encode(), raw_body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected_sig, x_clusterpay_signature):
        raise HTTPException(status_code=403, detail="Signature mismatch")

    data = await request.json()
    print(f"Payment received for {data.get('custom_id')}! TX: {data.get('tx_hash')}")
    return {"status": "success"}
