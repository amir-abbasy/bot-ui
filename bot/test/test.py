import sys
import os

# Get the parent directory
parent_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
# Add the parent directory to the system path
sys.path.insert(0, parent_dir)
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import ccxt
from datetime import datetime
import asyncio
import pandas as pd

# from bot import TradingBot


# bot = TradingBot()


with open("../../src/data/ohlcv/2022-01-11.json", "r") as file:
    # with open('../../src/live.json', 'r') as file:
    ohlcv_data = json.load(file)
print("hi", ohlcv_data[:10])
