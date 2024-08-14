from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import ccxt
from datetime import datetime
import asyncio
import pandas as pd

from help.trv import pivot_high, pivot_low, identify_key_points

class TradingBot:
    def __init__(self, symbol='BTC/USDT'):
        self.exchange = ccxt.binance({
            # 'apiKey': api_key,
            # 'secret': api_secret,
            'enableRateLimit': True,
            'options': {
                'defaultType': 'future'  # Use futures market type
            },
            'urls': {
                'api': {
                    'public': 'https://testnet.binancefuture.com/fapi/v1',
                    'private': 'https://testnet.binancefuture.com/fapi/v1',
                }
            }
        })
        self.symbol = symbol
        self.timeframe = '15m'
        self.candles = []
        self.supports = []
        self.resists = []
        self.previous_trades = []
        self.current_trade = None

    def fetch_candles(self):
        # Fetch OHLCV data
        self.candles = self.exchange.fetch_ohlcv(self.symbol, timeframe=self.timeframe, limit=1000)
        # Unpack the OHLCV data into separate lists
        self.times, self.opens, self.highs, self.lows, self.closes, self.volumes = zip(*self.candles)
        # Convert them back to lists, if necessary (as zip returns tuples)
        self.times = list(self.times)
        self.opens = list(self.opens)
        self.highs = list(self.highs)
        self.lows = list(self.lows)
        self.closes = list(self.closes)
        self.volumes = list(self.volumes)
        return self.candles


    def check_trade_signal(self):
        # self.resists = pivot_high(self.highs, 14, 14)
        # self.supports = pivot_low(self.lows, 14, 14)
        self.points = identify_key_points(self.highs, self.lows,  14, 14)
        # # Print the resistance levels for debugging
        # print(f"Highs: {self.highs}")
        # print(f"Resists: {self.resists}")
        pass

   

    async def run(self):
        while True:
            self.fetch_candles()
            self.check_trade_signal()
            # self.resists = pivot_high(pd.DataFrame(self.highs))
            await asyncio.sleep(900)  # 15 minutes

bot = TradingBot()

@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(bot.run())
    yield



# API
app = FastAPI(lifespan=lifespan)


# Update the origins to include the correct React app origin
origins = [
    "http://localhost:5173",  # Common default port for React, adjust if necessary
    "http://192.168.23.63:5173",  # Your React app's origin
]

# Add CORS middleware to the FastAPI app
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Specify the allowed origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)



@app.get('/bot')
async def bot_backend():
    response = {
        # 'supports': bot.supports,
        # 'resists': bot.resists,
        'points': bot.points,
        # 'previous_trades': bot.previous_trades,
        # 'current_trade': bot.current_trade,
        'candles': bot.candles,
        # 'times': bot.times
    }
    return response



@app.get("/ping")
async def ping():
    return {"message": "pong"}

