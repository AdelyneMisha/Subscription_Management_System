import logging
import re
import smtplib
import threading
from datetime import date, timedelta
from decimal import Decimal, ROUND_HALF_UP
from email.message import EmailMessage
from html import escape

from dateutil.relativedelta import relativedelta
from fastapi import HTTPException

from core.config import (DEFAULT_TAX_RATE, SMTP_FROM, SMTP_HOST, SMTP_PASS,
                         SMTP_PORT, SMTP_USER, USE_CANCELLED_STATUS)
from core.db import db, fetch_all

log = logging.getLogger("billing")
_run_lock = threading.Lock()
MAX_PERIODS_PER_RUN = 12

STEP = {"daily": relativedelta(days=1), "weekly": relativedelta(weeks=1),
        "monthly": relativedelta(months=1), "yearly": relativedelta(years=1)}


def D(x):
    return Decimal(str(x if x is not None else 0))


def money(x):
    return D(x).quantize(Decimal("0.01"), ROUND_HALF_UP)


# ───────────────────────── calculation ─────────────────────────
def disc_amount(d, base):
    v = D(d["value"])
    amt = base * v / 100 if d["rule_type"] == "percentage" else v
    return min(money(amt), base)


def calculate(items, discounts, sub_id):
    """Pure function: subscription lines + discounts -> invoice lines and totals.
    subscription_items.taxes is treated as a percent rate (e.g. 18)."""
    discounts = [d for d in discounts
                 if d["usage_limit"] is None or d["usage_count"] < d["usage_limit"]]
    lines = []
    for it in items:
        price, qty = D(it["unit_price"]), int(it["quantity"])
        lines.append({"product_id": it["product_id"], "quantity": qty, "unit_price": price,
                      "gross": money(price * qty), "disc": Decimal(0),
                      "rate": D(it.get("taxes")) or DEFAULT_TAX_RATE})
    used = {}

    # 1) product-level discounts: best one per line
    for ln in lines:
        best = None
        for d in discounts:
            if d["target_type"] != "product" or d["target_id"] not in (None, ln["product_id"]):
                continue
            if ln["quantity"] < (d["min_quantity"] or 0) or ln["gross"] < D(d["min_purchase"]):
                continue
            a = disc_amount(d, ln["gross"])
            if a > 0 and (best is None or a > best[1]):
                best = (d, a)
        if best:
            ln["disc"] = best[1]
            used[best[0]["id"]] = best[0]

    # 2) subscription-level discount: best one, spread across lines
    net = sum((l["gross"] - l["disc"] for l in lines), Decimal(0))
    qty_total = sum(l["quantity"] for l in lines)
    best = None
    for d in discounts:
        if d["target_type"] != "subscription" or d["target_id"] not in (None, sub_id):
            continue
        if qty_total < (d["min_quantity"] or 0) or net < D(d["min_purchase"]):
            continue
        a = disc_amount(d, net)
        if a > 0 and (best is None or a > best[1]):
            best = (d, a)
    if best and net > 0:
        left = best[1]
        for i, ln in enumerate(lines):
            rem = ln["gross"] - ln["disc"]
            share = left if i == len(lines) - 1 else min(money(best[1] * rem / net), left)
            share = min(share, rem)
            ln["disc"] += share
            left -= share
        used[best[0]["id"]] = best[0]

    for ln in lines:
        ln["amount"] = ln["gross"] - ln["disc"]            # net of discount, before tax
        ln["tax"] = money(ln["amount"] * ln["rate"] / 100)

    subtotal = sum((l["gross"] for l in lines), Decimal(0))
    discount_total = sum((l["disc"] for l in lines), Decimal(0))
    tax_total = sum((l["tax"] for l in lines), Decimal(0))
    return {"lines": lines, "subtotal": subtotal, "discount_total": discount_total,
            "tax_total": tax_total, "total": subtotal - discount_total + tax_total,
            "used": list(used.values())}


def due_days(terms):
    if not terms:
        return 15
    m = re.search(r"\d+", terms)
    if m:
        return int(m.group())
    return 0 if "immediate" in terms.lower() else 15


