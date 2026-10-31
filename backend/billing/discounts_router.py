from datetime import date
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator

from core.auth import admin_only, staff_or_admin
from core.db import db

router = APIRouter(prefix="/discounts", tags=["discounts"])


class DiscountIn(BaseModel):
    code: Optional[str] = None
    rule_type: Literal["fixed", "percentage"]
    value: float = Field(gt=0)
    min_purchase: float = Field(0, ge=0)
    min_quantity: int = Field(0, ge=0)
    start_date: date
    end_date: date
    usage_limit: Optional[int] = Field(100, ge=1)
    target_type: Literal["product", "subscription"]
    target_id: Optional[int] = None   # None = applies to all products / all subscriptions
    is_active: bool = True

    @model_validator(mode="after")
    def check(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date must be on or after start_date")
        if self.rule_type == "percentage" and self.value > 100:
            raise ValueError("percentage discount cannot exceed 100")
        return self


def _payload(d: DiscountIn):
    data = d.model_dump(mode="json")
    data["code"] = (data["code"] or "").strip().upper() or None
    return data


def _run(fn):
    try:
        return fn()
    except Exception as e:
        raise HTTPException(400, str(getattr(e, "message", e)))


@router.get("")
def list_discounts(user=Depends(staff_or_admin)):
    return db.table("discounts").select("*").order("id", desc=True).execute().data


@router.post("")
def create(d: DiscountIn, user=Depends(admin_only)):
    return _run(lambda: db.table("discounts").insert(_payload(d)).execute().data[0])


@router.put("/{discount_id}")
def update(discount_id: int, d: DiscountIn, user=Depends(admin_only)):
    rows = _run(lambda: db.table("discounts").update(_payload(d)).eq("id", discount_id).execute().data)
    if not rows:
        raise HTTPException(404, "Discount not found")
    return rows[0]


@router.delete("/{discount_id}")
def delete(discount_id: int, user=Depends(admin_only)):
    _run(lambda: db.table("discounts").delete().eq("id", discount_id).execute())
    return {"deleted": discount_id}
