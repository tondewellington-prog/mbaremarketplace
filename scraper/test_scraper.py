from scraper import VehicleScraper
from pprint import pprint


def main():
    keyword = input("Enter vehicle to search: ").strip()

    if not keyword:
        print("Please enter a search keyword.")
        return

    scraper = VehicleScraper()

    try:
        print("\nStarting scraper...")
        scraper.start()

        print(f"Searching for '{keyword}'...\n")

        vehicles = scraper.scrape_search_results(keyword)

        print(f"\nFound {len(vehicles)} vehicles.\n")

        for index, vehicle in enumerate(vehicles, start=1):

            print("=" * 80)
            print(f"Vehicle {index}")
            print("=" * 80)

            pprint(vehicle)

            print()

    except Exception as e:
        print(f"\nERROR: {e}")

    finally:
        scraper.stop()
        print("\nBrowser closed.")


if __name__ == "__main__":
    main()
