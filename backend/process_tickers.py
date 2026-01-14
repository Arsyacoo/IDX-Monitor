import json

def process_tickers():
    try:
        with open("backend/idx_tickers_raw.json", "r", encoding="utf-8") as f:
            raw_data = json.load(f)
            
        simple_tickers = []
        for key, value in raw_data.items():
            # The structure seems to be key -> Profiles -> [0] -> NamaEmiten
            # Or sometimes directly under 'Search' or 'Profiles'
            # Let's inspect the structure from previous turn:
            # "AADI": { "Profiles": [ { "KodeEmiten": "AADI", "NamaEmiten": "..." } ] }
            
            try:
                profile = value.get("Profiles", [{}])[0]
                ticker = profile.get("KodeEmiten")
                name = profile.get("NamaEmiten")
                
                if ticker and name:
                    simple_tickers.append({
                        "ticker": ticker,
                        "name": name
                    })
            except Exception as e:
                print(f"Skipping {key}: {e}")
                continue
                
        # Sort by ticker
        simple_tickers.sort(key=lambda x: x["ticker"])
        
        with open("backend/idx_tickers.json", "w", encoding="utf-8") as f:
            json.dump(simple_tickers, f, indent=2)
            
        print(f"Successfully processed {len(simple_tickers)} tickers.")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    process_tickers()
