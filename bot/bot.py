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
    def __init__(self, symbol='XRP/USDT'):
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
        self.resists = [{}] #view
        self.supports = [{}] #view
        self.strong_resists = [{}] #view
        self.strong_supports = [{}] #view
        self.l_points = []
        self.h_points = []
        self.hl = 0
        self.lh = 0
        self.strong_support = None
        self.strong_resist = None
        self.position_temp = {}
        self.positions = []
        self.current_trade = None
        self.marks = [] #view
        self.text = [] #view
        self.breakout = 'await'
        self.isOrderPlaced = False

    def fetch_candles(self):
        # Fetch OHLCV data
        # self.candles = self.exchange.fetch_ohlcv(self.symbol, timeframe=self.timeframe, limit=1000)
        self.candles = ohlcv_data
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
        hl_top = 0
        hl_bot = 0
        lh_top = 0
        lh_bot = 0
        rangeStart = 0
        topEdge = 0
        bottomEdge = 0
   

        for index, cand in enumerate(self.candles):
            # print(f"Index: {index}, cand: {cand}")
            if index < config.period : continue
            end = index == len(self.candles)-1
            delay_index = max(1, index - config.period)
       
            
            # Member functions
            def resist(price):
                self.hl = price # update 
                height = self.hl - self.lh 
                hl_top = price + (height * config.s_r_tolerance / 100) if self.hl is not None else None
                hl_bot = price - (height * config.s_r_tolerance / 100) if self.hl is not None else None
                self.resists[-1]["end_index"] = index
                self.resists.append({"price": price, "start_index": index, "hl_top": hl_top, "hl_bot": hl_bot, "breakout": self.breakout})
                return hl_top, hl_bot
            
            def support(price):
                self.lh = price # update 
                height = self.hl - self.lh 
                lh_top = price + (height * config.s_r_tolerance / 100) if self.lh is not None else None
                lh_bot = price - (height * config.s_r_tolerance / 100) if self.lh is not None else None
                self.supports[-1]["end_index"] = index
                self.supports.append({"price": price, "start_index": index, "lh_top": lh_top, "lh_bot": lh_bot, "breakout": self.breakout})
                return lh_top, lh_bot
            
            def ENTRY(type='LONG'):
                if self.isOrderPlaced: return
                self.isOrderPlaced = True
                self.position_temp = {"entryPrice": cand[1], "startTime": cand[0], "startIndex": index, "type": type}
                self.positions.append({"entryPrice": cand[1], "startTime": cand[0], "startIndex": index, "type": type})
                pass

            def EXIT():
                if not self.isOrderPlaced: return
                self.positions[-1]["exitPrice"] = cand[1]
                self.positions[-1]["endIndex"] = index
                self.isOrderPlaced = False
                pass


            # HIGHS
            hls = self.h_points[:delay_index]
            hls_keys = [x for x in hls if x != '']
            if hls[-1]: 
                hl_top, hl_bot = resist(hls[-1])
                # lh_top, lh_bot = support(self.lh) #update box

                # STRONG RESIST
                related_highs = [x for x in hls_keys[-2:] if x < hl_top and  x > hl_bot]
                if len(related_highs) > 1:
                    self.strong_resists[-1]["end_index"] = index
                    self.strong_resists.append({"price": hls[-1], "start_index": index, "top": hl_top, "bot": hl_bot})
                    self.strong_resist = hls[-1]
                    pass #end


            
            # LOWS
            lhs = self.l_points[:delay_index]
            lhs_keys = [x for x in lhs if x != '']
            if lhs[-1]: 
                lh_top, lh_bot = support(lhs[-1])
                # hl_top, hl_bot = resist(self.hl) #update box
                # STRONG SUPPORT
                related_lows = [x for x in lhs_keys[-2:] if x < lh_top and  x > lh_bot]
                if len(related_lows) > 1:
                    self.strong_supports[-1]["end_index"] = index
                    self.strong_supports.append({"price": lhs[-1], "start_index": index, "top": lh_top, "bot": lh_bot})
                    self.strong_support = lhs[-1]
                    pass #end
                
            if len(self.supports) < 1 or len(self.resists) < 1 or hl_top == None or hl_bot == None or lh_top == None or lh_bot == None: continue;
            
            height = self.hl - self.lh 
            hl_range = [x for x in self.resists if 'start_index' in x and x['start_index'] > rangeStart]
            lh_range = [x for x in self.supports if 'start_index' in x and x['start_index'] > rangeStart]
            


#   . . . . . . . . .  . . . . . . . . .    BULLISH    . . . . . . . . . . . . . . . . . . 

            if cand[1] > hl_top and len(hls_keys) > 0 and len(lhs_keys) > 0 and self.breakout == 'await':
                if self.strong_resist and cand[1] > self.strong_resist:
                    self.breakout = 'bullish'
                    self.marks.append({"index": index, "price": cand[1], 'mark': 'bullish'})
                    ENTRY()
                    # lh_top, lh_bot = support(self.hl)

                    rangeStart = index
                    topEdge = cand[1]
                    continue;
                
            if self.breakout == 'bullish':
                topEdge = cand[1] if cand[1] > topEdge else topEdge 
                # level 1
                # if len(hl_range) == 1:
                #     print(hl_range)
                #     lh_top, lh_bot = support(self.resists[-2]['price'])
                #     hl_top, hl_bot = resist(topEdge)


                # level n
                if len(lh_range) > 0 and cand[1] < self.lh:
                    EXIT()
                    self.breakout = 'await'
                    hl_top, hl_bot = resist(topEdge)
                    lh_top, lh_bot = support(self.lh)
                    self.strong_supports[-1]["end_index"] = index
                    self.strong_supports.append({"price": self.lh, "start_index": index, "top": lh_top, "bot": lh_bot})
                    self.strong_support = self.lh
                
                # level n set resist as support
                


                # reverse
                if cand[1] < hl_bot:
                    if self.resists[-1]['breakout'] == 'await': 
                        self.breakout = 'await'
                        self.text.append({"index": index, "price": cand[1], 'text': 'reverse', 'color': '#fff'})
                        EXIT()



#   . . . . . . . . .  . . . . . . . . .    BEARISH    . . . . . . . . . . . . . . . . . . 

            if cand[1] < lh_bot and len(hls_keys) > 0 and len(lhs_keys) > 0 and self.breakout == 'await':
                if self.strong_support and cand[1] < self.strong_support:
                    self.breakout = 'bearish'
                    self.marks.append({"index": index, "price": cand[1], 'mark': 'bearish'})
                    # print(index, hl_top, hl_bot, lh_top, lh_bot)
                    ENTRY('SHORT')

                    rangeStart = index
                    bottomEdge = cand[1]
                    continue;
                
            if self.breakout == 'bearish':
                bottomEdge = cand[1] if cand[1] > bottomEdge else bottomEdge 
                if cand[1] > lh_top :
                    self.breakout = 'await'
                    self.text.append({"index": index, "price": cand[1], 'text': 'reverse', 'color': '#fff'})
                    EXIT()
                    
               




                
        # print(self.resists)
        pass # end loop

   

    async def run(self):
        while True:
            self.fetch_candles()
            self.check_trade_signal()
            # self.h_points = pivot_high(pd.DataFrame(self.highs))
            await asyncio.sleep(900)  # 15 minutes
