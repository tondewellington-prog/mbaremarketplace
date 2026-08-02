import json
from bs4 import BeautifulSoup


class VehicleParser:

    def __init__(self, html):
        self.soup = BeautifulSoup(html, "lxml")

    def parse(self):

        vehicle = {
            "stock_no": self.get_stock_number(),
            "title": self.get_title(),
            "make": self.get_make(),
            "model": self.get_model(),
            "year": self.get_year(),
            "price": self.get_price(),
            "currency": self.get_currency(),
            "mileage": self.get_spec("Mileage"),
            "fuel": self.get_spec("Fuel"),
            "transmission": self.get_spec("Transmission"),
            "engine_size": self.get_spec("Engine Size"),
            "drive": self.get_spec("Drive"),
            "doors": self.get_spec("Doors"),
            "seats": self.get_spec("Seats"),
            "color": self.get_spec("Color"),
            "steering": self.get_spec("Steering"),
            "location": self.get_spec("Location"),
            "chassis_no": self.get_spec("Chassis No."),
            "model_code": self.get_spec("Model Code"),
            "image": self.get_main_image(),
            "images": self.get_images(),
            "vehicle_url": ""
        }

        return vehicle

    def get_json_ld(self):

        scripts = self.soup.find_all(
            "script",
            type="application/ld+json"
        )

        for script in scripts:

            try:
                data = json.loads(script.string)

                if isinstance(data, dict):
                    return data

            except Exception:
                pass

        return {}

    def get_title(self):

        data = self.get_json_ld()

        return data.get("name", "")

    def get_price(self):

        data = self.get_json_ld()

        offers = data.get("offers", {})

        return offers.get("price", "")

    def get_currency(self):

        data = self.get_json_ld()

        offers = data.get("offers", {})

        return offers.get("priceCurrency", "USD")

    def get_main_image(self):

        data = self.get_json_ld()

        image = data.get("image", [])

        if isinstance(image, list):

            if len(image):

                return image[0]

        if isinstance(image, str):

            return image

        return ""

    def get_images(self):

        data = self.get_json_ld()

        image = data.get("image", [])

        if isinstance(image, list):
            return image

        if isinstance(image, str):
            return [image]

        return []

    def get_stock_number(self):

        stock = self.soup.find(
            "input",
            {"name": "veh_stock_no"}
        )

        if stock:
            return stock.get("value", "")

        return ""

    def get_spec(self, label):

        rows = self.soup.find_all("tr")

        for row in rows:

            th = row.find("th")

            td = row.find("td")

            if not th or not td:
                continue

            heading = th.get_text(strip=True)

            if heading == label:

                return td.get_text(
                    " ",
                    strip=True
                )

        return ""

    def get_make(self):

        return self.get_title().split()[0] if self.get_title() else ""

    def get_model(self):

        title = self.get_title()

        if not title:

            return ""

        parts = title.split()

        if len(parts) >= 2:

            return " ".join(parts[1:-1])

        return ""

    def get_year(self):

        title = self.get_title()

        if not title:

            return ""

        for part in reversed(title.split()):

            if part.isdigit():

                return part

        return ""
        
