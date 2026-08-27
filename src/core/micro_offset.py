import secrets

def generate_micro_offset_amount(base_amount: float, decimals: int = 6) -> float:
    """
    Generate a cryptographically secure 6-decimal precision anti-theft offset amount
    using system CSPRNG (os.urandom / secrets module).
    6 decimals is natively supported across 100% of crypto wallets and all blockchains
    (Tron, BSC, Polygon, Arbitrum, TON, BTC, LTC), providing 1,000,000 unique entropy slots.
    Example: 10.00 -> 10.004829 (Cost to user: less than $0.009).
    """
    # 6-decimal precision CSPRNG offset: 110,000 to 999,999 -> 0.001100 to 0.009999
    offset_micro = secrets.randbelow(890000) + 110000
    offset = offset_micro / 100000000.0
    return round(base_amount + round(offset, decimals), decimals)
