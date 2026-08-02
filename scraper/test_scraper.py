from scraper import VehicleScraper
from pprint import pprint
import os


def main():

    keyword = os.getenv("SEARCH_KEYWORD", "Toyota Hilux")

    scraper = VehicleScraper()

    try:

        print("=" * 70)
        print("Mbare Marketplace Vehicle Scraper")
        print("=" * 70)

        print(f"Searching for: {keyword}")
        print()

        scraper.start()

        vehicles = scraper.scrape_search_results(keyword)

        print("=" * 70)
        print(f"Vehicles Found: {len(vehicles)}")
        print("=" * 70)

        for index, vehicle in enumerate(vehicles, start=1):

            print()
            print("=" * 70)
            print(f"Vehicle {index}")
            print("=" * 70)

            pprint(vehicle)

    except Exception as error:

        print()
        print("=" * 70)
        print("SCRAPER ERROR")
        print("=" * 70)
        print(str(error))

        raise

    finally:

        scraper.stop()

        print()
        print("=" * 70)
        print("Scraper Finished")
        print("=" * 70)


if __name__ == "__main__":
    main()
