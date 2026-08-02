from fastapi import APIRouter
from services.scrape_service import ScrapeService
from database import database

router = APIRouter(
    prefix="/search",
    tags=["Search"]
)

scrape_service = ScrapeService()


@router.get("/")
def search(keyword: str):

    keyword = keyword.strip()

    if not keyword:
        return {
            "success": False,
            "message": "Search keyword is required."
        }

    # Check local database first
    cached = database.get_vehicles(keyword)

    if cached.data and len(cached.data) > 0:

        return {
            "success": True,
            "source": "database",
            "count": len(cached.data),
            "vehicles": cached.data
        }

    # Nothing found, scrape BE FORWARD
    result = scrape_service.search(keyword)

    result["source"] = "beforward"

    return result
