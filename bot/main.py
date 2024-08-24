from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import ccxt
from datetime import datetime
import asyncio
import pandas as pd
from bot import TradingBot

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
        'supports': bot.supports,
        'resists': bot.resists,
        # 'previous_trades': bot.previous_trades,
        # 'current_trade': bot.current_trade,
        'marks': bot.marks,
        'text': bot.text,
        'strong_supports': bot.strong_supports,
        'strong_resists': bot.strong_resists,

        'positions': bot.positions,
        'h_points': bot.h_points,
        'l_points': bot.l_points,
        'candles': bot.candles,
        # 'times': bot.times
    }
    return response


# uvicorn main:app --reload

@app.get("/ping")
async def ping():
    return {"message": "pong"}

