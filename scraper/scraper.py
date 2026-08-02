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
