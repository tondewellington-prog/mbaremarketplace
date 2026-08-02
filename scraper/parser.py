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
            "mileage": self.get_mileage(),
            "fuel": self.get_fuel(),
            "transmission": self.get_transmission(),
            "engine": self.get_engine(),
            "color": self.get_color(),
            "image": self.get_image(),
            "vehicle_url": ""
        }

        return vehicle

    def get_stock_number(self):
        return ""

    def get_title(self):
        return ""

    def get_make(self):
        return ""

    def get_model(self):
        return ""

    def get_year(self):
        return ""

    def get_price(self):
        return ""

    def get_currency(self):
        return "USD"

    def get_mileage(self):
        return ""

    def get_fuel(self):
        return ""

    def get_transmission(self):
        return ""

    def get_engine(self):
        return ""

    def get_color(self):
        return ""

    def get_image(self):
        return ""
