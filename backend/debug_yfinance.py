import yfinance as yf

def test_batch():
    tickers = ["AADI.JK", "AALI.JK", "ABBA.JK", "BBCA.JK"]
    tickers_str = " ".join(tickers)
    print(f"Fetching: {tickers_str}")
    
    try:
        data = yf.Tickers(tickers_str)
        
        for t in tickers:
            print(f"\nChecking {t}...")
            if hasattr(data.tickers, t):
                ticker_obj = data.tickers[t]
                info = ticker_obj.info
                # print(info) # Verify keys
                price = info.get('currentPrice') or info.get('regularMarketPrice') or info.get('previousClose')
                print(f"Price for {t}: {price}")
            else:
                print(f"{t} not found in data.tickers")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_batch()
