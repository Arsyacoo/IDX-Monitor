SECTOR_OVERRIDES = {
    # Financials
    "BBCA": "Financials",
    "BBRI": "Financials",
    "BMRI": "Financials",
    "BBNI": "Financials",
    "BBTN": "Financials",
    "BRIS": "Financials",
    "BDMN": "Financials",
    "BNGA": "Financials",
    "NISP": "Financials",
    "ARTO": "Financials",
    "MEGA": "Financials",
    "PNBN": "Financials",

    # Energy
    "ADRO": "Energy",
    "AADI": "Energy",
    "ADMR": "Energy",
    "PTBA": "Energy",
    "ITMG": "Energy",
    "BYAN": "Energy",
    "BUMI": "Energy",
    "MEDC": "Energy",
    "PGAS": "Energy",
    "AKRA": "Energy",
    "ELSA": "Energy",

    # Consumer
    "AALI": "Consumer Non-Cyclicals",
    "AMRT": "Consumer Non-Cyclicals",
    "ICBP": "Consumer Non-Cyclicals",
    "INDF": "Consumer Non-Cyclicals",
    "MYOR": "Consumer Non-Cyclicals",
    "UNVR": "Consumer Non-Cyclicals",
    "HMSP": "Consumer Non-Cyclicals",
    "GGRM": "Consumer Non-Cyclicals",
    "MAPA": "Consumer Cyclicals",
    "MAPI": "Consumer Cyclicals",
    "ACES": "Consumer Cyclicals",

    # Healthcare
    "KLBF": "Healthcare",
    "SIDO": "Healthcare",
    "KAEF": "Healthcare",
    "INAF": "Healthcare",
    "MIKA": "Healthcare",
    "SILO": "Healthcare",
    "HEAL": "Healthcare",
    "PRDA": "Healthcare",

    # Technology & telco
    "TLKM": "Technology & Telecom",
    "ISAT": "Technology & Telecom",
    "EXCL": "Technology & Telecom",
    "FREN": "Technology & Telecom",
    "GOTO": "Technology",
    "BUKA": "Technology",
    "WIRG": "Technology",
    "DCII": "Technology",

    # Materials
    "ANTM": "Basic Materials",
    "INCO": "Basic Materials",
    "MDKA": "Basic Materials",
    "BRMS": "Basic Materials",
    "TINS": "Basic Materials",
    "SMGR": "Basic Materials",
    "INTP": "Basic Materials",
    "INKP": "Basic Materials",
    "TKIM": "Basic Materials",
    "BRPT": "Basic Materials",

    # Industrials & infrastructure
    "ASII": "Industrials",
    "UNTR": "Industrials",
    "JSMR": "Infrastructure",
    "WIKA": "Infrastructure",
    "WSKT": "Infrastructure",
    "PTPP": "Infrastructure",
    "ADHI": "Infrastructure",
    "TBIG": "Infrastructure",
    "TOWR": "Infrastructure",
    "MTEL": "Infrastructure",

    # Property
    "BSDE": "Properties & Real Estate",
    "CTRA": "Properties & Real Estate",
    "PWON": "Properties & Real Estate",
    "SMRA": "Properties & Real Estate",
    "LPKR": "Properties & Real Estate",
    "APLN": "Properties & Real Estate",
}

SECTOR_RULES = [
    ("Financials", ["bank", "asuransi", "insurance", "finance", "sekuritas", "multifinance", "modal ventura"]),
    ("Energy", ["adaro", "bayan", "bukit asam", "coal", "batubara", "energi", "energy", "minyak", "gas", "petroleum"]),
    ("Consumer Non-Cyclicals", ["food", "indofood", "mayora", "unilever", "sido", "consumer", "mart", "supermarket", "agro", "perkebunan"]),
    ("Consumer Cyclicals", ["retail", "ritel", "map", "automotive", "otomotif", "hotel", "tourism", "pariwisata"]),
    ("Healthcare", ["health", "sehat", "siloam", "medikal", "medical", "farmasi", "pharma", "kimia farma", "kalbe", "hospital"]),
    ("Technology & Telecom", ["technology", "teknologi", "digital", "data", "telekomunikasi", "telkom", "internet", "software"]),
    ("Media & Entertainment", ["media", "mahaka", "broadcast", "entertainment", "film"]),
    ("Basic Materials", ["steel", "baja", "semen", "cement", "kimia", "chemical", "mineral", "metal", "emas", "gold", "tambang"]),
    ("Industrials", ["astra", "alat berat", "heavy equipment", "logistik", "logistic", "transportasi", "shipping", "mesin"]),
    ("Infrastructure", ["konstruksi", "construction", "tower", "jalan tol", "toll", "infrastructure", "infrastruktur", "utility", "listrik", "power"]),
    ("Properties & Real Estate", ["property", "properti", "realty", "estate", "land", "kawasan industri", "ciputra", "summarecon"]),
]


def classify_sector(stock):
    ticker = str(stock.get("ticker", "")).upper()
    if ticker in SECTOR_OVERRIDES:
        return SECTOR_OVERRIDES[ticker], "mapping"

    haystack = f"{ticker} {stock.get('name', '')}".lower()
    for sector, keywords in SECTOR_RULES:
        if any(keyword in haystack for keyword in keywords):
            return sector, "inferred"

    return "Other", "unknown"
