import React, { useEffect, useRef } from "react";
import {
  drawTrendLine,
  drawTrendLineObj,
  drawPosition,
  Mark,
} from "./_fun/draw";
import { calculatePercentage, percentageChange } from "./_fun/helpers";
import botConfig from "./botConfig";

const upColor = "#089981";
const downColor = "#f23645";
const bgColor = "#161a25";

// clickEventListener = ()=>{
//   // Add a click event listener to the canvas
//   canvas.addEventListener('click', (event) => {
//     const mouseX = event.clientX - canvas.offsetLeft;
//     const mouseY = event.clientY - canvas.offsetTop;

//     // Check if the click event occurred within the rectangle
//     if (
//       mouseX >= rectX &&
//       mouseX <= rectX + rectWidth &&
//       mouseY >= rectY &&
//       mouseY <= rectY + rectHeight
//     ) {
//       // Alert the value or perform any other action
//       alert('You clicked the rectangle!');
//     }
//   });
// }

const CustomCandlestickChart = ({
  data,
  hhs,
  lls,
  hls,
  lhs,
  initalRangeStart,
  initialResist,
  initialSupport,
}) => {
  const canvasRef = useRef(null);
  const drawCandlestickChart = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Replace these values with your desired dimensions
    const chartWidth = window.innerWidth;
    const chartHeight = window.innerHeight;
    const padding = 100;

    // Calculate candlestick dimensions
    const numDataPoints = data.length;
    // const candleWidth = (chartWidth - padding * 2) / numDataPoints;
    const candleWidth = 10;
    const maxPrice = Math.max(...data.map((point) => point.h));
    const minPrice = Math.min(...data.map((point) => point.l));
    const priceRange = maxPrice - minPrice;

    // D R A W   V A R S
    const pricePoint = (price, x) => ({
      price,
      x1: padding + x * candleWidth,
      y1: padding + (1 - (price - minPrice) / priceRange) * chartHeight,
      x2: padding + numDataPoints * candleWidth,
      y2: padding + (1 - (price - minPrice) / priceRange) * chartHeight,
    });
    var resist = [pricePoint(initialResist, initalRangeStart)];
    var support = [pricePoint(initialSupport, initalRangeStart)];

    // S T R A T E G Y   V A R S
    let hh = [];
    let ll = [];
    let positions = [];
    let isOrderPlaced = false;
    let positionTmp = {};
    let tradingRange = 0;
    let breakout = "await";
    let hl = []; // on trading range
    let lh = []; // on trading range
    var position_span = 0;
    var rangeResizeCount = 1;
    var supportTouches = 0;
    var resistTouches = 0;

    var diff = support[tradingRange]["y1"] - resist[tradingRange]["y1"];
    var supportResistArea = calculatePercentage(diff, botConfig.S_R_Area);
    resist[tradingRange]["diff"] = diff;
    support[tradingRange]["diff"] = diff;
    var resistBoxStart = resist[tradingRange]["y1"] + supportResistArea / 2;
    var resistBoxEnd = resist[tradingRange]["y1"] - supportResistArea / 2;

    var supportBoxStart = support[tradingRange]["y1"] - supportResistArea / 2;
    var supportBoxEnd = support[tradingRange]["y1"] + supportResistArea / 2;

    // ctx.fillRect(500, supportBoxEnd - 5, 10, 10); // position finder

    // Draw the candlestick chart
    data.forEach((point, index) => {
      const x = padding + index * candleWidth;
      const yHigh =
        padding + (1 - (point.h - minPrice) / priceRange) * chartHeight;
      const yLow =
        padding + (1 - (point.l - minPrice) / priceRange) * chartHeight;
      const yOpen =
        padding + (1 - (point.o - minPrice) / priceRange) * chartHeight;
      const yClose =
        padding + (1 - (point.c - minPrice) / priceRange) * chartHeight;

      const spread = percentageChange(
        support[tradingRange]?.["price"],
        resist[tradingRange]["price"]
      );

      // if(index >= 609)return

      // if(index >= 650){
      //   console.log(index, breakout);
      // }

      // A N A L A Y S

      if (supportBoxEnd < yOpen && breakout == "await") {
        // --- bearish breakout
        // trim support and resist
        if (index > 100) Mark(ctx, pricePoint(point.c, index), "yellow");
        resist[tradingRange]["x2"] = x;
        support[tradingRange]["x2"] = x;
        breakout = "bearish";
        tradingRange += 1;
        // support[tradingRange]["y1"] = yClose
        // resist[tradingRange]["y1"] = yClose;

        resist[tradingRange] = pricePoint(
          support[tradingRange - 1]["price"],
          index
        );

        // Reset higher low and lower high
        hl = [];
        lh = [];

        // CHANGE RANGE

        // E X I T - - - on breakout - - -
        // Close position if position start already
        if (isOrderPlaced) {
          positionTmp["exitPrice"] = point.c;
          positionTmp["x2"] = x;
          positionTmp["y2"] = yOpen;

          positions.push(positionTmp);
          positionTmp = {};
          isOrderPlaced = false;
        }
      } else if (resistBoxEnd > yOpen && breakout == "await") {
        if (index > 100) {
          // console.log(index, support);
          Mark(ctx, pricePoint(point.c, index));
          resist[tradingRange]["x2"] = x;
          support[tradingRange]["x2"] = x;
          breakout = "bullish";
          tradingRange += 1;

          support[tradingRange] = pricePoint(
            resist[tradingRange - 1]["price"],
            index
          );

          resist[tradingRange] = pricePoint(
            support[tradingRange - 1]["price"],
            index
          );
          // // Reset higher low and lower high
          hl = [];
          lh = [];
        }
      }

      // --- bullish  breakout
      if (breakout == "bullish") {
        // console.log(index, hl, lh);
        // if(point.c > )

        const bearishSignal_1 =
          hl.some((_) => _.point.c > hl[0]?.point.c) &&
          hl.length > 1 &&
          lh.length > 1;

        // Draw new range
        // console.log(index, "GOT", hl);

        // Start new Resist
        if (bearishSignal_1) {
          breakout = "await";
          resist[tradingRange] = pricePoint(point.c, index);
          console.log("parallize", index);

          // UPDATE Support Resist BOXES to last range
          diff = resist[tradingRange]["y1"] - support[tradingRange]["y1"];
          support[tradingRange]["diff"] = diff;
          supportResistArea = calculatePercentage(diff, botConfig.S_R_Area);
          resist[tradingRange]["diff"] = diff;
          resistBoxStart = support[tradingRange]["y1"] + supportResistArea / 2;
          resistBoxEnd = support[tradingRange]["y1"] - supportResistArea / 2;

          supportBoxStart = resist[tradingRange]["y1"] - supportResistArea / 2;
          supportBoxEnd = resist[tradingRange]["y1"] + supportResistArea / 2;
        }

        // if price return to last breakout point
        var fakeBreakout = point.c < support[tradingRange]["price"];
        if (fakeBreakout && breakout != "await") {
          // tradingRange += 1;
          breakout = "await";
          // console.log("fakeBreakout", index);
          resist[tradingRange] = pricePoint(
            resist[tradingRange - 1]["price"],
            index
          );
          support[tradingRange] = pricePoint(
            support[tradingRange - 1]["price"],
            index
          );

          // UPDATE Support Resist BOXES
          diff = support[tradingRange]["y1"] - resist[tradingRange]["y1"];
          supportResistArea = calculatePercentage(diff, botConfig.S_R_Area);
          resist[tradingRange]["diff"] = diff;
          support[tradingRange]["diff"] = diff;
          resistBoxStart = resist[tradingRange]["y1"] + supportResistArea / 2;
          resistBoxEnd = resist[tradingRange]["y1"] - supportResistArea / 2;

          supportBoxStart = support[tradingRange]["y1"] - supportResistArea / 2;
          supportBoxEnd = support[tradingRange]["y1"] + supportResistArea / 2;
        }
        // reset
        // console.log({ supportTouches, resistTouches });
        supportTouches = 0;
        resistTouches = 0;
      }
      // bullish breakout has ended

      if (breakout == "bearish") {
        // if one of bearish points greater than last [2]
        var bullishSignal_1 =
          lh.length > 1 &&
          lh.some((_) => _["yClose"] > lh[lh.length - 1]["yClose"]);

        // Start new Support
        if (bullishSignal_1) {
          breakout = "await";
          support[tradingRange] = pricePoint(point.c, index);
          console.log("parallize", index);

          // UPDATE Support Resist BOXES to last range
          diff = support[tradingRange]["y1"] - resist[tradingRange]["y1"];
          resist[tradingRange]["diff"] = diff;
          supportResistArea = calculatePercentage(diff, botConfig.S_R_Area);
          support[tradingRange]["diff"] = diff;
          resistBoxStart = resist[tradingRange]["y1"] + supportResistArea / 2;
          resistBoxEnd = resist[tradingRange]["y1"] - supportResistArea / 2;

          supportBoxStart = support[tradingRange]["y1"] - supportResistArea / 2;
          supportBoxEnd = support[tradingRange]["y1"] + supportResistArea / 2;
        }

        // if price return to last breakout point
        var fakeBreakout = point.c > resist[tradingRange]["price"];
        if (fakeBreakout && breakout != "await") {
          // tradingRange += 1;
          breakout = "await";
          console.log("fakeBreakout", index);
          resist[tradingRange] = pricePoint(
            resist[tradingRange - 1]["price"],
            index
          );
          support[tradingRange] = pricePoint(
            support[tradingRange - 1]["price"],
            index
          );

          // UPDATE Support Resist BOXES
          diff = support[tradingRange]["y1"] - resist[tradingRange]["y1"];
          supportResistArea = calculatePercentage(diff, botConfig.S_R_Area);
          resist[tradingRange]["diff"] = diff;
          support[tradingRange]["diff"] = diff;
          resistBoxStart = resist[tradingRange]["y1"] + supportResistArea / 2;
          resistBoxEnd = resist[tradingRange]["y1"] - supportResistArea / 2;

          supportBoxStart = support[tradingRange]["y1"] - supportResistArea / 2;
          supportBoxEnd = support[tradingRange]["y1"] + supportResistArea / 2;
        }

        // reset
        // console.log({ supportTouches, resistTouches });
        supportTouches = 0;
        resistTouches = 0;

        // index == 616 &&
        //   console.log("---------", index, breakout, resist, support, tradingRange);
      }
      // bearish breakout has ended
      // stabilize and move sideways

      if (breakout == "await" && index > 100) {
        if (supportBoxStart < yClose) supportTouches += 1;
        if (resistBoxStart > yClose) resistTouches += 1;
      }

      // Higher Lows
      // index > 710 && index < 720 && console.log(index, supportBoxStart > yClose);
      // index > 389 && index < 450 && console.log(index,tradingRange, yClose , supportBoxStart, yClose > supportBoxStart);

      // E N T E R LONG - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      var isCandleBearish = index > 1 ? data[index - 1]["c"] > point.c : false;
      var day = new Date(point["t"]).getDay();
      var isHolyday = day == 5 || day == 6; // SAT, SUN
      if (
        (yClose > supportBoxStart || yLow > supportBoxStart) &&
        // (yClose > supportBoxStart) &&
        index > botConfig.leftValue &&
        !isOrderPlaced &&
        breakout != "bearish" &&
        !isHolyday &&
        isCandleBearish &&
        spread > 0.5
        // && false
      ) {
        // console.log("ENTRY", yLow, index, point.c);
        positionTmp["entryPrice"] = point.c;
        positionTmp["x1"] = x;
        positionTmp["y1"] = yClose;
        positionTmp["type"] = "LONG";

        isOrderPlaced = true;
      }

      // E X I T LONG- - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      var r_b_s_w_p_s =
        resistBoxStart +
        calculatePercentage(resistBoxStart, position_span * .4); // resist_box_start_with_position_span
      var reversalCandle = index > 1 ? data[index - 1]["c"] > point.o : false; // confirm exit
      // exit for breackout
      // r_b_s_w_p_s = resistBoxStart

      var position_span_exit = yClose < r_b_s_w_p_s || yHigh < r_b_s_w_p_s;
      if (
        position_span_exit &&
        index > botConfig.leftValue &&
        // index < 390 && // botConfig.leftValue
        isOrderPlaced &&
        reversalCandle &&
        positionTmp["type"] == "LONG"
      ) {
        // console.log("EXIT", yLow, index, point.c);
        positionTmp["exitPrice"] = point.c;
        positionTmp["x2"] = x;
        positionTmp["y2"] = yClose;

        // N E W  R A N G E  O N  O P E N 
        if (
          yClose > resistBoxEnd &&
          yClose < supportBoxStart &&
          positionTmp["exitPrice"] > positionTmp["entryPrice"] &&
          rangeResizeCount == 1
          // && false
        ) {
          // rangeResizeCount += 1
          // index < 200 && console.log("EXP", index, isOrderPlaced);
          // trim
          resist[tradingRange]["x2"] = x;
          support[tradingRange]["x2"] = x;
          tradingRange += 1;

          // var newResist_ = Math.max(...hl.slice(0).filter(_=> _.yClose > resist[tradingRange-1]['y2']).map(_=> _.yClose))
          // var getHl_ = hl.find(_=> _.yClose == newResist_)

          // // console.log("=====", getHl_.point.c);

          // var newResist = Math.min(...hl.slice(0).map(_=> _.yClose)) // lowest value from lowerlows
          // // console.log(newResist, hl.find(_=> _.yClose == newResist));
          // var getHl = hl.find(_=> _.yClose == newResist)

          // resist[tradingRange] = pricePoint(
          //   getHl_.point.c ?? point.c,
          //   index
          // );

          resist[tradingRange] = pricePoint(point.c, index);

          var newSupport = Math.max(...lh.slice(0).map((_) => _.yClose)); // lowest value from lowerlows
          var getLh = lh.find((_) => _.yClose == newSupport);
          support[tradingRange] = pricePoint(getLh?.point?.c ?? point.c, index);

          // UPDATE Support Resist BOXES
          diff = support[tradingRange]["y1"] - resist[tradingRange]["y1"];
          supportResistArea = calculatePercentage(diff, botConfig.S_R_Area);
          resist[tradingRange]["diff"] = diff;
          support[tradingRange]["diff"] = diff;
          resistBoxStart = resist[tradingRange]["y1"] + supportResistArea / 2;
          resistBoxEnd = resist[tradingRange]["y1"] - supportResistArea / 2;

          supportBoxStart = support[tradingRange]["y1"] - supportResistArea / 2;
          supportBoxEnd = support[tradingRange]["y1"] + supportResistArea / 2;
        }

        positions.push(positionTmp);
        positionTmp = {};
        isOrderPlaced = false;
        position_span = 0;
      }

      ////////////////////////////////////////////////////////////////////////////////
      ////////////////////////////////////////////////////////////////////////////////
      /////////////////////////////////    SHORT    //////////////////////////////////
      ////////////////////////////////////////////////////////////////////////////////
      ////////////////////////////////////////////////////////////////////////////////
      // E N T E R SHORT - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      if (
        (yClose < resistBoxStart || yLow > resistBoxEnd) &&
        // (yClose > supportBoxStart) &&
        index > botConfig.leftValue &&
        !isOrderPlaced &&
        breakout != "bearish" &&
        !isHolyday &&
        isCandleBearish &&
        spread > 0.5
        // && false
      ) {
        console.log("ENTRY SHORT", yLow, index, point.c);
        positionTmp["entryPrice"] = point.c;
        positionTmp["x1"] = x;
        positionTmp["y1"] = yClose;
        positionTmp["type"] = "SHORT";

        isOrderPlaced = true;
      }

      // E X I T SHORT- - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      var short_r_b_s_w_p_s =
        supportBoxStart -
        calculatePercentage(supportBoxStart, position_span * 0.4); // resist_box_start_with_position_span
      var reversalCandle = index > 1 ? data[index - 1]["o"] < point.c : false; // confirm exit

      // exit for breackout
      // short_r_b_s_w_p_s = supportBoxStart
      var position_span_exit =
        yClose > short_r_b_s_w_p_s || yLow > short_r_b_s_w_p_s;
      if (
        position_span_exit &&
        (yClose > supportBoxStart || yLow > supportBoxStart) &&
        index > botConfig.leftValue &&
        // index < 390 && // botConfig.leftValue
        isOrderPlaced &&
        reversalCandle &&
        positionTmp["type"] == "SHORT"
      ) {
        console.log("EXIT", yLow, index, point.c);
        positionTmp["exitPrice"] = point.c;
        positionTmp["x2"] = x;
        positionTmp["y2"] = yOpen;

        positions.push(positionTmp);
        positionTmp = {};
        // isOrderPlaced = false;
        position_span = 0;



         // N E W  R A N G E  O N  C L O S E
         if (
          // yClose > supportBoxStart &&
          // yClose < resistBoxEnd &&
          // positionTmp["exitPrice"] > positionTmp["entryPrice"] &&
          // rangeResizeCount == 1
          // && false
          // true
          false
        ) {
          // if(index > 163)return
          // console.log({index});
          // return

          
          resist[tradingRange]["x2"] = x;
          support[tradingRange]["x2"] = x;
          tradingRange += 1;


          // resist[tradingRange] = pricePoint(point.c, index);

          // var newSupport = Math.max(...lh.slice(0).map((_) => _.yClose)); // lowest value from lowerhighs
          // var getLh = lh.find((_) => _.yClose == newSupport);
          // support[tradingRange] = pricePoint(getLh?.point?.c ?? point.c, index);

          // // UPDATE Support Resist BOXES
          // diff = support[tradingRange]["y1"] - resist[tradingRange]["y1"];
          // supportResistArea = calculatePercentage(diff, botConfig.S_R_Area);
          // resist[tradingRange]["diff"] = diff;
          // support[tradingRange]["diff"] = diff;
          // resistBoxStart = resist[tradingRange]["y1"] + supportResistArea / 2;
          // resistBoxEnd = resist[tradingRange]["y1"] - supportResistArea / 2;

          // supportBoxStart = support[tradingRange]["y1"] - supportResistArea / 2;
          // supportBoxEnd = support[tradingRange]["y1"] + supportResistArea / 2;


          support[tradingRange] = pricePoint(point.c, index);
          var newResist = Math.max(...hl.map((_) => _.yClose)); // highest value from higherlows
          var getHl = hl.find((_) => _.yClose == newSupport);
          resist[tradingRange] = pricePoint(getHl?.point?.c ?? point.c, index);

        }

        // PALCE ORDER WHEN LONG CLOSE
        // new inversal trade
        positionTmp["entryPrice"] = point.c;
        positionTmp["x1"] = x;
        positionTmp["y1"] = yOpen;
        positionTmp["type"] = "LONG";
      }

      // postion span calc
      if (isOrderPlaced) position_span += 1;

      // High Low shadow
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.strokeStyle = point.o <= point.c ? upColor : downColor;
      ctx.stroke();

      // Open Close body
      ctx.fillStyle = point.o <= point.c ? upColor : downColor;
      ctx.fillRect(x - 2.5, yOpen, 5, yClose - yOpen);

      // Add text elements
      // ctx.translate(x, 0);
      ctx.font = "12px Arial";
      ctx.fillStyle = "#ffffff20";
      // X-axis label
      ctx.fillText(index, x - 2.5, yOpen - 400);

      // DRAW INDICATORS

      // HL 10
      if (hls[index]) {
        ctx.fillStyle = upColor;
        ctx.fillRect(x, yClose, 15, 15);
        hl.push({ index, x, yClose, point }); // 🔴
      }
      // LH 10
      if (lhs[index]) {
        ctx.fillStyle = downColor;
        ctx.fillRect(x, yClose, 15, 15);
        lh.push({ index, x, yClose, point }); // 🔴
      }

      // HH
      if (hhs[index]) {
        hh.push({ x, yClose }); // 🔴

        ctx.beginPath();
        ctx.arc(x, yClose, 25, 0, 2 * Math.PI);
        ctx.stroke();
      }
      // LL
      if (lls[index]) {
        ll.push({ x, yClose }); // 🔴

        ctx.beginPath();
        ctx.arc(x, yClose, 25, 0, 2 * Math.PI);
        ctx.stroke();
      }

      // line
      // index == 50 && draw.push(x, yHigh);
      // index == 150 && draw.push(x, yHigh);
    }); // END CANDLE LOOP

    // DRAW SUPPORT & RESIST
    support.forEach((s_or_r, idx) => {
      // Initial Resist
      drawTrendLineObj(ctx, support[idx], downColor);
      // Initial Support
      drawTrendLineObj(ctx, resist[idx], upColor);
      // console.log(support[idx]);
    });

    // DRAW POSITIONS
    // drawTrendLine(ctx, draw);
    var profit = 0;
    positions.forEach((position, idx) => {
      // if (position["type"] == "LONG") {
      drawPosition(ctx, position, position["type"]);

      // RESULT BOX
      let INVEST = 10; // $60 = Rs-5000
      let LEVERAGE = 10; // x
      let FEE = 0.05; // %
      let amount = INVEST / position.entryPrice;
      let exit_size = amount * position.exitPrice;

      // LEVERAGE
      let l_entry_size = INVEST * LEVERAGE;
      let l_exit_size = exit_size * LEVERAGE;

      let amount_entry_fee = calculatePercentage(l_entry_size, FEE);
      let amount_exit_fee = calculatePercentage(l_exit_size, FEE);
      var diff = percentageChange(position.entryPrice, position.exitPrice);
      // console.log({amount_entry_fee , amount_exit_fee});

      let pl =
        l_exit_size - l_entry_size - (amount_entry_fee + amount_exit_fee);

      if (position["type"] == "SHORT") {
        pl = l_entry_size - l_exit_size - (amount_entry_fee + amount_exit_fee);
      var diff = percentageChange(position.exitPrice, position.entryPrice);

      }

      profit += pl;


      ctx.font = "16px Arial";
      // entryPrice exitPrice
      ctx.fillStyle = pl < 0 ? "red" : "white";
      ctx.fillText(pl.toFixed(2), 20, (idx + 1) * 30);
      ctx.fillText("(" + diff.toFixed(2) + "%)", 70, (idx + 1) * 30);
      ctx.fillStyle = "#6f03fc";
      ctx.fillText(profit.toFixed(2), 160, (idx + 1) * 30);
      // }

      // if (position["type"] == "SHORT") {
      //   // console.log("SHORT", position);
      // }
    });
  };

  useEffect(() => {
    drawCandlestickChart();
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth * 20}
      height={window.innerHeight}
      style={{
        backgroundColor: bgColor,
      }}
    />
  );
};

export default CustomCandlestickChart;
