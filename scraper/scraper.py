from urllib.parse import quote_plus

from playwright.sync_api import sync_playwright

from config import Config
from parser import VehicleParser


class VehicleScraper:

    def __init__(self):
        self.base_url = Config.BASE_URL
        self.headless = Config.HEADLESS

        self.playwright = None
        self.browser = None
        self.page = None

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

        search_url = (
            f"{self.base_url}/stocklist/?keyword={quote_plus(keyword)}"
        )

        print(f"Searching URL: {search_url}")

        self.page.goto(
            search_url,
            wait_until="networkidle"
        )

        print(f"Opened URL: {self.page.url}")

        html = self.page.content()

        with open("search_results.html", "w", encoding="utf-8") as file:
            file.write(html)

        print("Saved search_results.html")

        links = self.collect_vehicle_links()

        print(f"Collected {len(links)} vehicle links")

        return links

    def collect_vehicle_links(self):

        links = []

        anchors = self.page.locator("a").all()

        print(f"Found {len(anchors)} anchor tags")

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

    def scrape_vehicle(self, url: str):

        print(f"Scraping vehicle: {url}")

        self.page.goto(
            url,
            wait_until="networkidle"
        )

        html = self.page.content()

        parser = VehicleParser(html)

        vehicle = parser.parse()

        vehicle["vehicle_url"] = url

        return vehicle

    def scrape_search_results(self, keyword: str):

        links = self.search(keyword)

        vehicles = []

        for link in links:

            try:

                vehicle = self.scrape_vehicle(link)

                vehicles.append(vehicle)

            except Exception as error:

                print(f"Failed to scrape: {link}")
                print(error)

        return vehicles

    def close(self):
        self.stop()
