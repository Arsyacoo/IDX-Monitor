import os
import re
import json

POSITIVE_WORDS = {
    'naik', 'tumbuh', 'untung', 'laba', 'akuisisi', 'ekspansi', 'rebound', 'menguat',
    'buy', 'net buy', 'melonjak', 'melesat', 'kinerja', 'dividen', 'akumulasi',
    'positif', 'optimis', 'bullish', 'cerah', 'kinclong', 'meningkat', 'melejit',
    'untung besar', 'rekomendasi beli'
}

NEGATIVE_WORDS = {
    'turun', 'rugi', 'defisit', 'melemah', 'sell', 'net sell', 'anjlok', 'merosot',
    'tumbang', 'suspensi', 'pangkas', 'divestasi', 'pesimis', 'bearish', 'denda',
    'negatif', 'lesu', 'jatuh', 'terkoreksi', 'koreksi', 'ambles', 'ambruk', 'drop',
    'penurunan'
}

STOCKS_DB = []
try:
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    json_path = os.path.join(current_dir, "idx_tickers.json")
    with open(json_path, "r", encoding="utf-8") as f:
        STOCKS_DB = json.load(f)
except Exception:
    STOCKS_DB = [
        {"ticker": "BBCA", "name": "Bank Central Asia"},
        {"ticker": "BBRI", "name": "Bank Rakyat Indonesia"},
        {"ticker": "BMRI", "name": "Bank Mandiri"},
        {"ticker": "BBNI", "name": "Bank Negara Indonesia"},
        {"ticker": "TLKM", "name": "Telkom Indonesia"},
        {"ticker": "ASII", "name": "Astra International"},
        {"ticker": "ADRO", "name": "Adaro Energy"},
        {"ticker": "GOTO", "name": "GoTo Gojek Tokopedia"},
    ]

def analyze_sentiment(title: str) -> dict:
    """Analyze Indonesian financial news sentiment using lexicon matching and match ticker."""
    text = title.lower()
    
    pos_count = 0
    for word in POSITIVE_WORDS:
        if re.search(r'\b' + re.escape(word) + r'\b', text):
            pos_count += 1
            
    neg_count = 0
    for word in NEGATIVE_WORDS:
        if re.search(r'\b' + re.escape(word) + r'\b', text):
            neg_count += 1
            
    total = pos_count + neg_count
    if total == 0:
        score = 0.0
        label = "NEUTRAL"
    else:
        score = (pos_count - neg_count) / total
        if score > 0.15:
            label = "POSITIVE"
        elif score < -0.15:
            label = "NEGATIVE"
        else:
            label = "NEUTRAL"
            
    # Ticker matching
    associated_ticker = ""
    
    # 1. Match direct ticker code (e.g. BBCA, TLKM)
    for stock in STOCKS_DB:
        ticker = stock["ticker"]
        if re.search(r'\b' + re.escape(ticker) + r'\b', title.upper()):
            associated_ticker = ticker
            break
            
    # 2. Match by company name
    if not associated_ticker:
        for stock in STOCKS_DB:
            name = stock["name"].lower()
            name_clean = re.sub(r'\b(pt|tbk|persero|tbi)\b', '', name).strip()
            name_clean = re.sub(r'\s+', ' ', name_clean)
            if len(name_clean) > 4 and name_clean in text:
                associated_ticker = stock["ticker"]
                break
                
    return {
        "score": round(score, 3),
        "label": label,
        "ticker": associated_ticker
    }
