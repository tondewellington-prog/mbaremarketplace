from urllib.parse import quote_plus

from playwright.sync_api import sync_playwright
from config import Config


class VehicleScraper:
    def __init__(self):
        self.base_url = Config.BASE_URL
        self.headless = Config.HEADLESS
        self.browser = None
        self.page = None
        self.playwright = None

    def start(self):
        self.playwright = sync_playwright().start()

        self.browser = self.playwright.chromium.launch(
            headless=self.headless
        )

        self.page = self.browser.new_page(
            user_agent=Config.USER_AGENT
        )

        self.page.set_default_timeout(
            Config.REQUEST_TIMEOUT * 1000
        )

    def stop(self):
        if self.browser:
            self.browser.close()

        if self.playwright:
            self.playwright.stop()

    def search(self, keyword: str):
        """
        Searches Be Forward and returns a list of vehicle URLs.
        """

        search_url = (
            f"{self.base_url}/stocklist/"
            f"?keyword={quote_plus(keyword)}"
        )

        self.page.goto(
            search_url,
            wait_until="networkidle"
        )

        return self.collect_vehicle_links()

    def collect_vehicle_links(self):
        """
        Collects all vehicle links from the search results page.
        """

        links = []

        anchors = self.page.locator("a").all()

        for anchor in anchors:
            href = anchor.get_attribute("href")

            if not href:
                continue

            if "/car/" not in href:
                continue

            if href.startswith("/"):
                href = self.base_url + href

            if href not in links:
                links.append(href)

        return links[:Config.MAX_RESULTS_PER_SEARCH]