def load_discounts(today):
    rows = fetch_all("discounts", filters={"is_active": True})
    t = today.isoformat()
    return [d for d in rows if d["start_date"] <= t <= d["end_date"]
            and (d["usage_limit"] is None or d["usage_count"] < d["usage_limit"])]


def claim_discount(d):
    """Optimistic compare-and-swap on usage_count so the limit is never exceeded."""
    for _ in range(3):
        if d["usage_limit"] is not None and d["usage_count"] >= d["usage_limit"]:
            return False
        r = (db.table("discounts").update({"usage_count": d["usage_count"] + 1})
             .eq("id", d["id"]).eq("usage_count", d["usage_count"]).execute())
        if r.data:
            d["usage_count"] += 1
            return True
        d.update(db.table("discounts").select("*").eq("id", d["id"]).execute().data[0])
    return False


# ───────────────────────── generation ─────────────────────────
def _create_invoice(sub, start, end, discounts, today):
    key = {"subscription_id": sub["id"], "billing_period_start": start.isoformat(),
           "billing_period_end": end.isoformat()}
    # guard 1: already billed?
    if db.table("invoices").select("id").match(key).execute().data:
        return None
    items = fetch_all("subscription_items", filters={"subscription_id": sub["id"]})
    if not items:
        return None
    calc = calculate(items, discounts, sub["id"])
    row = db.table("invoices").insert({
        **key, "customer_id": sub["customer_id"], "status": "Draft",
        "issue_date": today.isoformat(),
        "due_date": (today + timedelta(days=due_days(sub.get("payment_terms")))).isoformat(),
        "subtotal": float(calc["subtotal"]), "tax_total": float(calc["tax_total"]),
        "discount_total": float(calc["discount_total"]), "total_amount": float(calc["total"]),
    }).execute().data[0]
    # guard 2: race check - lowest id for this period wins, any other copy deletes itself
    ids = [r["id"] for r in db.table("invoices").select("id").match(key).order("id").execute().data]
    if ids[0] != row["id"]:
        db.table("invoices").delete().eq("id", row["id"]).execute()
        return None
    try:
        db.table("invoice_items").insert([{
            "invoice_id": row["id"], "product_id": l["product_id"], "quantity": l["quantity"],
            "unit_price": float(l["unit_price"]), "taxes": float(l["tax"]),
            "amount": float(l["amount"])} for l in calc["lines"]]).execute()
    except Exception:
        db.table("invoices").delete().eq("id", row["id"]).execute()
        raise
    for d in calc["used"]:
        if not claim_discount(d):
            log.warning("Discount %s hit its usage limit during concurrent billing", d["id"])
    return row


def generate_for_subscription(sub, plan, discounts, today=None):
    today = today or date.today()
    made = []
    for _ in range(MAX_PERIODS_PER_RUN):
        last = (db.table("invoices").select("billing_period_end").eq("subscription_id", sub["id"])
                .order("billing_period_end", desc=True).limit(1).execute().data)
        start = (date.fromisoformat(last[0]["billing_period_end"]) + timedelta(days=1)
                 if last else date.fromisoformat(sub["start_date"]))
        if start > today:
            break
        if sub.get("expiry_date") and start > date.fromisoformat(sub["expiry_date"]):
            break
        if plan.get("end_date") and start > date.fromisoformat(plan["end_date"]):
            break
        end = start + STEP[plan["billing_frequency"]] - timedelta(days=1)
        inv = _create_invoice(sub, start, end, discounts, today)
        if not inv:
            break
        made.append(inv)
    return made


def run_billing(today=None):
    today = today or date.today()
    if not _run_lock.acquire(blocking=False):
        return {"status": "already_running"}
    try:
        plans = {p["id"]: p for p in fetch_all("plans")}
        subs = fetch_all("subscriptions", filters={"status": "Active"})
        discounts = load_discounts(today)
        created, errors = 0, []
        for s in subs:
            plan = plans.get(s["plan_id"])
            if not plan:
                continue
            try:
                created += len(generate_for_subscription(s, plan, discounts, today))
            except Exception as ex:  # one bad subscription must not stop the batch
                log.exception("Billing failed for subscription %s", s["id"])
                errors.append({"subscription_id": s["id"], "error": str(ex)})
        log.info("Billing run: %s subs, %s invoices, %s errors", len(subs), created, len(errors))
        return {"status": "done", "as_of": today.isoformat(), "subscriptions_checked": len(subs),
                "invoices_created": created, "errors": errors}
    finally:
        _run_lock.release()


