import React, { useEffect, useRef, useState } from "react";
import "./App.css";
import CustomCandlestickChart from "./Chart";
import Pattern from "./Pattern";
// import test_data from "./BTC.json";
// import test_data from "./data.json";
// import test_data from "./data_.json";
// import test_data from "./data3.json";
// import test_data from "./data_api.json";
// import test_data from "./data/2022-07-15.json";
import test_data from "./data/2023-01-01.json";
// import test_data from "./data/2022-07-01.json"; // *
import JsonLoader from './_fun/JsonLoader.jsx'

import botConfig from "./botConfig";
const data_offet = 0;
const data_len = 100; //700

const speed = 5


import {
  findHigherHighsAndLowerLows,
  pivothigh,
  pivotlow,
} from "./_fun/hhll.js";

function App() {
  const [data, setData] = useState([]);
  const [tradeConfig, setTradeConfig] = useState({
    data_offet,
    data_len,
  });
  const YOUR_API_KEY = "43B883CE-9FB3-4C18-BA4E-B74369376210";


  const modifyData = ohlcv_data => ohlcv_data.slice(tradeConfig.data_offet, tradeConfig.data_len)
    .map((_) => ({
      t: new Date(_.time_open).getTime(),
      o: _.price_open,
      h: _.price_high,
      l: _.price_low,
      c: _.price_close,
      v: _.volume_traded,
    }));

  async function getOhlcv() {
    const ohlcv = test_data;

    // const response = await fetch(
    //   "https://rest.coinapi.io/v1/ohlcv/BINANCE_SPOT_BTC_USDT/history?period_id=15MIN&limit=1000&time_start=2023-07-15T00:00:00",
    //   {
    //     method: "GET",
    //     headers: {
    //       "Content-Type": "application/json",
    //       "X-CoinAPI-Key": YOUR_API_KEY,
    //     },
    //   }
    // );
    // const ohlcv = await response.json();
    // console.log(ohlcv);



    setData(modifyData(ohlcv));
  }

  useEffect(() => {
    getOhlcv();
    // var data = test_data.slice(tradeConfig.data_offet, tradeConfig.data_len).map((_, k) => ({
    //   t: _[0],
    //   o: _[1],
    //   h: _[2],
    //   l: _[3],
    //   c: _[4],
    // }));
    // setData(data);
  }, [tradeConfig.data_len, tradeConfig.data_offet]);

  // Replace this data with your own candlestick data
  // const data = [
  //   { t: "2023-07-25", o: 100, h: 120, l: 90, c: 110 }, // Replace with your candlestick data
  //   { t: "2023-07-26", o: 110, h: 130, l: 100, c: 120 }, // Replace with your candlestick data
  // ...
  // ];

  // HORIZONTAL SCROLL
  const scrollableRef = useRef(null);
  useEffect(() => {
    const handleScroll = (event) => {
      event.preventDefault();
      const container = scrollableRef.current;
      const speed = event.shiftKey ? 0.5 : 3;
      container.scrollLeft += event.deltaY * speed;
    };

    // Add the event listener with passive: false option
    scrollableRef.current.addEventListener("wheel", handleScroll, {
      passive: false,
    });

    // Clean up the event listener when the component unmounts
    return () => {
      scrollableRef.current.removeEventListener("wheel", handleScroll);
    };
  }, []);

  // console.log("-", findHigherHighsAndLowerLows(data));

  var close = data.map((_, k) => _.c);

  const hhs = pivothigh(close, botConfig.leftValue, botConfig.rightValue);
  const lls = pivotlow(close, botConfig.leftValue, botConfig.rightValue);
  // console.log("Pivot Highs:", hhs);
  // console.log("Pivot Lows:", lls);

  const hls = pivothigh(
    close,
    botConfig.leftValueSmall,
    botConfig.rightValueSmall
  );

  const lhs = pivotlow(
    close,
    botConfig.leftValueSmall,
    botConfig.rightValueSmall
  );
  // console.log(Math.max(...hls.filter(_ =>_).slice(0,3)));
  var initialResistAr = hls.filter((_) => _).slice(0, 3);
  var initalRangeStartR = hls.indexOf(initialResistAr[2]);
  var initialSupportAr = lhs.filter((_) => _).slice(0, 3);
  var initalRangeStartS = lhs.indexOf(initialSupportAr[2]);

  // return (
  //   <div className="horizontal-scroll-container" ref={scrollableRef}>
  //     <Pattern
  //       data={data}
  //       hhs={hhs}
  //       lls={lls}
  //       hls={hls}
  //       lhs={lhs}
  //       initalRangeStart={
  //         initalRangeStartR > initalRangeStartS
  //           ? initalRangeStartR
  //           : initalRangeStartS
  //       }
  //       initialResist={Math.max(...initialResistAr)}
  //       initialSupport={Math.min(...initialSupportAr)}
  //     />
  //   </div>
  // );



  return (
    <div>

      <div className="dashboard">
        <JsonLoader setJsonData={json => setData(modifyData(json))} />
        <input
          value={tradeConfig.data_offet}
          placeholder="*"
          onChange={(e) =>
            setTradeConfig({ ...tradeConfig, data_offet: e.target.value })
          }
        />
        <input
          value={tradeConfig.data_len}
          placeholder="*"
          onChange={(e) =>
            setTradeConfig({
              ...tradeConfig,
              data_len: e.target.value == "" ? 1000 : e.target.value,
            })
          }
        />
        <button
          onClick={() => {
            setTradeConfig({
              ...tradeConfig,
              data_len: tradeConfig.data_len - speed,
            });
          }}
          style={{ paddingLeft: 40, paddingRight: 40 }}
        >
          -
        </button>
        <button
          onClick={() => {
            setTradeConfig({
              ...tradeConfig,
              data_len: tradeConfig.data_len + speed,
            });
          }}
          style={{ paddingLeft: 40, paddingRight: 40 }}
        >
          +
        </button>
      </div>
      <div className="horizontal-scroll-container" ref={scrollableRef}>
        <CustomCandlestickChart
          data={data}
          hhs={hhs}
          lls={lls}
          hls={hls}
          lhs={lhs}
          initalRangeStart={
            initalRangeStartR > initalRangeStartS
              ? initalRangeStartR
              : initalRangeStartS
          }
          initialResist={Math.max(...initialResistAr)}
          initialSupport={Math.min(...initialSupportAr)}
        />
      </div>
    </div>
  );
}

export default App;
