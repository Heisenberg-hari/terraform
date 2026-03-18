import hashlib


def analyze_sentiment(content: str) -> tuple[str, str, float]:
    lowered = content.lower()
    positive_words = ('love', 'great', 'happy', 'excellent', 'thanks')
    negative_words = ('hate', 'angry', 'bad', 'awful', 'upset')

    if any(token in lowered for token in positive_words):
        return 'POSITIVE', 'MEADOW', 22.0
    if any(token in lowered for token in negative_words):
        return 'NEGATIVE', 'VOLCANO', 75.0
    return 'NEUTRAL', 'RIDGE', 35.0


def compute_coordinates(content: str) -> tuple[float, float]:
    digest = hashlib.sha256(content.encode('utf-8')).hexdigest()
    lat_seed = int(digest[:8], 16)
    lon_seed = int(digest[8:16], 16)
    latitude = (lat_seed / 0xFFFFFFFF) * 180.0 - 90.0
    longitude = (lon_seed / 0xFFFFFFFF) * 360.0 - 180.0
    return round(latitude, 6), round(longitude, 6)