def generate_for_subscription_id(sub_id, today=None):
    today = today or date.today()
    subs = db.table("subscriptions").select("*").eq("id", sub_id).execute().data
    if not subs:
        raise HTTPException(404, "Subscription not found")
    sub = subs[0]
    if sub["status"] != "Active":
        raise HTTPException(400, "Only Active subscriptions can be billed")
    plan = db.table("plans").select("*").eq("id", sub["plan_id"]).execute().data[0]
    return generate_for_subscription(sub, plan, load_discounts(today), today)


# ───────────────────────── reads ─────────────────────────
def with_paid(invoices):
    ids = [i["id"] for i in invoices]
    paid = {}
    if ids:
        for p in db.table("payments").select("invoice_id,amount").in_("invoice_id", ids).execute().data:
            paid[p["invoice_id"]] = paid.get(p["invoice_id"], Decimal(0)) + D(p["amount"])
    today = date.today().isoformat()
    for i in invoices:
        p = paid.get(i["id"], Decimal(0))
        i["number"] = f"INV-{i['id']:06d}"
        i["paid"] = float(p)
        i["outstanding"] = float(money(D(i["total_amount"]) - p))
        i["is_overdue"] = i["status"] == "Confirmed" and i["due_date"] < today
    return invoices


def list_invoices(user, status=None, overdue=False, customer_id=None, subscription_id=None,
                  date_from=None, date_to=None, page=1, size=20):
    q = db.table("invoices").select("*, profiles(company_name,email)", count="exact")
    if user["role"] == "customer":
        customer_id = user["id"]
    if customer_id:
        q = q.eq("customer_id", customer_id)
    if subscription_id:
        q = q.eq("subscription_id", subscription_id)
    if overdue:
        q = q.eq("status", "Confirmed").lt("due_date", date.today().isoformat())
    elif status:
        q = q.eq("status", status)
    if date_from:
        q = q.gte("issue_date", date_from)
    if date_to:
        q = q.lte("issue_date", date_to)
    r = q.order("issue_date", desc=True).order("id", desc=True).range((page - 1) * size, page * size - 1).execute()
    return {"items": with_paid(r.data), "total": r.count or 0, "page": page, "size": size}


def get_invoice_full(invoice_id):
    rows = (db.table("invoices").select("*, profiles(company_name,email,tax_id,billing_address)")
            .eq("id", invoice_id).execute().data)
    if not rows:
        raise HTTPException(404, "Invoice not found")
    inv = with_paid(rows)[0]
    inv["items"] = (db.table("invoice_items").select("*, products(name)")
                    .eq("invoice_id", invoice_id).order("id").execute().data)
    inv["payments"] = (db.table("payments").select("*").eq("invoice_id", invoice_id)
                       .order("payment_date").execute().data)
    return inv


def summary():
    invs = fetch_all("invoices", "id,status,total_amount,due_date")
    paid = {}
    for p in fetch_all("payments", "id,invoice_id,amount"):
        paid[p["invoice_id"]] = paid.get(p["invoice_id"], Decimal(0)) + D(p["amount"])
    today = date.today().isoformat()
    by_status, outstanding, overdue_amt, overdue_n = {}, Decimal(0), Decimal(0), 0
    for i in invs:
        by_status[i["status"]] = by_status.get(i["status"], 0) + 1
        if i["status"] == "Confirmed":
            owed = D(i["total_amount"]) - paid.get(i["id"], Decimal(0))
            outstanding += owed
            if i["due_date"] < today:
                overdue_amt += owed
                overdue_n += 1
    active = db.table("subscriptions").select("id", count="exact").eq("status", "Active").limit(1).execute().count
    return {"active_subscriptions": active or 0, "invoices_by_status": by_status,
            "revenue_collected": float(sum(paid.values(), Decimal(0))),
            "outstanding": float(outstanding), "overdue_count": overdue_n,
            "overdue_amount": float(overdue_amt)}


