# If the team already has a main.py, just copy the include_router lines + lifespan scheduler.
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from billing.discounts_router import router as discounts_router
from billing.router import router as billing_router
from billing.scheduler import start_scheduler, stop_scheduler
from core.auth import current_user
from core.config import CORS_ORIGINS
from payments.router import router as payments_router


@asynccontextmanager
async def lifespan(app):
    start_scheduler()   # run uvicorn with ONE worker so only one scheduler exists
    yield
    stop_scheduler()


app = FastAPI(title="Subscription Billing API", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"])
app.include_router(billing_router)
app.include_router(discounts_router)
app.include_router(payments_router)


@app.get("/me")
def me(user=Depends(current_user)):
    return user


@app.get("/health")
def health():
    return {"ok": True}
