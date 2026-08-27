from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime

class MerchantProfile(BaseModel):
    merchant_id: int
    name: str
    api_key: str
    api_enabled: bool = True
    allowed_ips: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
