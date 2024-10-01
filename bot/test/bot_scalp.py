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



def timestamp_to_HHMM(timestamp_ms):
    # Convert milliseconds to seconds
    timestamp_s = timestamp_ms / 1000
    
    # Convert the timestamp to a datetime object
    dt_object = datetime.fromtimestamp(timestamp_s)
    
    # Format the datetime object to HH:MM
    formatted_time = dt_object.strftime('%H:%M')
    
    return formatted_time



class TradingBot:
    def __init__(self):
        self.candles = fetch_candles(symbol, timeframe)
        # candles = ohlcv_data
        # self.opens = [candle[1] for candle in self.candles]
        # self.highs = [candle[2] for candle in self.candles]
        # self.lows = [candle[3] for candle in self.candles]
        self.closes = [candle[4] for candle in self.candles]
        
        self.side = None
        self.isOrderPlaced = False
        self.entryPrice = None
        self.sell_amount = 0
       
        

    # Functions
    def gauss(self, x, h):
        return math.exp(-(math.pow(x, 2) / (h * h * 2)))



    def analyse(self, test = False, ohlcv = None):
        candles = fetch_candles(symbol, timeframe)
        # candles = ohlcv_data
        # self.opens = [candle[1] for candle in self.candles]
        # self.highs = [candle[2] for candle in self.candles]
        # self.lows = [candle[3] for candle in self.candles]
        closes = [candle[4] for candle in candles]


        # Input parameters
        h = 8.0
        mult = 3.0
        src = closes
        n = len(src)

        # Functions
        def gauss(x, h):
            return math.exp(-(math.pow(x, 2) / (h * h * 2)))

        # Initialize variables
        nwe = []
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

        def ENTRY(type='LONG'):
            self.isOrderPlaced = True
            return
            new_order = long(symbol, amount_usdt) if type == 'LONG' else short(symbol, amount_usdt)
            if new_order:
                print(f"{type} order created successfully:", new_order)
                self.isOrderPlaced = True
            # Calculate the amount of BTC to sell
            self.sell_amount = new_order['amount']  # Amount to close


        def EXIT():
            self.isOrderPlaced = False
            return
            close_order = close_position(symbol, self.sell_amount,  'sell' if self.side == 'SHORT' else 'buy')
            if close_order:
                print(f"{self.side} closed successfully:", close_order)
                self.isOrderPlaced = False
                self.side = None
                time.sleep(2)

        # Loop to print lines instead of drawing
        for i in range(min(minRange, n - 1) + 1):

            diff = (nwe[i] + sae) - (nwe[i] - sae)
            ch = diff * (25 / 100)  # value + (value * (percentage / 100))
            # ch = diff + (diff * .10) #10%
            time = timestamp_to_HHMM(candles[i][0])
            price = src[i]
            end = i == n-1


            if self.side == "SHORT" and end:
                sl = self.entryPrice + ch
                bot = nwe[i] - sae
                # TRAILING
                if price < bot:
                    print(time, "EXIT WIN", price)
                    EXIT()
                    pass

                # STOP LOSS
                if price > sl:
                    print(time, "EXIT SL", price)
                    EXIT()
                    pass


            if self.side == "LONG" and end:
                sl = self.entryPrice - ch
                top = nwe[i] + sae
                # TRAILING
                if price > top:
                    print(time, "EXIT WIN", price)
                    EXIT()
                    pass

                # STOP LOSS
                if price < sl:
                    print(time, "EXIT SL", price)
                    EXIT()
                    pass

            if(time == datetime.now().strftime('%H:%M')):
                print(time) 
        
            # Check conditions and print labels
            # if src[i] > nwe[i] + sae and i + 1 < n and src[i + 1] < nwe[i] + sae :        
            if src[i] > nwe[i] + sae and i > n-6:
                print(datetime.now().strftime('%H:%M'), f"▼ at {time} (open: {price}) {i} n-{n-1}")
                if self.side != "SHORT":
                    if self.isOrderPlaced:
                        print(time, "EXIT RV LONG", price)
                        EXIT()
                    
                    print("\n", datetime.now().strftime('%H:%M'), time, "============ SHORT ===============", price)
                    self.side = "SHORT"
                    self.entryPrice = price
                    ENTRY("SHORT")

            # if src[i] < nwe[i] - sae and i + 1 < n and src[i + 1] > nwe[i] - sae :        
            if src[i] < nwe[i] - sae and i > n-6:
                print(datetime.now().strftime('%H:%M'), f"▲ at {time} (open: {price}) {i} n{n-1}")
                if self.side != "LONG":
                    if self.isOrderPlaced:
                        print(time, "EXIT RV SHORT", price)
                        EXIT()
                
                    print("\n", datetime.now().strftime('%H:%M'), time, "============ LONG ===============", price)
                    self.side = "LONG"
                    self.entryPrice = price
                    ENTRY("LONG")


        return self.side, candles[-1]
        # end of analyses



    # R U N
    def run(self):
        while True:
            this_minute = datetime.today().minute
            abs_num = this_minute/1
            
            if abs_num == round(abs_num):
                self.analyse()
                time.sleep(60)  # Run every 15 minutes
                # break;



def main():
    bot = TradingBot()
    bot.run()


if __name__ == "__main__":
    main()
