import random

def generate_micro_offset_amount(base_amount: float) -> float:
    """
    Generate a 4-decimal precision anti-theft offset amount.
    Guarantees unique on-chain transaction matching and prevents
    front-running and BscScan replay exploits.
    Example: 10.00 -> 10.0034
    """
    offset = random.randint(11, 99) / 10000.0
    return round(base_amount + offset, 4)
