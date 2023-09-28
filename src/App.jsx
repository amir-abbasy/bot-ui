import React, { useEffect, useRef } from "react";
import "./App.css";
import CustomCandlestickChart from "./Chart";
// import test_data from "./BTC.json";
import test_data from "./data.json";
// import test_data from "./data_.json";
// import test_data from "./data3.json";
import botConfig from "./botConfig";
const data_offet = 0;
const data_len = 1200; //700

import {
  findHigherHighsAndLowerLows,
  pivothigh,
  pivotlow,
} from "./_fun/hhll.js";

function App() {
  // Replace this data with your own candlestick data
  // const data = [
  //   { t: "2023-07-25", o: 100, h: 120, l: 90, c: 110 }, // Replace with your candlestick data
  //   { t: "2023-07-26", o: 110, h: 130, l: 100, c: 120 }, // Replace with your candlestick data
  // ...
  // ];

  var data = test_data.slice(data_offet, data_len).map((_, k) => ({
    t: _[0],
    o: _[1],
    h: _[2],
    l: _[3],
    c: _[4],
  }));

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

  var close = test_data.map((_, k) => _[4]);

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
  var initialSupportAr =lhs.filter((_) => _).slice(0, 3);
  var initalRangeStartS = lhs.indexOf(initialSupportAr[2]);


  return (
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
  );
}

export default App;
