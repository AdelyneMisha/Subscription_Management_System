import os
from decimal import Decimal
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_ANON_KEY = os.environ["SUPABASE_ANON_KEY"]
# Service key bypasses RLS (recommended for a trusted backend). Falls back to anon.
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or SUPABASE_ANON_KEY

# Used when a subscription line has taxes = 0/NULL. Tax is treated as a PERCENT RATE.
DEFAULT_TAX_RATE = Decimal(os.getenv("DEFAULT_TAX_RATE", "0"))
BILLING_HOUR = int(os.getenv("BILLING_HOUR", "2"))
# Only set true if the DB owner later allows a 'Cancelled' invoice status.
USE_CANCELLED_STATUS = os.getenv("USE_CANCELLED_STATUS", "false").lower() == "true"
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_FROM = os.getenv("SMTP_FROM")
