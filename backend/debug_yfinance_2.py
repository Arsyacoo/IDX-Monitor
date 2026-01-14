import yfinance as yf

def test_batch():
    tickers_list = ["BBCA.JK", "GOTO.JK"]
    tickers_str = " ".join(tickers_list)
    print(f"Fetching: {tickers_str}")
    
    data = yf.Tickers(tickers_str)
    
    print(f"Type of data.tickers: {type(data.tickers)}")
    try:
        print(f"Keys in data.tickers: {data.tickers.keys()}")
    except:
        print("Could not print keys")

    for t in tickers_list:
        print(f"\n--- Accessing {t} ---")
        try:
            # Try dict access
            ticker = data.tickers[t]
            print("Dict access successful")
            price = ticker.info.get('currentPrice')
            print(f"Price: {price}")
        except Exception as e:
            print(f"Dict access failed: {e}")

if __name__ == "__main__":
    test_batch()
