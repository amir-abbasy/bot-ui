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
const data_len = 1000; //700
const speed = 1


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
    speed
  });


  const modifyData = ohlcv_data => ohlcv_data.slice(tradeConfig.data_offet, tradeConfig.data_len).map((_, k) => ({
      t: _[0],
      o: _[1],
      h: _[2],
      l: _[3],
      c: _[4],
      v: _[5],
    }));


  useEffect(() => {
    setData(modifyData(data));
  }, [tradeConfig.data_len, tradeConfig.data_offet]);


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
              data_len: parseInt(tradeConfig.data_len) - tradeConfig.speed,
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
              data_len: parseInt(tradeConfig.data_len) + tradeConfig.speed,
            });
          }}
          style={{ paddingLeft: 40, paddingRight: 40 }}
        >
          +
        </button>


        {[1, 5, 10, 100, 500].map((spd, idx) => {
          return <button key={'speed_' + idx}
            onClick={() => setTradeConfig({ ...tradeConfig, speed: spd })}
            style={{ paddingLeft: 10, paddingRight: 10, color: tradeConfig.speed == spd ? 'black' : '#aaa' }}
          >{spd}</button>
        })}
        <button
          onClick={() => {
            console.log(data.length);
            setTradeConfig({
              ...tradeConfig,
              data_len,
            });
          }}
          style={{ paddingLeft: 10, paddingRight: 10 }}
        >
          reset
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
