from decimal import Decimal

from pydantic import BaseModel, Field


class PaymentRequest(BaseModel):
    merchant_id: str = Field(min_length=1)
    amount: Decimal = Field(gt=0)
    currency: str = Field(min_length=3, max_length=3)


class PaymentResponse(BaseModel):
    transaction_id: str
    merchant_id: str
    amount: Decimal
    currency: str
    gateway: str


class PaymentWebhookEvent(BaseModel):
    transaction_id: str = Field(min_length=1)
    success: bool
