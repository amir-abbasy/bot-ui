import React, { useEffect, useRef } from "react";
import {
  drawTrendLine,
  drawTrendLineObj,
  drawPosition,
  drawRect,
  Mark,
  Text
} from "./_fun/draw";
import {
  calculatePercentage,
  percentageChange,
  calculateFee,
} from "./_fun/helpers";
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
    const padding = 0;

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
    var resetRange = 0
    var offset = 0
    var breakoutBullishOffset = 0
    var breakoutBearishOffset = 0

    var diff = support[tradingRange]["y1"] - resist[tradingRange]["y1"];
    var supportResistArea = calculatePercentage(diff, botConfig.S_R_Area);
    resist[tradingRange]["diff"] = diff;
    support[tradingRange]["diff"] = diff;
    var resistBoxStart = resist[tradingRange]["y1"] + supportResistArea / 2;
    var resistBoxEnd = resist[tradingRange]["y1"] - supportResistArea / 2;
    var supportBoxStart = support[tradingRange]["y1"] - supportResistArea / 2;
    var supportBoxEnd = support[tradingRange]["y1"] + supportResistArea / 2;

    var diff_price = resist[tradingRange]["price"] - support[tradingRange]["price"];
    var supportResistArea_price = calculatePercentage(diff_price, botConfig.S_R_Area);
    var resistBoxStart_price = resist[tradingRange]["price"] - supportResistArea_price / 2;
    var resistBoxEnd_price = resist[tradingRange]["price"] + supportResistArea_price / 2;
    var supportBoxStart_price = support[tradingRange]["price"] + supportResistArea_price / 2;
    var supportBoxEnd_price = support[tradingRange]["price"] - supportResistArea_price / 2;

    // ctx.fillRect(500, supportBoxEnd - 5, 10, 10); // position finder

    function update_support_resist(support_price, resist_price, invert = false) {
      diff_price = resist_price - support_price
      supportResistArea_price = calculatePercentage(diff_price, botConfig.S_R_Area);
      resistBoxStart_price = resist_price - supportResistArea_price / 2;
      resistBoxEnd_price = resist_price + supportResistArea_price / 2;
      supportBoxStart_price = support_price + supportResistArea_price / 2;
      supportBoxEnd_price = support_price - supportResistArea_price / 2;
    }


    // Draw the candlestick chart
    data.forEach((point, index) => {
      const x = padding + index * candleWidth;
      const yHigh = padding + (1 - (point.h - minPrice) / priceRange) * chartHeight;
      const yLow = padding + (1 - (point.l - minPrice) / priceRange) * chartHeight;
      const yOpen = padding + (1 - (point.o - minPrice) / priceRange) * chartHeight;
      const yClose = padding + (1 - (point.c - minPrice) / priceRange) * chartHeight;

      const spread = percentageChange(support[tradingRange]?.["price"], resist[tradingRange]["price"]);

      const hls_tmp = hls.slice(0, index).filter((_) => _);
      const lhs_tmp = lhs.slice(0, index).filter((_) => _);
      // Mark(ctx,pricePoint(hls_tmp[hls_tmp.length - 1], index),"#cccccc30",4,1);
      // Mark(ctx,pricePoint(lhs_tmp[lhs_tmp.length - 1], index),"#cccccc30",4,1);
      function ENTRY(type = "LONG") {
        // console.log("ENTRY "+type, yLow, index, point.o);
        positionTmp["entryPrice"] = point.o;
        positionTmp["x1"] = x;
        positionTmp["y1"] = yClose;
        positionTmp["type"] = type;
        isOrderPlaced = true;
      }
      function EXIT() {
        // console.log("EXIT", yLow, index, point.o);
        positionTmp["exitPrice"] = point.o;
        positionTmp["x2"] = x;
        positionTmp["y2"] = yOpen;
        positions.push(positionTmp);
        positionTmp = {};
        isOrderPlaced = false;
        position_span = 0;
      }

      var day = new Date(point["t"]).getDay();
      var isHolyday = day == 5 || day == 6; // SAT, SUN
      // if (isHolyday) Mark(ctx, { x1: x, y1: 30 }, "yellow", 4, 1)
      // S & R
      Mark(ctx, pricePoint(resistBoxEnd_price, index), upColor + 40, candleWidth, 1);
      Mark(ctx, pricePoint(resistBoxStart_price, index), upColor + 90, candleWidth, 1);
      Mark(ctx, pricePoint(supportBoxStart_price, index), downColor + 90, candleWidth, 1);
      Mark(ctx, pricePoint(supportBoxEnd_price, index), downColor + 40, candleWidth, 1);

      // drawRect(ctx, { x1: x, y1: resistBoxStart, w: 10, h: resistBoxEnd-resistBoxStart }, upColor+20);

      // breakout
      if (breakout == 'bullish') Mark(ctx, { x1: x, y1: 30 }, "green", 4, 1)
      if (breakout == 'bearish') Mark(ctx, { x1: x, y1: 30 }, "red", 4, 1)
      if (breakout == 'await') Mark(ctx, { x1: x, y1: 30 }, "#cccccc50", 4, 1)

      var isBullishCandle = index > 1 ? data[index - 1]["o"] > point.o : false;


      if (index == 100) {
        // console.log(index, hls[index]);
      }

      // A N A L A Y S
      // BREAKOUT BEARISH ------------------------------------------------------------------
      if (point.o < supportBoxEnd_price && breakout == "await" && index > initalRangeStart) {
        // console.log(index, "------> BREAKOUT BEARISH");
        // trim support and resist
        resist[tradingRange]["x2"] = x;
        support[tradingRange]["x2"] = x;
        breakout = "bearish";
        Text(ctx, "BR", x, pricePoint(resistBoxEnd_price, index)['y1'], 'red');
        // Reset higher low and lower high
        hl = [];
        lh = [];
        // console.log({ supportTouches, resistTouches });
        supportTouches = 0;
        resistTouches = 0;
        // E X I T - - - on breakout - - -
        if (isOrderPlaced) EXIT()
      } else if (
        point.o > resistBoxEnd_price &&
        breakout == "await" &&
        index > initalRangeStart
      ) {
        // BREAKOUT BULLISH ------------------------------------------------------------------
        // console.log(index, "------> BREAKOUT BULLISH");
        resist[tradingRange]["x2"] = x;
        support[tradingRange]["x2"] = x;
        breakout = "bullish";
        Text(ctx, "BR", x, pricePoint(resistBoxEnd_price, index)['y1'], 'green');
        //  Reset higher low and lower high
        hl = [];
        lh = [];
        // console.log({ supportTouches, resistTouches });
        supportTouches = 0;
        resistTouches = 0;
        // E X I T STOP LOSS SHORT  - - - on breakout - - -
        if (isOrderPlaced && positionTmp["type"] == "SHORT") EXIT()
      }


      // index > 788 && index < 850 && console.log(index, resetRange);

      if (breakout == "bearish") {

        // after sell take coming hl as resist
        // - 1 = close position
        // - 2 = found new hl
        // - offset = wait for exact index of hl / lh 
        if (lhs[index]) resetRange += 1
        if (resetRange == 1) offset += 1
        if (offset == botConfig.leftValueSmall) {
          resist[tradingRange]["x2"] = x;
          support[tradingRange]["x2"] = x;
          tradingRange += 1;


          var newSupportFromLast_lhs = Math.min(...lhs_tmp.slice(-2)); // lowest value from lowerlows
          support[tradingRange] = pricePoint(newSupportFromLast_lhs, index);

          resist[tradingRange] = pricePoint(supportBoxEnd_price, index);

          // UPDATE Support Resist BOXES
          update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
          Text(ctx, "T", x, pricePoint(resistBoxEnd_price, index)['y1'] + 20);

        }


        if (point.o > resistBoxEnd_price) {
          Text(ctx, "RV-L", x, pricePoint(supportBoxEnd_price, index)['y1'] + 20, 'yellow');


          update_support_resist(support[tradingRange - 1]["price"], resist[tradingRange - 1]["price"])
          breakout = 'await'
          resetRange = 0
          offset = 0
        }


        if (offset > botConfig.leftValueSmall) {
          // LONG
          if (point['o'] < supportBoxStart_price && point["o"] > supportBoxEnd_price && !isOrderPlaced) {
            Text(ctx, "entery", x, pricePoint(resistBoxEnd_price, index)['y1'] + 20);
            ENTRY()
          }


          if (point['o'] > resistBoxStart_price && point["o"] > resistBoxEnd_price && isOrderPlaced && positionTmp.type == "LONG" && isBullishCandle) {
            EXIT()

          }

          // SHORT
          if (point['o'] < resistBoxEnd_price && point["o"] > resistBoxStart_price && !isOrderPlaced) ENTRY("SHORT")
          if (point['o'] < supportBoxStart_price && point["o"] > supportBoxEnd_price && isOrderPlaced && positionTmp.type == "SHORT" && !isBullishCandle) EXIT()
        }
















        // if one of bearish points greater than last [2]
        var bullishSignal_1 =
          lh.length > 1 &&
          lh.some((_) => _["point"]["c"] < lh[lh.length - 1]["point"]["c"]);

        // Start new Support
        if (bullishSignal_1) {
          if (false) breakout = "await";
          if (false) support[tradingRange] = pricePoint(point.o, index);
          // resist[tradingRange] = pricePoint(resist[tradingRange - 1]["price"], index);

          if (false) Text(ctx, "PRL", x, pricePoint(resistBoxEnd_price, index)['y1']);
          // UPDATE Support Resist BOXES
          if (false) update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])

          // ENTRY()
          // Text(ctx, "L-prl", x, 100, 'blue');
        }

        // if price return to last breakout point
        var fakeBreakout = point.o > support[tradingRange]["price"];
        if (fakeBreakout && breakout != "await" && false) {
          Text(ctx, "RV-L", x, pricePoint(resistBoxEnd_price, index)['y1'] + 20);
          tradingRange += 1;
          breakout = "await";

          resist[tradingRange] = pricePoint(resist[tradingRange - 1]["price"], index);
          // support[tradingRange] = pricePoint(support[tradingRange - 1]["price"],index);
          support[tradingRange] = pricePoint(lhs[lhs_tmp.length - 1], index);

          diff_price = resist[tradingRange - 1]["price"] - support[tradingRange - 1]["price"];
          supportResistArea_price = calculatePercentage(diff_price, botConfig.S_R_Area);

          // UPDATE Support Resist BOXES to last range
          // // update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
        }

        // reset
        // console.log({ supportTouches, resistTouches });
        supportTouches = 0;
        resistTouches = 0;


      }
      // bearish breakout has ended
      // stabilize and move sideways

      if (breakout == "await" && index > 100) {
        if (supportBoxStart < yClose) supportTouches += 1;
        if (resistBoxStart > yClose) resistTouches += 1;
      }
      // console.log(index,breakout, resist.length, resist[resist.length-1]['price']);


      if (breakout == "bullish") {

        if (point.o > resistBoxEnd_price && (support[tradingRange - 1] && resist[tradingRange - 1])) {
          Text(ctx, "RV-L", x, pricePoint(supportBoxEnd_price, index)['y1'] + 20, 'green');
          update_support_resist(support[tradingRange - 1]["price"], resist[tradingRange - 1]["price"])
          breakout = 'await'
          resetRange = 0
          offset = 0
        }



        if (hls[index] && breakoutBullishOffset == 0) breakoutBullishOffset = 1
        if (breakoutBullishOffset > 0) breakoutBullishOffset += 1
        if (breakoutBullishOffset == botConfig.leftValueSmall) {
          resist[tradingRange]["x2"] = x;
          support[tradingRange]["x2"] = x;
          tradingRange += 1;


          var newResistFromLast_hls = Math.max(...hls_tmp.slice(-2)); // lowest value from lowerlows
          support[tradingRange] = pricePoint(resistBoxEnd_price, index);

          resist[tradingRange] = pricePoint(newResistFromLast_hls, index);

          // UPDATE Support Resist BOXES
          update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
          Text(ctx, "new rng bullish", x, pricePoint(resistBoxEnd_price, index)['y1'] + 20);
          breakoutBullishOffset = 0

        }
















        // if one of bearish points greater than last [2]
        var bearshSignal_1 =
          hl.length > 1 &&
          // hl.some((_) => _["point"]["c"] < hl[hl.length - 1]["point"]["c"]);
          hl.slice(0, -1).some((_) => point.c < _["point"]["c"]);
        // Start new Support
        if (bearshSignal_1 && false) {
          // console.log("parallize bullish", index);
          Text(ctx, "PRL", x, pricePoint(resistBoxEnd_price, index)['y1']);
          resist[tradingRange]["x2"] = x;
          support[tradingRange]["x2"] = x;
          tradingRange += 1;
          breakout = "await";

          // support[tradingRange] = pricePoint(point.o, index);
          // resist[tradingRange] = pricePoint(point.c, index);

          var newSupport = Math.min(...lh.map((_) => _.point.c)); // lowest value from lowerlows
          support[tradingRange] = pricePoint(newSupport, index);
          var newResist = Math.max(...hl.map((_) => _.point.c)); // lowest value from higherlows
          resist[tradingRange] = pricePoint(newResist, index);
          // UPDATE Support Resist BOXES
          Text(ctx, "L-prl", x, 200, 'yellow');

          update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
          // ENTRY()
        }

        // if price return to last breakout point
        var fakeBreakout = point.o < resistBoxEnd_price;
        if (fakeBreakout && breakout != "await") {
          // Text(ctx, "RV", x, pricePoint(resistBoxEnd_price, index)['y1'] + 20);
          // *tradingRange += 1;
          breakout = "await";
          // ENTRY("SHORT")
          // Text(ctx, "S-reverse", x, 100, 'blue');

          // resist[tradingRange] = pricePoint(resist[tradingRange - 1]["price"], index);
          // * resist[tradingRange] = pricePoint(hls_tmp[hls_tmp.length - 1], index);
          // support[tradingRange] = pricePoint(support[tradingRange - 1]["price"], index);
          // * support[tradingRange] = resist[tradingRange - 1]

          // var newSupportFromLast_lls = Math.min(...lhs_tmp.slice(-3)); // lowest value from lowerlows
          // support[tradingRange] = pricePoint(newSupportFromLast_lls, index);

          // UPDATE Support Resist BOXES
          // * update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
        }

      }


      // E N T E R LONG - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      var isCandleBearish = index > 1 ? data[index - 1]["c"] > point.o : false;
      var or_low = index > 1 ? data[index - 1]["l"] < supportBoxStart_price : false;

      if (
        (point.o < supportBoxStart_price || or_low) &&
        // (yClose > supportBoxStart) &&
        index > botConfig.leftValue &&
        !isOrderPlaced &&
        breakout == "await" &&
        !isHolyday &&
        // isCandleBearish &&
        spread > 0.5
        // && false
      ) {
        ENTRY()
        Text(ctx, "L-normal", x, 100, 'blue');
      }

      // E X I T LONG- - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      var r_b_s_w_p_s =
        resistBoxStart_price -
        calculatePercentage(resistBoxStart_price - supportBoxStart_price, position_span * botConfig.targetLoose); // resist_box_start_with_position_span
      isOrderPlaced && positionTmp["type"] == "LONG" && Mark(ctx, pricePoint(r_b_s_w_p_s, index), '#cccccc80', 1, 1);

      // exit for breackout
      if (
        point.o > r_b_s_w_p_s &&
        index > botConfig.leftValue &&
        // index < 390 && // botConfig.leftValue
        isOrderPlaced &&
        isBullishCandle &&
        positionTmp["type"] == "LONG"
      ) {
        // console.log("EXIT", yLow, index, point.c);
        EXIT()
        // N E W  R A N G E  O N  L O N G  C L O S E
        // if (point.o < resistBoxEnd_price) {
        resetRange += 1
        // }

      }

      // after sell take coming hl as resist
      // - 1 = close position
      // - 2 = found new hl
      // - offset = wait for exact index of hl / lh 
      if (resetRange == 1 && (hls[index] || lhs[index]) && breakout == 'await') resetRange += 1
      if (resetRange == 2 && breakout == 'await') offset += 1
      if (offset == botConfig.leftValueSmall && breakout == 'await') {
        resist[tradingRange]["x2"] = x;
        support[tradingRange]["x2"] = x;

        // tradingRange += 1;

        var newSupportFromLast_lhs = Math.min(...lhs_tmp.slice(-2)); // lowest value from lowerlows
        support[tradingRange] = pricePoint(newSupportFromLast_lhs, index);
        var newSupportFromLast_hls = Math.max(...hls_tmp.slice(-2)); // lowest value from higherlows
        resist[tradingRange] = pricePoint(newSupportFromLast_hls, index);

        // UPDATE Support Resist BOXES
        update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
        Text(ctx, "new range on sell", x, 130, 'pink');

        // new low
        // var last_lhs = lhs_tmp.slice(-3)
        // var newSupportFromLast_lhs_avg = last_lhs.reduce((a, b)=> a+b, 0)/last_lhs.length; // avrg value from higherlows
        // support[tradingRange] = pricePoint(newSupportFromLast_lhs_avg, index);

        // var last_hls = hls_tmp.slice(-3)
        // var newResistFromLast_hls_avg = last_hls.reduce((a, b)=> a+b, 0)/last_hls.length; // avrg value from higherlows
        // resist[tradingRange] = pricePoint(newResistFromLast_hls_avg, index);
        // Mark(ctx, pricePoint(newResistFromLast_hls_avg, index), 'yellow', candleWidth, 4);
        // update_support_resist(support[tradingRange]["price"],resist[tradingRange]["price"])

        resetRange = 0
        offset = 0
      }
      // ///////////////////////////////////////////////////////////////////////////////////////////
      // ///////////////////////////////////////////////////////////////////////////////////////////
      // ///////////////////////////////////   S H O R T   /////////////////////////////////////////
      // ///////////////////////////////////////////////////////////////////////////////////////////
      // ///////////////////////////////////////////////////////////////////////////////////////////

      var or_high = index > 1 ? data[index - 1]["h"] > resistBoxStart_price : false;

      // E N T E R SHORT - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      if (
        (point.o > resistBoxStart_price || or_high) &&
        index > botConfig.leftValue &&
        !isOrderPlaced &&
        breakout == "await" &&
        !isHolyday &&
        spread > 0.5
        // && false
      ) {
        ENTRY('SHORT')
        Text(ctx, "S-normal", x, 100, 'blue');
      }


      // E X I T SHORT- - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      var short_r_b_s_w_p_s =
        supportBoxStart_price +
        calculatePercentage(resistBoxStart_price - supportBoxStart_price, position_span * botConfig.targetLoose); // resist_box_start_with_position_span
      isOrderPlaced && positionTmp["type"] == "SHORT" && Mark(ctx, pricePoint(short_r_b_s_w_p_s, index), '#cccccc40', 1, 1);
      if (
        point.o < short_r_b_s_w_p_s &&
        // (point.o < short_r_b_s_w_p_s || data[index - 1]["c"] < short_r_b_s_w_p_s) &&
        index > botConfig.leftValue &&
        isOrderPlaced &&
        !isBullishCandle &&
        positionTmp["type"] == "SHORT"
      ) {
        EXIT()

        // N E W  R A N G E  O N  S H O R T  C L O S E
        // if (point.o < resistBoxEnd_price) {
        //   resetRange += 1
        // }

        resist[tradingRange]["x2"] = x;
        support[tradingRange]["x2"] = x;
        // tradingRange += 1;

        // var newSupportFromLast_lhs = Math.min(...lhs_tmp.slice(-2)); // lowest value from lowerlows
        // support[tradingRange] = pricePoint(newSupportFromLast_lhs, index);
        // var newSupportFromLast_hls = Math.max(...hls_tmp.slice(-2)); // lowest value from higherlows
        // resist[tradingRange] = pricePoint(newSupportFromLast_hls, index);

        // // UPDATE Support Resist BOXES
        // update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])

        // PALCE ORDER WHEN LONG CLOSE
        // new inversal trade
        // ENTRY()
        // Text(ctx, "L-invert", x, 100, 'blue');
      }

      // postion span calc
      if (isOrderPlaced) position_span += 1;

      // Mark(ctx, pricePoint(point.o, index), '#ffffff' + 10, candleWidth, 4);

      // // High Low shadow
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.strokeStyle = point.o <= point.c ? isHolyday ? upColor + 40 : upColor : isHolyday ? downColor + 40 : downColor;
      ctx.stroke();

      // Open Close body
      ctx.fillStyle = point.o <= point.c ? isHolyday ? upColor + 40 : upColor : isHolyday ? downColor + 40 : downColor;
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
    0 && support.forEach((s_or_r, idx) => {
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
      // const fee_entry = calculateFee(INVEST, LEVERAGE, FEE);
      // const fee_exit = calculateFee(exit_size, LEVERAGE, FEE);

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
