from scraper import VehicleScraper


class ScrapeService:
    def __init__(self):
        self.scraper = VehicleScraper()

    def search(self, keyword: str):
        try:
            self.scraper.start()

            results = self.scraper.search(keyword)

            return {
                "success": True,
                "keyword": keyword,
                "count": len(results),
                "vehicles": results
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

        finally:
            self.scraper.stop()
