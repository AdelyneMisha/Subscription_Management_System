from supabase import create_client
from .config import SUPABASE_URL, SUPABASE_KEY, SUPABASE_ANON_KEY

db = create_client(SUPABASE_URL, SUPABASE_KEY)          # data access
anon = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)   # verifying user JWTs


def fetch_all(table, select="*", filters=None, page=1000):
    """Fetch every row (PostgREST caps a single response at ~1000 rows)."""
    out, start = [], 0
    while True:
        q = db.table(table).select(select)
        for k, v in (filters or {}).items():
            q = q.eq(k, v)
        rows = q.order("id").range(start, start + page - 1).execute().data
        out += rows
        if len(rows) < page:
            return out
        start += page
