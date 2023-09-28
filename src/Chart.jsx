import React, { useEffect, useRef } from "react";
import { drawTrendLine, drawTrendLineObj, drawPosition } from "./_fun/draw";
import { calculatePercentage } from "./_fun/helpers";
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
    const candleWidth = 7;
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

      // if(index >= 609)return

      // if(index >= 650){
      //   console.log(index, breakout);
      // }

      // A N A L A Y S

      if (supportBoxEnd < yOpen && breakout == "await") {
        // --- bearish breakout
        // trim support and resist
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
        positionTmp["exitPrice"] = point.c;
        positionTmp["x2"] = x;
        positionTmp["y2"] = yClose;

        positions.push(positionTmp);
        positionTmp = {};
        isOrderPlaced = false;
      }

      if (breakout == "bearish") {
        // if one of bearish points greater than last [2]
        var bullishSignal_1 =
          lh.length > 1 &&
          lh.some((_) => _["yClose"] > lh[lh.length - 1]["yClose"]);

        // Start new Support
        if (bullishSignal_1) {
          breakout = "await";
          support[tradingRange] = pricePoint(point.c, index);
          console.log("bullishSignal_1", index);

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
        if (fakeBreakout) {
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
        // index == 616 &&
        //   console.log("---------", index, breakout, resist, support, tradingRange);
      }

      // --- bullish  breakout
      // ** later

      // bearish breakout has ended
      // stabilize and move sideways
      // Higher Lows

      // index > 389 && index < 450 && console.log(index,tradingRange, yClose , supportBoxStart, yClose > supportBoxStart);

      // E N T E R - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      var isCandleBearish = index > 1 ? data[index - 1]["c"] > point.c : false;
      if (
        (yClose > supportBoxStart || yLow > supportBoxStart) &&
        index > botConfig.leftValue &&
        // index < 390 && // botConfig.leftValue
        !isOrderPlaced &&
        breakout != "bearish" &&
        isCandleBearish
      ) {
        // console.log("ENTRY", yLow, index, point.c);
        positionTmp["entryPrice"] = point.c;
        positionTmp["x1"] = x;
        positionTmp["y1"] = yClose;
        positionTmp["type"] = "LONG";

        isOrderPlaced = true;
      }

      // E X I T - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      var r_b_s_w_p_s =
        resistBoxStart +
        calculatePercentage(resistBoxStart, position_span * 0.25); // resist_box_start_with_position_span
      var reversalCandle = index > 1 ? data[index - 1]["c"] > point.c : false; // noraml confirm exit
      // exit for breackout
      // r_b_s_w_p_s = resistBoxStart

      var position_span_exit = yClose < r_b_s_w_p_s || yHigh < r_b_s_w_p_s;
      if (
        position_span_exit &&
        index > botConfig.leftValue &&
        // index < 390 && // botConfig.leftValue
        isOrderPlaced &&
        reversalCandle
      ) {
        // console.log("EXIT", yLow, index, point.c);
        positionTmp["exitPrice"] = point.c;
        positionTmp["x2"] = x;
        positionTmp["y2"] = yClose;

        // N E W  R A N G E
        if (
          yClose > resistBoxEnd &&
          yClose < supportBoxStart &&
          positionTmp["exitPrice"] > positionTmp["entryPrice"] &&
          rangeResizeCount == 1
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
      drawPosition(ctx, position);

      // RESULT BOX
      let INVEST = 10; // $60 = Rs-5000
      let LEVERAGE = 20; // x
      let FEE = 0.04; // %
      let amount = INVEST / position.entryPrice;
      let exit_size = amount * position.exitPrice;

      // LEVERAGE
      let l_entry_size = INVEST * LEVERAGE;
      let l_exit_size = exit_size * LEVERAGE;

      let amount_entry_fee = calculatePercentage(l_entry_size, FEE);
      let amount_exit_fee = calculatePercentage(l_exit_size, FEE);
      let pl =
        l_exit_size - l_entry_size - (amount_entry_fee + amount_exit_fee);
      profit += pl;

      ctx.font = "18px Arial";
      // entryPrice exitPrice
      ctx.fillStyle = pl < 0 ? "red" : "white";
      ctx.fillText(pl.toFixed(2), 50, (idx + 1) * 30);
      ctx.fillStyle = "#6f03fc";
      ctx.fillText(profit.toFixed(2), 120, (idx + 1) * 30);
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
