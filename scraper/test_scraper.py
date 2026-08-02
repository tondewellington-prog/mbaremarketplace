from scraper import VehicleScraper


def main():

    keyword = "Toyota Hilux"

    scraper = VehicleScraper()

    try:

        print("=" * 70)
        print("Starting Scraper")
        print("=" * 70)

        scraper.start()

        print(f"Searching for: {keyword}")

        links = scraper.search(keyword)

        print(f"Vehicle Links Found: {len(links)}")

        print("\nCurrent URL:")
        print(scraper.page.url)

        print("\nFirst 5000 characters of HTML:\n")

        html = scraper.page.content()

        print(html[:5000])

    finally:

        scraper.stop()


if __name__ == "__main__":
    main()
