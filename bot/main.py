from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import ccxt
from datetime import datetime
import asyncio
import pandas as pd
import json

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


@app.get("/bot")
async def bot_backend():
    response = {
        "supports": bot.supports,
        "resists": bot.resists,
        "marks": bot.marks,
        "text": bot.text,
        "strong_supports": bot.strong_supports,
        "strong_resists": bot.strong_resists,
        "breakouts": bot.breakouts,
        "positions": bot.positions,
        "h_points": bot.h_points,
        "l_points": bot.l_points,
        "candles": bot.candles,
        # 'times': bot.times
    }
    return response


@app.get("/test")
async def bot_backend():
    # dates = ["2022-11-07"]
    dates = [
        "2022-11-07",
        "2022-11-17",
        "2022-11-27",
        "2022-12-07",
        "2022-12-17",
        "2022-12-27",
        "2023-01-06",
        "2023-01-16",
        "2023-01-26",
        "2023-02-05",
        "2023-02-15",
        "2023-02-25",
        "2023-03-07",
        "2023-03-17",
        "2023-03-27",
        "2023-04-06",
        "2023-04-16",
        "2023-04-26",
        "2023-05-06",
        "2023-05-16",
        "2023-05-26",
        "2023-06-05",
        "2023-06-15",
        "2023-06-25",
        "2023-07-05",
        "2023-07-15",
        "2023-07-25",
        "2023-08-04",
        "2023-08-14",
        "2023-08-24",
        "2023-09-03",
        "2023-09-13",
        "2023-09-23",
        "2023-10-03",
        "2023-10-13",
        "2023-10-23",
        "2023-11-02",
        "2023-11-12",
        "2023-11-22",
        "2023-12-02",
        "2023-12-12",
        "2023-12-22",
        "2024-01-01",
        "2024-01-11",
        "2024-01-21",
        "2024-01-31",
        "2024-02-10",
        "2024-02-20",
        "2024-03-01",
        "2024-03-11",
    ]
    
    response = []
    for date in dates:
        file_path = f"../src/data/ohlcv/{date}.json"
        try:
            with open(file_path, "r") as file:
                ohlcv_data = json.load(file)
                # print(ohlcv_data[:10])  # Display first 10 records for debugging
            bot = TradingBot()
            await bot.run(True, ohlcv_data)
            response.append(
                {
                    "date": date,
                    "positions": bot.positions,
                }
            )
        except FileNotFoundError:
            response.append(
                {
                    "date": date,
                    "error": f"File {file_path} not found",
                }
            )
        except json.JSONDecodeError:
            response.append(
                {
                    "date": date,
                    "error": f"Error decoding JSON from {file_path}",
                }
            )

    return response


# uvicorn main:app --reload


@app.get("/ping")
async def ping():
    return {"message": "pong"}
