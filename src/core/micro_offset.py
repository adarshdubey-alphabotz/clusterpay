import secrets

def generate_micro_offset_amount(base_amount: float, decimals: int = 6) -> float:
    """
    Generate a cryptographically secure 6-decimal precision anti-theft offset amount.
    The first two decimal places after the base cents are always preserved with micro-offsets
    strictly in the range 0.001000 to 0.009999 (less than 1 cent difference).
    
    Example: 
      $1.00 -> $1.004829 (Cost difference: +$0.004829, less than half a cent).
      $10.00 -> $10.001234
    """
    # Offset strictly in the range 0.001000 to 0.009999 (100,000 to 999,999 / 100,000,000)
    offset_micro = secrets.randbelow(900000) + 100000
    offset = offset_micro / 100000000.0
    return round(base_amount + round(offset, decimals), decimals)
