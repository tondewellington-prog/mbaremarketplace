from scraper import VehicleScraper
from database import db


class ScrapeService:

    def __init__(self):

        self.scraper = VehicleScraper()

    def search(self, keyword: str):

        try:

            self.scraper.start()

            vehicles = self.scraper.scrape_search_results(keyword)

            saved = 0

            for vehicle in vehicles:

                db.save_vehicle(vehicle)

                saved += 1

            return {
                "success": True,
                "keyword": keyword,
                "count": len(vehicles),
                "saved": saved,
                "vehicles": vehicles
            }

        except Exception as e:

            return {
                "success": False,
                "error": str(e)
            }

        finally:

            self.scraper.stop()
