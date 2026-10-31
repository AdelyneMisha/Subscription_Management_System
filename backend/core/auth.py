# If Member 1 already built auth, replace current_user with theirs
# (it must return a dict with at least: id, role).
from fastapi import Depends, Header, HTTPException
from .db import anon, db


def current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization[7:]
    try:
        uid = anon.auth.get_user(token).user.id
    except Exception:
        raise HTTPException(401, "Invalid or expired token")
    rows = (db.table("profiles").select("id,email,full_name,company_name,role,is_active")
            .eq("id", uid).limit(1).execute().data)
    if not rows or not rows[0]["is_active"]:
        raise HTTPException(403, "Account inactive or profile missing")
    return rows[0]


def require_roles(*roles):
    def dep(user=Depends(current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "You do not have permission to do this")
        return user
    return dep


staff_or_admin = require_roles("admin", "staff")
admin_only = require_roles("admin")
