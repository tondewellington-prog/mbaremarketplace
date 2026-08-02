from scraper import VehicleScraper


def main():

    scraper = VehicleScraper()

    scraper.start()

    try:

        keyword = "Toyota Hilux"

        print(f"\nSearching for: {keyword}\n")

        vehicles = scraper.scrape_search_results(keyword)

        print(f"Vehicles Found: {len(vehicles)}\n")

        for index, vehicle in enumerate(vehicles, start=1):

            print("=" * 60)
            print(f"Vehicle {index}")
            print("=" * 60)

            for key, value in vehicle.items():
                print(f"{key}: {value}")

            print()

    finally:

        scraper.stop()


if __name__ == "__main__":
    main()
