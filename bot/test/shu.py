import ccxt
import time
from datetime import datetime
import json

# Initialize your exchange
exchange = ccxt.binance({
    # 'apiKey': 'your_api_key',
    # 'secret': 'your_api_secret',
    'enableRateLimit': True,
    'options': {
        'defaultType': 'future'  # Use 'spot' for spot trading, 'future' for Futures
    }
})

# Load the JSON file
# with open('2024-03-11.json', 'r') as file:
#     ohlcv_data = json.load(file)


symbol = 'BTC/USDT'
timeframe = '1m'
amount_usdt = 10  # Amount in USDT to spend

per = 14


def fetch_candles(symbol, timeframe):
    return exchange.fetch_ohlcv(symbol, timeframe, limit=300)

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


    for index, cand in enumerate(candles):
        # print(f"Index: {index}, cand: {cand}")
        if index < per*2 : continue
        end = index == len(candles)-1
        open = opens[:index+1]
        high = highs[:index+1]
        low = lows[:index+1]
        close = closes[:index+1]
        time = timestamp_to_HHMM(cand[0])
       
        loc = low[-1] < min(low[-per+1:-1]) and low[-1] <= min(low[-per*2:-per])
        bottom.append(loc)
        last_true_index_bottom = len(bottom) - 1 - bottom[::-1].index(True)
        bottom_signal = len(bottom) - last_true_index_bottom - 1
        
        loc2 = high[-1] > max(high[-per+1:-1]) and high[-1] >= max(high[-per*2:-per])
        top.append(loc2)
        last_true_index_top = len(top) - 1 - top[::-1].index(True)
        top_signal = len(top) - last_true_index_top - 1

        # print(index, bottom_signal, top_signal)

        buy = bottom_signal > top_signal
        sell = bottom_signal < top_signal
        if buy and side != 'LONG': 
            # print(time, 'BUY')
            side = 'LONG'
        if sell and side != 'SHORT': 
            # print(time, 'SELL')
            side = 'SHORT'

        if end:
            pass

    return side
# end of analyses


def check_balance():
    # Fetch balance information
    balance = exchange.fetch_balance()
    
    # Fetch USDT balance in Futures account
    usdt_balance = balance['total'].get('USDT', 0)
    
    return usdt_balance

def long(symbol, amount_usdt):
    # Check balance
    usdt_balance = check_balance()
    
    if usdt_balance < amount_usdt:
        print(f"Insufficient balance. Available: {usdt_balance} USDT, Required: {amount_usdt} USDT")
        return None
    
    # Calculate the amount of BTC to buy based on the current price
    ticker = exchange.fetch_ticker(symbol)
    price = ticker['last']  # Last price of the symbol
    amount_btc = amount_usdt / price
    
    # Create a market buy order
    order = exchange.create_market_order(symbol, 'buy', amount_btc)
    
    return order

def short(symbol, amount_usdt):
    # Check balance
    usdt_balance = check_balance()
    
    if usdt_balance < amount_usdt:
        print(f"Insufficient balance. Available: {usdt_balance} USDT, Required: {amount_usdt} USDT")
        return None
    
    # Calculate the amount of BTC to short based on the current price
    ticker = exchange.fetch_ticker(symbol)
    price = ticker['last']  # Last price of the symbol
    amount_btc = amount_usdt / price
    
    # Create a market sell order to open a short position
    order = exchange.create_market_order(symbol, 'sell', amount_btc)
    
    return order

def close_position(symbol, amount_btc, side):
    # Create a market order to close the position
    # If side is 'buy', it will close a short position
    # If side is 'sell', it will close a long position
    order = exchange.create_market_order(symbol, side, amount_btc)
    
    return order



def run_bot():
    last_signal = None


    while True:
        print(datetime.now().strftime('%H:%M'))

        side = check_trade_signals()
        amount_btc = 0
        if last_signal != 'LONG' and side == 'LONG':
            last_signal = side

            # exit
            if last_signal: 
                print('Close the short position')
                close_order = close_position(symbol, amount_btc, 'buy')
                if close_order:
                    print("short closed successfully:", close_order)
                    time.sleep(2)


            # entry
            print('LONG')
            long_order = long(symbol, amount_usdt)
            if long_order:
                print("Long order created successfully:", long_order)
            # Calculate the amount of BTC to sell
            amount_btc = long_order['amount']  # Amount to close
            pass


        if last_signal != 'SHORT' and side == 'SHORT':
            last_signal = side

            # exit
            if last_signal: 
                print('Close the long position')
                close_order = close_position(symbol, amount_btc, 'sell')
                if close_order:
                    print("long closed successfully:", close_order)
                    time.sleep(2)

            # entry
            print('SHORT')
            short_order = short(symbol, amount_usdt)
            if short_order:
                print("Short order created successfully:", short_order)
            amount_btc = long_order['amount']  # Amount to close
            pass 
        
        time.sleep(60)  # Run every 15 minutes
    
  
if __name__ == "__main__":
    run_bot()
