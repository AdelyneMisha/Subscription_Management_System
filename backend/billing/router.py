from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse

from core.auth import current_user, staff_or_admin
from . import service

router = APIRouter(tags=["invoices"])


def _own(user, inv):
    if user["role"] == "customer" and inv["customer_id"] != user["id"]:
        raise HTTPException(404, "Invoice not found")


@router.get("/invoices")
def list_invoices(status: Optional[str] = None, overdue: bool = False,
                  customer_id: Optional[str] = None, subscription_id: Optional[int] = None,
                  date_from: Optional[str] = None, date_to: Optional[str] = None,
                  page: int = Query(1, ge=1), size: int = Query(20, ge=1, le=100),
                  user=Depends(current_user)):
    return service.list_invoices(user, status, overdue, customer_id, subscription_id,
                                 date_from, date_to, page, size)


@router.get("/invoices/summary")
def summary(user=Depends(staff_or_admin)):
    return service.summary()


@router.post("/billing/run")
def run_billing(as_of: Optional[date] = None, user=Depends(staff_or_admin)):
    """Run billing for all due subscriptions. as_of (admin only) is for demos/testing."""
    if as_of and user["role"] != "admin":
        raise HTTPException(403, "Only admin can run billing for another date")
    return service.run_billing(as_of)


@router.post("/invoices/generate/{subscription_id}")
def generate_one(subscription_id: int, user=Depends(staff_or_admin)):
    made = service.generate_for_subscription_id(subscription_id)
    return {"created": len(made), "invoice_ids": [m["id"] for m in made]}


@router.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: int, user=Depends(current_user)):
    inv = service.get_invoice_full(invoice_id)
    _own(user, inv)
    return inv


@router.post("/invoices/{invoice_id}/confirm")
def confirm(invoice_id: int, user=Depends(staff_or_admin)):
    return service.confirm_invoice(invoice_id)


@router.post("/invoices/{invoice_id}/cancel")
def cancel(invoice_id: int, user=Depends(staff_or_admin)):
    return service.cancel_invoice(invoice_id)


@router.post("/invoices/{invoice_id}/send")
def send(invoice_id: int, user=Depends(staff_or_admin)):
    return service.send_invoice(invoice_id)


@router.get("/invoices/{invoice_id}/print", response_class=HTMLResponse)
def print_invoice(invoice_id: int, user=Depends(current_user)):
    inv = service.get_invoice_full(invoice_id)
    _own(user, inv)
    return service.render_html(inv)
