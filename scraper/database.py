from datetime import datetime
from supabase import create_client

from config import Config


class Database:

    def __init__(self):
        self.supabase = create_client(
            Config.SUPABASE_URL,
            Config.SUPABASE_KEY
        )

    def save_vehicle(self, vehicle):

        stock_no = vehicle.get("stock_no")

        if not stock_no:
            return False

        existing = (
            self.supabase
            .table("vehicles")
            .select("id")
            .eq("stock_no", stock_no)
            .execute()
        )

        data = {
            "stock_no": vehicle.get("stock_no"),
            "title": vehicle.get("title"),
            "make": vehicle.get("make"),
            "model": vehicle.get("model"),
            "year": vehicle.get("year"),
            "price": vehicle.get("price"),
            "currency": vehicle.get("currency"),
            "mileage": vehicle.get("mileage"),
            "fuel": vehicle.get("fuel"),
            "transmission": vehicle.get("transmission"),
            "engine_size": vehicle.get("engine_size"),
            "drive": vehicle.get("drive"),
            "doors": vehicle.get("doors"),
            "seats": vehicle.get("seats"),
            "color": vehicle.get("color"),
            "steering": vehicle.get("steering"),
            "location": vehicle.get("location"),
            "chassis_no": vehicle.get("chassis_no"),
            "model_code": vehicle.get("model_code"),
            "image": vehicle.get("image"),
            "images": vehicle.get("images"),
            "vehicle_url": vehicle.get("vehicle_url"),
            "source": "BE FORWARD",
            "updated_at": datetime.utcnow().isoformat(),
            "last_scraped": datetime.utcnow().isoformat()
        }

        if existing.data:

            self.supabase.table("vehicles").update(data).eq(
                "stock_no",
                stock_no
            ).execute()

            return "updated"

        else:

            data["created_at"] = datetime.utcnow().isoformat()

            self.supabase.table("vehicles").insert(
                data
            ).execute()

            return "inserted"

    def get_vehicles(self, keyword):

        return (
            self.supabase
            .table("vehicles")
            .select("*")
            .or_(
                f"title.ilike.%{keyword}%,"
                f"make.ilike.%{keyword}%,"
                f"model.ilike.%{keyword}%"
            )
            .execute()
        )


database = Database()
