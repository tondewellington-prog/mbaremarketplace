from fastapi import FastAPI
from routes.search import router as search_router

app = FastAPI(
    title="Mbare Marketplace Vehicle API",
    version="1.0.0"
)

app.include_router(search_router)


@app.get("/")
def home():
    return {
        "application": "Mbare Marketplace Vehicle API",
        "status": "Running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
