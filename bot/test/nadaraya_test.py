import ccxt
import time
from datetime import datetime
import json
import math

# Initialize your exchange
exchange = ccxt.binance(
    {
        # 'apiKey': 'your_api_key',
        # 'secret': 'your_api_secret',
        "enableRateLimit": True,
        "options": {
            # 'defaultType': 'future'  # Use 'spot' for spot trading, 'future' for Futures
        },
    }
)

# Load the JSON file
# with open('2024-03-11.json', 'r') as file:
#     ohlcv_data = json.load(file)


symbol = "BTC/USDT"
timeframe = "1m"
amount_usdt = 10  # Amount in USDT to spend
minRange = 1000


def calculate_pnl(
    entry_price, exit_price, position_type="LONG", position_size=10, fee_type="taker"
):
    # Load settings
    leverage = 20

    # Calculate total position size
    total_position_size = position_size * leverage  # Total position size controlled

    # Calculate taker fee (0.0500% fee)
    taker_fee = total_position_size * 0.0005  # Convert percentage to decimal

    # Calculate PnL with leverage
    if position_type == "LONG":
        pnl = ((exit_price - entry_price) / entry_price) * total_position_size
    elif position_type == "SHORT":
        pnl = ((entry_price - exit_price) / entry_price) * total_position_size
    else:
        raise ValueError("Invalid position type. Use 'LONG' or 'SHORT'.")

    fee = taker_fee * 2

    return pnl - fee


def fetch_candles(symbol, timeframe):
    return exchange.fetch_ohlcv(symbol, timeframe, limit=minRange)


def timestamp_to_HHMM(timestamp_ms):
    # Convert milliseconds to seconds
    timestamp_s = timestamp_ms / 1000

    # Convert the timestamp to a datetime object
    dt_object = datetime.fromtimestamp(timestamp_s)

    # Format the datetime object to HH:MM
    formatted_time = dt_object.strftime("%H:%M")

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
    pnls = []
    isOrderPlaced = False
    position_temp = {}

    entryPrice = 0

    # Input parameters
    h = 8.0
    mult = 3.0
    upCss = "green"  # Color for up condition
    dnCss = "red"  # Color for down condition
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
        ch = diff * (25 / 100)  # value + (value * (percentage / 100))
        # ch = diff + (diff * .10) #10%
        time = timestamp_to_HHMM(candles[i][0])

        top_sl = (nwe[i] + sae) + ch
        bot_sl = (nwe[i] - sae) - ch
        if i > 387 and i < 440:
            # print(i, (nwe[i] - sae), ch, top_sl, ' < open', src[i], src[i] > top_sl)
            pass

        if side == "SHORT":
            sl = entryPrice + ch
            bot = nwe[i] - sae

            # if i > 387 and i < 440:
            #     print(time, entryPrice, sl, src[i])
            #     pass

            # TRAILING
            if src[i] < bot:
                pnl = calculate_pnl(entryPrice, src[i], "SHORT")
                pnls.append(pnl)
                print(time, "EXIT WIN", src[i], pnl)
                side = None

            # STOP LOSS
            if src[i] > sl:
                pnl = calculate_pnl(entryPrice, src[i], "SHORT")
                pnls.append(pnl)
                print(time, "EXIT SL", src[i], pnl)
                side = None
                isOrderPlaced = False
                pass

        if side == "LONG":
            sl = entryPrice - ch
            top = nwe[i] + sae
            # TRAILING
            if src[i] > top:
                pnl = calculate_pnl(entryPrice, src[i], "LONG")
                pnls.append(pnl)
                print(time, "EXIT WIN", src[i], pnl)
                side = None

            # STOP LOSS
            if src[i] < sl:
                pnl = calculate_pnl(entryPrice, src[i], "LONG")
                pnls.append(pnl)
                print(time, "EXIT SL", src[i], pnl)
                side = None
                isOrderPlaced = False
                pass

        # print(timestamp_to_HHMM(candles[i][0]), src[i])
        # if i % 2 == 0:
        #     print(f"Line: {n-i+1} -> {n-i}, y1 + sae: {nwe[i] + sae}, color: {upCss}")
        #     print(f"Line: {n-i+1} -> {n-i}, y1 - sae: {nwe[i] - sae}, color: {dnCss}")

        # Check conditions and print labels
        if src[i] > nwe[i] + sae and i + 1 < n and src[i + 1] < nwe[i] + sae:
            # print(f"▼ at {time} (open: {src[i]})")
            if side != "SHORT":
                print("\n", time, "============ SHORT ===============", src[i])
                side = "SHORT"
                isOrderPlaced = True
                entryPrice = src[i]

        if src[i] < nwe[i] - sae and i + 1 < n and src[i + 1] > nwe[i] - sae:
            # print(f"▲ at {time} (open: {src[i]})")
            if side != "LONG":
                print("\n", time, "============ LONG ===============", src[i])
                side = "LONG"
                isOrderPlaced = True
                entryPrice = src[i]

    # PNL
    total_sum = 0.0
    for x in pnls:
        total_sum += x
    print(pnls, "\n", total_sum)

    return side, candles[-1]


# end of analyses


def run_bot():
    check_trade_signals()


if __name__ == "__main__":
    run_bot()
