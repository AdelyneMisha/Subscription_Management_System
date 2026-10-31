from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db import supabase

app = FastAPI(title="Brightloop Subscription Management API")

# Allow requests from our React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Brightloop Backend is running!"}

@app.get("/health")
def health_check():
    return {"status": "OK"}

@app.get("/test-db")
def test_db():
    try:
        response = supabase.table("profiles").select("id").limit(1).execute()

        return {
            "status": "success",
            "message": "Connected to Supabase successfully!"
        }

    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }