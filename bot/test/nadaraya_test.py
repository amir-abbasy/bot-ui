import ccxt
import time
from datetime import datetime
import json
import math

# Initialize your exchange
exchange = ccxt.binance({
    # 'apiKey': 'your_api_key',
    # 'secret': 'your_api_secret',
    'enableRateLimit': True,
    'options': {
        # 'defaultType': 'future'  # Use 'spot' for spot trading, 'future' for Futures
    }
})

# Load the JSON file
# with open('2024-03-11.json', 'r') as file:
#     ohlcv_data = json.load(file)


symbol = 'BTC/USDT'
timeframe = '1m'
amount_usdt = 10  # Amount in USDT to spend
minRange = 499 


def fetch_candles(symbol, timeframe):
    return exchange.fetch_ohlcv(symbol, timeframe, limit=minRange)

def timestamp_to_HHMM(timestamp_ms):
    # Convert milliseconds to seconds
    timestamp_s = timestamp_ms / 1000
    
    # Convert the timestamp to a datetime object
    dt_object = datetime.fromtimestamp(timestamp_s)
    
    # Format the datetime object to HH:MM
    formatted_time = dt_object.strftime('%H:%M')
    
    return formatted_time


def check_trade_signals():
    candles = fetch_candles(symbol, timeframe)
    # candles = ohlcv_data
    opens = [candle[1] for candle in candles]
    highs = [candle[2] for candle in candles]
    lows = [candle[3] for candle in candles]
    closes = [candle[4] for candle in candles]
    top = [True]
    bottom = [True]
    side = None
    positions = []
    isOrderPlaced = False



        # Input parameters
    h = 8.0
    mult = 3.0
    upCss = "green"  # Color for up condition
    dnCss = "red"   # Color for down condition
    # src = closes
    src = opens
    n = len(src)
    

    # Functions
    def gauss(x, h):
        return math.exp(-(math.pow(x, 2) / (h * h * 2)))

    # Initialize variables
    nwe = []
    mae_history = []


    sae = 0.0

    # Compute and set NWE point
    for i in range(min(minRange, n - 1) + 1):
        sum = 0.0
        sumw = 0.0

        # Compute weighted mean
        for j in range(min(minRange, n - 1) + 1):
            w = gauss(i - j, h)
            sum += src[j] * w
            sumw += w

        y2 = sum / sumw
        sae += abs(src[i] - y2)
        nwe.append(y2)

    sae = sae / min(minRange, n - 1) * mult
    


    # Loop to print lines instead of drawing
    for i in range(min(minRange, n - 1) + 1):

        diff = (nwe[i] + sae) - (nwe[i] - sae)
        ch = diff + (diff * (10 / 100)) # value + (value * (percentage / 100))
        time = timestamp_to_HHMM(candles[i][0])

        if isOrderPlaced and closes[i-1] < nwe[i] - sae: 
            isOrderPlaced = False
            # print(time, 'EXIT', closes[i-1], closes[i-1]+ch)
            
        if isOrderPlaced and closes[i-1] > nwe[i] + sae: 
            isOrderPlaced = False
            # print(timestamp_to_HHMM(candles[i][0]), 'EXIT', closes[i-1])



        # if i > 463:
        #     print(i, (nwe[i] - sae), ch, (nwe[i] - sae)-ch, ' < open', src[i], src[i] < (nwe[i] - sae)-ch)
        
        top_sl = (nwe[i] + sae)+ch
        bot_sl = (nwe[i] - sae)-ch
        if src[i] < bot_sl and side == 'LONG':
            # print(time, side, '============EXIT SL===============')
            pass


            




        # print(timestamp_to_HHMM(candles[i][0]), src[i])
        # if i % 2 == 0:
        #     print(f"Line: {n-i+1} -> {n-i}, y1 + sae: {nwe[i] + sae}, color: {upCss}")
        #     print(f"Line: {n-i+1} -> {n-i}, y1 - sae: {nwe[i] - sae}, color: {dnCss}")

        # Check conditions and print labels
        if src[i] > nwe[i] + sae and i + 1 < n and src[i+1] < nwe[i] + sae:
            print(f"{i} ▼ at {timestamp_to_HHMM(candles[i][0])} (close: {src[i]}) {i}")
            if n-1 == i: side = 'SHORT'
            isOrderPlaced = True
            side = 'SHORT'
            
        if src[i] < nwe[i] - sae and i + 1 < n and src[i+1] > nwe[i] - sae:
            print(f"{i} ▲ at {timestamp_to_HHMM(candles[i][0])} (close: {src[i]}) {i}")
            if n-1 == i: side = 'LONG'
            isOrderPlaced = True
            side = 'LONG'
            


        

    

    return side, candles[-1]
# end of analyses


def run_bot():
    check_trade_signals()

  
if __name__ == "__main__":
    run_bot()
