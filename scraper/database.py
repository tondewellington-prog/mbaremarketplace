from supabase import create_client, Client
from config import Config


class Database:
    def __init__(self):
        self.client: Client = create_client(
            Config.SUPABASE_URL,
            Config.SUPABASE_KEY
        )

    def get_client(self) -> Client:
        return self.client


db = Database()
supabase = db.get_client()