# ───────────────────────── status actions ─────────────────────────
def _status_row(invoice_id):
    rows = db.table("invoices").select("id,status").eq("id", invoice_id).execute().data
    if not rows:
        raise HTTPException(404, "Invoice not found")
    return rows[0]


def confirm_invoice(invoice_id):
    if _status_row(invoice_id)["status"] != "Draft":
        raise HTTPException(400, "Only Draft invoices can be confirmed")
    db.table("invoices").update({"status": "Confirmed"}).eq("id", invoice_id).eq("status", "Draft").execute()
    return {"id": invoice_id, "status": "Confirmed"}


def cancel_invoice(invoice_id):
    inv = _status_row(invoice_id)
    if inv["status"] == "Paid":
        raise HTTPException(400, "Paid invoices cannot be cancelled")
    if db.table("payments").select("id").eq("invoice_id", invoice_id).limit(1).execute().data:
        raise HTTPException(400, "Invoice has payments and cannot be cancelled")
    if USE_CANCELLED_STATUS:
        db.table("invoices").update({"status": "Cancelled"}).eq("id", invoice_id).execute()
    else:  # schema has no 'Cancelled' status, so cancelling removes the invoice
        db.table("invoice_items").delete().eq("invoice_id", invoice_id).execute()
        db.table("invoices").delete().eq("id", invoice_id).execute()
    return {"id": invoice_id, "cancelled": True}


def render_html(inv):
    p = inv.get("profiles") or {}
    rows = "".join(
        f"<tr><td>{escape(str((i.get('products') or {}).get('name') or i['product_id']))}</td>"
        f"<td>{i['quantity']}</td><td>{i['unit_price']}</td><td>{i['taxes']}</td><td>{i['amount']}</td></tr>"
        for i in inv["items"])
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{inv['number']}</title>
<style>body{{font-family:Arial,sans-serif;max-width:760px;margin:30px auto;color:#222}}
table{{width:100%;border-collapse:collapse;margin:16px 0}}th,td{{border-bottom:1px solid #ddd;padding:8px;text-align:left}}
.r{{text-align:right}}</style></head><body>
<h1>Invoice {inv['number']}</h1>
<p><b>Status:</b> {inv['status']}<br><b>Issued:</b> {inv['issue_date']} &nbsp; <b>Due:</b> {inv['due_date']}<br>
<b>Period:</b> {inv['billing_period_start']} to {inv['billing_period_end']}</p>
<p><b>Bill to:</b><br>{escape(p.get('company_name') or '')}<br>{escape(p.get('billing_address') or '')}<br>
{('Tax ID: ' + escape(p['tax_id'])) if p.get('tax_id') else ''}</p>
<table><tr><th>Product</th><th>Qty</th><th>Unit price</th><th>Tax</th><th>Amount</th></tr>{rows}</table>
<p class="r">Subtotal: {inv['subtotal']}<br>Discount: -{inv['discount_total']}<br>Tax: {inv['tax_total']}<br>
<b>Total: {inv['total_amount']}</b><br>Paid: {inv['paid']}<br><b>Outstanding: {inv['outstanding']}</b></p>
</body></html>"""


def send_invoice(invoice_id):
    inv = get_invoice_full(invoice_id)
    if inv["status"] != "Confirmed":
        raise HTTPException(400, "Only Confirmed invoices can be sent")
    to = (inv.get("profiles") or {}).get("email")
    if not to:
        raise HTTPException(400, "Customer has no email")
    if not SMTP_HOST:
        log.info("SMTP not configured - simulated send of %s to %s", inv["number"], to)
        return {"sent": False, "simulated": True, "to": to}
    msg = EmailMessage()
    msg["Subject"], msg["From"], msg["To"] = f"Invoice {inv['number']}", SMTP_FROM or SMTP_USER, to
    msg.set_content("Please view this email in an HTML-capable client.")
    msg.add_alternative(render_html(inv), subtype="html")
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
        s.starttls()
        if SMTP_USER:
            s.login(SMTP_USER, SMTP_PASS)
        s.send_message(msg)
    return {"sent": True, "to": to}
