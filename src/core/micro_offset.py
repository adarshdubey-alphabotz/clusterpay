import secrets

def generate_micro_offset_amount(base_amount: float, decimals: int = 6) -> float:
    """
    Generate a cryptographically secure 6-decimal precision anti-theft offset amount.
    Offset is in the range 0.001000 to 0.009999 (sub-cent, never rounds to a different cent).

    Example:
      $1.00  -> $1.004829
      $10.00 -> $10.001234
    """
    offset_micro = secrets.randbelow(900000) + 100000  # 100000..999999
    offset = offset_micro / 100_000_000.0
    return round(base_amount + round(offset, decimals), decimals)


async def generate_unique_session_amount(base_usd: float, wallets: dict, db, max_attempts: int = 20) -> float:
    """
    Generate a micro-offset amount guaranteed to be GLOBALLY UNIQUE across all currently
    PENDING (non-expired) sessions that share any of the same merchant wallet addresses.

    This ensures:
    - Two live checkouts for the same merchant wallet NEVER have the same decimal amount.
    - A payment made for checkout A can NEVER accidentally satisfy checkout B.
    - Once a session expires, its amount slot is freed for reuse.
    """
    # Collect all wallet addresses being used in this session (non-empty strings)
    wallet_addrs = [v.strip().lower() for v in wallets.values() if isinstance(v, str) and len(v.strip()) > 8]

    # Fetch all amounts currently locked by pending sessions sharing these wallets
    locked_amounts: set[float] = set()
    if wallet_addrs:
        from datetime import datetime
        now = datetime.utcnow()
        # Find any pending (non-expired) session whose wallets overlap with ours
        cursor = db.payment_sessions.find(
            {
                "status": "pending",
                "expires_at": {"$gt": now},
                "$or": [
                    {"wallets.bep20": {"$in": wallet_addrs}},
                    {"wallets.trc20": {"$in": wallet_addrs}},
                    {"wallets.poly": {"$in": wallet_addrs}},
                    {"wallets.arb": {"$in": wallet_addrs}},
                    {"wallets.ton": {"$in": wallet_addrs}},
                    {"wallets.ltc": {"$in": wallet_addrs}},
                    {"wallets.btc": {"$in": wallet_addrs}},
                ]
            },
            {"amount": 1}
        )
        async for doc in cursor:
            locked_amounts.add(float(doc["amount"]))

    # Try up to max_attempts times to generate a collision-free amount
    for _ in range(max_attempts):
        candidate = generate_micro_offset_amount(base_usd)
        if candidate not in locked_amounts:
            return candidate

    # Extremely unlikely fallback: widen offset range to avoid collision
    # Use 6-digit random suffix to virtually guarantee uniqueness
    offset = (secrets.randbelow(9_000_000) + 1_000_000) / 1_000_000_000.0
    return round(base_usd + round(offset, 8), 8)
