def round_optional(value, digits=2):
    if value is None:
        return None
    return round(value, digits)


def calculate_sma(values, window):
    if not values:
        return None
    sample = values[-window:]
    return sum(sample) / len(sample)


def calculate_rsi(values, window=14):
    if len(values) <= window:
        return None

    gains = []
    losses = []
    for index in range(1, len(values)):
        delta = values[index] - values[index - 1]
        gains.append(max(delta, 0))
        losses.append(abs(min(delta, 0)))

    recent_gains = gains[-window:]
    recent_losses = losses[-window:]
    average_gain = sum(recent_gains) / window
    average_loss = sum(recent_losses) / window

    if average_loss == 0:
        return 100.0

    relative_strength = average_gain / average_loss
    return 100 - (100 / (1 + relative_strength))


def classify_trend(last_price, ma20, ma50, history_length):
    if history_length < 20 or ma20 is None:
        return "Insufficient Data"
    if history_length >= 50 and ma50 is not None:
        if last_price >= ma20 >= ma50:
            return "Bullish"
        if last_price <= ma20 <= ma50:
            return "Bearish"
        return "Sideways"
    if last_price >= ma20:
        return "Bullish"
    return "Bearish"


def build_enriched_history(history_points):
    enriched_history = []
    prices = []

    for point in history_points:
        price = float(point.get("price") or 0)
        prices.append(price)
        enriched_history.append({
            **point,
            "ma20": round_optional(calculate_sma(prices, 20)),
            "ma50": round_optional(calculate_sma(prices, 50)),
        })

    return enriched_history


def calculate_technical_indicators(history_points, last_price=None):
    prices = [float(point.get("price") or 0) for point in history_points if point.get("price") is not None]
    if not prices:
        return {
            "ma20": None,
            "ma50": None,
            "rsi14": None,
            "trend_label": "Insufficient Data",
            "period_points": 0,
        }

    resolved_last_price = float(last_price or prices[-1])
    ma20 = calculate_sma(prices, 20)
    ma50 = calculate_sma(prices, 50)
    rsi14 = calculate_rsi(prices, 14)

    return {
        "ma20": round_optional(ma20),
        "ma50": round_optional(ma50),
        "rsi14": round_optional(rsi14),
        "trend_label": classify_trend(resolved_last_price, ma20, ma50, len(prices)),
        "period_points": len(prices),
    }
