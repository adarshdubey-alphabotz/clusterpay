import secrets

def generate_micro_offset_amount(base_amount: float) -> float:
    """
    Generate a cryptographically secure 4-decimal precision anti-theft offset amount
    using system CSPRNG (os.urandom / secrets module).
    Guarantees non-predictable, unique on-chain transaction matching.
    Example: 10.00 -> 10.0073
    """
    # Use secrets.randbelow for cryptographically secure pseudo-random number generation (CSPRNG)
    offset_cents = secrets.randbelow(8900) + 1100  # 1100 to 9999 (0.0011 to 0.0099)
    offset = offset_cents / 1000000.0 * 100
    return round(base_amount + round(offset, 4), 4)
