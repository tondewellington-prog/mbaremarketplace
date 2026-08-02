from scraper import VehicleScraper
from database import database


class ScrapeService:

    def __init__(self):
        self.scraper = VehicleScraper()

    def search(self, keyword):

        self.scraper.start()

        vehicles = self.scraper.scrape_search_results(keyword)

        saved = 0

        for vehicle in vehicles:

            result = database.save_vehicle(vehicle)

            if result:
                saved += 1

        self.scraper.stop()

        return {
            "keyword": keyword,
            "count": len(vehicles),
            "saved": saved,
            "vehicles": vehicles
        }
