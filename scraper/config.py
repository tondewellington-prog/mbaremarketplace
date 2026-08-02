import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Supabase
    SUPABASE_URL = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

    # Scraper Settings
    HEADLESS = os.getenv("HEADLESS", "True").lower() == "true"
    REQUEST_TIMEOUT = int(os.getenv("REQUEST_TIMEOUT", "60"))
    MAX_RESULTS_PER_SEARCH = int(os.getenv("MAX_RESULTS_PER_SEARCH", "50"))

    # Be Forward
    BASE_URL = "https://www.beforward.jp"

    # Browser
    USER_AGENT = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/138.0.0.0 Safari/537.36"
    )
