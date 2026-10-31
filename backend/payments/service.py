from datetime import date
from decimal import Decimal

from fastapi import HTTPException

from billing.service import D, money
from core.db import db


def _paid(invoice_id):
    rows = db.table("payments").select("amount").eq("invoice_id", invoice_id).execute().data
    return sum((D(r["amount"]) for r in rows), Decimal(0))


def record_payment(data):
    rows = db.table("invoices").select("id,status,total_amount").eq("id", data.invoice_id).execute().data
    if not rows:
        raise HTTPException(404, "Invoice not found")
    inv = rows[0]
    if inv["status"] == "Draft":
        raise HTTPException(400, "Confirm the invoice before recording payments")
    if inv["status"] == "Paid":
        raise HTTPException(400, "Invoice is already paid")
    total, amount = D(inv["total_amount"]), money(data.amount)
    outstanding = total - _paid(inv["id"])
    if amount > outstanding:
        raise HTTPException(400, f"Amount exceeds outstanding balance ({outstanding})")
    pay = db.table("payments").insert({
        "invoice_id": inv["id"], "method": data.method.strip(), "amount": float(amount),
        "payment_date": (data.payment_date or date.today()).isoformat(), "notes": data.notes,
    }).execute().data[0]
    paid = _paid(inv["id"])
    if paid > total:  # concurrent overpayment: roll ours back
        db.table("payments").delete().eq("id", pay["id"]).execute()
        raise HTTPException(409, "Concurrent payment detected, please retry")
    if paid >= total:
        db.table("invoices").update({"status": "Paid"}).eq("id", inv["id"]).execute()
    pay["invoice_status"] = "Paid" if paid >= total else "Confirmed"
    pay["outstanding"] = float(total - paid)
    return pay


def list_payments(user, invoice_id=None, method=None, date_from=None, date_to=None, page=1, size=20):
    q = db.table("payments").select(
        "*, invoices!inner(id,customer_id,total_amount,status,profiles(company_name))", count="exact")
    if user["role"] == "customer":
        q = q.eq("invoices.customer_id", user["id"])
    if invoice_id:
        q = q.eq("invoice_id", invoice_id)
    if method:
        q = q.eq("method", method)
    if date_from:
        q = q.gte("payment_date", date_from)
    if date_to:
        q = q.lte("payment_date", date_to)
    r = q.order("payment_date", desc=True).order("id", desc=True).range((page - 1) * size, page * size - 1).execute()
    return {"items": r.data, "total": r.count or 0, "page": page, "size": size}
