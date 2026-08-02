from datetime import datetime

from supabase import create_client

from config import Config


class Database:

    def __init__(self):

        self.client = create_client(
            Config.SUPABASE_URL,
            Config.SUPABASE_KEY
        )

    def save_vehicle(self, vehicle):

        if not vehicle.get("stock_no"):
            return None

        vehicle["updated_at"] = datetime.utcnow().isoformat()

        existing = self.client.table("vehicles")\
            .select("id")\
            .eq("stock_no", vehicle["stock_no"])\
            .execute()

        if existing.data:

            vehicle_id = existing.data[0]["id"]

            self.client.table("vehicles")\
                .update(vehicle)\
                .eq("id", vehicle_id)\
                .execute()

            return vehicle_id

        else:

            vehicle["scraped_at"] = datetime.utcnow().isoformat()

            result = self.client.table("vehicles")\
                .insert(vehicle)\
                .execute()

            if result.data:
                return result.data[0]["id"]

            return None

    def get_vehicles(self, limit=20):

        result = self.client.table("vehicles")\
            .select("*")\
            .order("scraped_at", desc=True)\
            .limit(limit)\
            .execute()

        return result.data

    def search_vehicles(self, keyword, limit=20):

        result = self.client.table("vehicles")\
            .select("*")\
            .or_(
                f"title.ilike.%{keyword}%,"
                f"make.ilike.%{keyword}%,"
                f"model.ilike.%{keyword}%"
            )\
            .limit(limit)\
            .execute()

        return result.data


db = Database()
