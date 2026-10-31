from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field

from core.auth import current_user, staff_or_admin
from . import service

router = APIRouter(prefix="/payments", tags=["payments"])


class PaymentIn(BaseModel):
    invoice_id: int
    method: str = Field(min_length=1)
    amount: float = Field(gt=0)
    payment_date: Optional[date] = None
    notes: Optional[str] = None


@router.post("")
def create(p: PaymentIn, user=Depends(staff_or_admin)):
    return service.record_payment(p)


@router.get("")
def list_payments(invoice_id: Optional[int] = None, method: Optional[str] = None,
                  date_from: Optional[str] = None, date_to: Optional[str] = None,
                  page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
                  user=Depends(current_user)):
    return service.list_payments(user, invoice_id, method, date_from, date_to, page, size)
