from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from core.config import BILLING_HOUR
from .service import run_billing

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


def start_scheduler():
    # max_instances=1 + coalesce: never two overlapping runs, missed runs merge into one.
    scheduler.add_job(run_billing, CronTrigger(hour=BILLING_HOUR, minute=0), id="daily_billing",
                      max_instances=1, coalesce=True, misfire_grace_time=3600, replace_existing=True)
    scheduler.start()


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
