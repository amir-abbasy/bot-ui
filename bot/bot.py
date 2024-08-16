import ccxt
from datetime import datetime
import asyncio
import pandas as pd
import json
import config

# Load the JSON file
with open('test/2024-03-11.json', 'r') as file:
    ohlcv_data = json.load(file)

from help.trv import pivot_high, pivot_low

class TradingBot:
    def __init__(self, symbol='BTC/USDT'):
        # self.exchange = ccxt.binance({
        #     # 'apiKey': api_key,
        #     # 'secret': api_secret,
        #     'enableRateLimit': True,
        #     'options': {
        #         'defaultType': 'future'  # Use futures market type
        #     },
        #     'urls': {
        #         'api': {
        #             'public': 'https://testnet.binancefuture.com/fapi/v1',
        #             'private': 'https://testnet.binancefuture.com/fapi/v1',
        #         }
        #     }
        # })
        self.symbol = symbol
        self.timeframe = '15m'
        self.candles = []
        self.resists = [{}]
        self.supports = [{}]
        self.l_points = []
        self.h_points = []
        self.hl = 0
        self.lh = 0
        self.previous_trades = []
        self.current_trade = None
        self.out = None

    def fetch_candles(self):
        # Fetch OHLCV data
        # self.candles = self.exchange.fetch_ohlcv(self.symbol, timeframe=self.timeframe, limit=1000)
        self.candles = ohlcv_data[150:]
        # Unpack the OHLCV data into separate lists
        self.times, self.opens, self.highs, self.lows, self.closes, self.volumes = zip(*self.candles)
        # Convert them back to lists, if necessary (as zip returns tuples)
        self.times = list(self.times)
        self.opens = list(self.opens)
        # self.highs = list(self.highs)
        # self.lows = list(self.lows)
        self.closes = list(self.closes)
        # self.volumes = list(self.volumes)
        return self.candles


    def check_trade_signal(self):
        self.h_points = pivot_high(self.closes, config.period, config.period)
        self.l_points = pivot_low(self.closes, config.period, config.period)
        breakout = 'await'
        hl_top = 0
        hl_bot = 0
        lh_top = 0
        lh_bot = 0

        for index, cand in enumerate(self.candles):
            # print(f"Index: {index}, cand: {cand}")
            if index < config.period : continue
            delay_index = max(1, index - config.period)
           


            hls = self.h_points[:delay_index]
            if hls[-1]:
                self.hl = hls[-1] #update 
                height = self.hl - self.lh 
                hl_top = self.hl + (height * config.s_r_tolerance / 100) if self.hl is not None else None
                hl_bot = self.hl - (height * config.s_r_tolerance / 100) if self.hl is not None else None
                self.resists[-1]["end_index"] = index
                self.resists.append({"price": hls[-1], "start_index": index, "hl_top": hl_top, "hl_bot": hl_bot})
            
            lhs = self.l_points[:delay_index]
            if lhs[-1]:
                self.lh = lhs[-1] #update 
                height = self.hl - self.lh 
                lh_top = self.lh + (height * config.s_r_tolerance / 100) if self.lh is not None else None
                lh_bot = self.lh - (height * config.s_r_tolerance / 100) if self.lh is not None else None
                self.supports[-1]["end_index"] = index
                self.supports.append({"price": lhs[-1], "start_index": index, "lh_top": lh_top, "lh_bot": lh_bot})

            if len(self.supports) < 1 or len(self.resists) < 1 or hl_top == None or hl_bot == None: continue;
            height = self.hl - self.lh 


            # filtered_numbers = list(filter(lambda x: x % 2 != 0, numbers))
            # filtered_numbers = [x for x in numbers if x % 2 != 0]
           

            # if index == len(self.candles)-1 : print("\n\nhl--->", hl_top, hl_bot, "\n\n")
            # if index == 100 : print("lh--->", self.lh, lh_top, lh_bot)

            if cand[0] > hl_top:
                # print('')
                # self.lh = self.hl
                # lh_top = hl_top
                # lh_bot = hl_bot
                # self.supports[-1]["end_index"] = index
                # self.supports.append({"price": lhs[-1], "start_index": index, "lh_top": lh_top, "lh_bot": lh_bot})
                pass
               





        # print(self.resists)
        pass

   

    async def run(self):
        while True:
            self.fetch_candles()
            self.check_trade_signal()
            # self.h_points = pivot_high(pd.DataFrame(self.highs))
            await asyncio.sleep(900)  # 15 minutes
