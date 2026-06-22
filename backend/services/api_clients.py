import os
import httpx
from cachetools import cached, TTLCache
from dotenv import load_dotenv

load_dotenv()

TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")
OPENWEATHER_API_KEY = os.getenv("OpenWeather_API_KEY")

# Base city coordinates for center points
CITY_CENTERS = {
    "Mumbai": {"lat": 19.0760, "lon": 72.8777},
    "Pune": {"lat": 18.5204, "lon": 73.8567},
    "Delhi": {"lat": 28.7041, "lon": 77.1025},
    "Bengaluru": {"lat": 12.9716, "lon": 77.5946},
    "Hyderabad": {"lat": 17.3850, "lon": 78.4867},
    "Chennai": {"lat": 13.0827, "lon": 80.2707},
    "Ahmedabad": {"lat": 23.0225, "lon": 72.5714},
    "Kolkata": {"lat": 22.5726, "lon": 88.3639},
}

# Instead of hardcoding all corridors for all cities, we'll generate dynamic offsets
# based on the city's center to simulate a real city layout for TomTom and OpenWeather.
def get_corridor_coords(city: str, c_id: str):
    base = CITY_CENTERS.get(city, CITY_CENTERS["Mumbai"])
    # stable pseudo-random offset based on corridor id
    offset_lat = (hash(c_id + "lat") % 100) / 1000.0 - 0.05
    offset_lon = (hash(c_id + "lon") % 100) / 1000.0 - 0.05
    return {"lat": base["lat"] + offset_lat, "lon": base["lon"] + offset_lon}

def get_sector_coords(city: str, s_id: str):
    base = CITY_CENTERS.get(city, CITY_CENTERS["Mumbai"])
    offset_lat = (hash(s_id + "lat") % 100) / 800.0 - 0.06
    offset_lon = (hash(s_id + "lon") % 100) / 800.0 - 0.06
    return {"lat": base["lat"] + offset_lat, "lon": base["lon"] + offset_lon}

# Cache for 15 minutes (900 seconds)
@cached(cache=TTLCache(maxsize=100, ttl=900))
def get_tomtom_flow(lat: float, lon: float) -> dict:
    if not TOMTOM_API_KEY:
        print("Warning: TOMTOM_API_KEY not configured")
        return {}
    url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?key={TOMTOM_API_KEY}&point={lat},{lon}"
    try:
        response = httpx.get(url, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"TomTom API error: {e}")
        return {}

@cached(cache=TTLCache(maxsize=100, ttl=900))
def get_openweather_pollution(lat: float, lon: float) -> dict:
    if not OPENWEATHER_API_KEY:
        print("Warning: OpenWeather_API_KEY not configured")
        return {}
    url = f"http://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}"
    try:
        response = httpx.get(url, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"OpenWeather Pollution API error: {e}")
        return {}

@cached(cache=TTLCache(maxsize=100, ttl=900))
def get_openweather_weather(lat: float, lon: float) -> dict:
    if not OPENWEATHER_API_KEY:
        print("Warning: OpenWeather_API_KEY not configured")
        return {}
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
    try:
        response = httpx.get(url, timeout=10.0)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"OpenWeather Weather API error: {e}")
        return {}
