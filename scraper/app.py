from fastapi import FastAPI

app = FastAPI(
    title="Mbare Marketplace Vehicle Scraper",
    description="Vehicle Scraper API for Mbare Marketplace",
    version="1.0.0"
)


@app.get("/")
def home():
    return {
        "application": "Mbare Marketplace Vehicle Scraper",
        "status": "Running",
        "version": "1.0.0"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
