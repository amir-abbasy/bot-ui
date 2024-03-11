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
  log
} from "./_fun/helpers";
import botConfig from "./botConfig";

const upColor = "#089981";
const downColor = "#f23645";
const bgColor = "#161a25";
const logStartIndex = 0

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
    const numDatacands = data.length;
    // const candleWidth = (chartWidth - padding * 2) / numDatacands;
    const candleWidth = 10;
    const maxPrice = Math.max(...data.map((cand) => cand.h));
    const minPrice = Math.min(...data.map((cand) => cand.l));
    const priceRange = maxPrice - minPrice;

    // D R A W   V A R S
    const priceCandle = (price, x) => ({
      price,
      x1: padding + x * candleWidth,
      y1: padding + (1 - (price - minPrice) / priceRange) * chartHeight,
      x2: padding + numDatacands * candleWidth,
      y2: padding + (1 - (price - minPrice) / priceRange) * chartHeight,
    });
    var resist = [priceCandle(initialResist, initalRangeStart)];
    var support = [priceCandle(initialSupport, initalRangeStart)];

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
    var awaitLength = 0;
    var supportTouches = 0;
    var resistTouches = 0;
    var resetRange = 0
    var offset = 0
    var edgePrice = 0
    var trailing = false
    let events = [];


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
    data.forEach((cand, index) => {
      const x = padding + index * candleWidth;
      const yHigh = padding + (1 - (cand.h - minPrice) / priceRange) * chartHeight;
      const yLow = padding + (1 - (cand.l - minPrice) / priceRange) * chartHeight;
      const yOpen = padding + (1 - (cand.o - minPrice) / priceRange) * chartHeight;
      const yClose = padding + (1 - (cand.c - minPrice) / priceRange) * chartHeight;

      const spread = percentageChange(support[tradingRange]?.["price"], resist[tradingRange]["price"]);

      const hls_tmp = hls.slice(0, index).filter((_) => _);
      const lhs_tmp = lhs.slice(0, index).filter((_) => _);
      // Mark(ctx,priceCandle(hls_tmp[hls_tmp.length - 1], index),"#cccccc30",4,1);
      // Mark(ctx,priceCandle(lhs_tmp[lhs_tmp.length - 1], index),"#cccccc30",4,1);
      function ENTRY(type = "LONG") {
        if (isOrderPlaced) return
        // log("ENTRY "+type, yLow, index, cand.o);
        positionTmp["entryPrice"] = cand.o;
        positionTmp["x1"] = x;
        positionTmp["y1"] = yOpen;
        positionTmp["type"] = type;
        isOrderPlaced = true;
      }
      function EXIT() {
        if (!isOrderPlaced) return
        // log("EXIT", yLow, index, cand.o);
        positionTmp["exitPrice"] = cand.o;
        positionTmp["x2"] = x;
        positionTmp["y2"] = yOpen;
        positions.push(positionTmp);
        positionTmp = {};
        isOrderPlaced = false;
        position_span = 0;
      }

      function _emit(datalog) {
        if (index > logStartIndex) {
          events.push(index + " - " + datalog)
        }
      }

      var day = new Date(cand["t"]).getDay();
      var isHolyday = day == 5 || day == 6; // SAT, SUN
      // if (isHolyday) Mark(ctx, { x1: x, y1: 30 }, "yellow", 4, 1)
      // S & R
      Mark(ctx, priceCandle(resistBoxEnd_price, index), upColor + 40, candleWidth, 1);
      Mark(ctx, priceCandle(resistBoxStart_price, index), upColor + 90, candleWidth, 1);
      Mark(ctx, priceCandle(supportBoxStart_price, index), downColor + 90, candleWidth, 1);
      Mark(ctx, priceCandle(supportBoxEnd_price, index), downColor + 40, candleWidth, 1);

      // drawRect(ctx, { x1: x, y1: resistBoxStart, w: 10, h: resistBoxEnd-resistBoxStart }, upColor+20);

      // breakout
      if (breakout == 'bullish') Mark(ctx, { x1: x, y1: 30 }, "green", 4, 1)
      if (breakout == 'bearish') Mark(ctx, { x1: x, y1: 30 }, "red", 4, 1)
      if (breakout == 'await') Mark(ctx, { x1: x, y1: 30 }, "#cccccc50", 4, 1)

      var isBullishCandle = index > 2 ? (cand.o < data[index - 1]["o"] && data[index - 2]["o"] > cand.o) : false;

      // A N A L A Y S
      // BREAKOUT BEARISH ------------------------------------------------------------------
      if (cand.o < supportBoxEnd_price && breakout == "await" && index > initalRangeStart) {
        // log(index, "------> BREAKOUT BEARISH");
        // trim support and resist
        resist[tradingRange]["x2"] = x;
        support[tradingRange]["x2"] = x;
        breakout = "bearish";
        Text(ctx, "BR", x, priceCandle(resistBoxEnd_price, index)['y1'], 'red');
        _emit("Bearish breakout")
        // Reset higher low and lower high
        hl = [];
        lh = [];
        // log({ supportTouches, resistTouches });
        supportTouches = 0;
        resistTouches = 0;
        edgePrice = cand.o
        // E X I T - - - on breakout - - -
        // if (isOrderPlaced && !isBullishCandle && positionTmp["type"] == "LONG") EXIT()
        if (positionTmp["type"] == "LONG") {
          _emit("order exit on bearish breakout")
          EXIT()
        }
        ENTRY("SHORT") //absy
      } else if (
        cand.o > resistBoxEnd_price &&
        breakout == "await" &&
        index > initalRangeStart
      ) {
        // BREAKOUT BULLISH ------------------------------------------------------------------
        // log(index, "------> BREAKOUT BULLISH");
        resist[tradingRange]["x2"] = x;
        support[tradingRange]["x2"] = x;
        breakout = "bullish";
        Text(ctx, "BR", x, priceCandle(resistBoxEnd_price, index)['y1'], 'green');
        _emit("Bullish breakout")
        //  Reset higher low and lower high
        hl = [];
        lh = [];
        // log({ supportTouches, resistTouches });
        supportTouches = 0;
        resistTouches = 0;
        edgePrice = cand.o
        // E X I T STOP LOSS SHORT  - - - on breakout - - -
        // if (isOrderPlaced && isBullishCandle && positionTmp["type"] == "SHORT") EXIT()
        if (positionTmp["type"] == "SHORT") {
          _emit("order exit on pullish breakout")
          EXIT()
        }
        ENTRY()
      }

      // await

      if (breakout == 'await') {
        awaitLength = +1
      } else {
        awaitLength = 0
      }















      // logic


















      // BULLISH
      // index == data.length - 1 && log("--------", percentageChange(resistBoxEnd_price, edgePrice));


      if (breakout == "bullish") {
        edgePrice = cand.o > edgePrice ? cand.o : edgePrice


        //  R E V E R S A L
        var fakebreakout = false

        let breakoutHeight = percentageChange(resistBoxEnd_price, edgePrice)
        if (cand.o < resistBoxEnd_price && breakoutHeight < 0.5) {
          if (cand.o < resist[tradingRange]['price']) {
            index == data.length - 1 && log("-----breakout depth----", index, breakoutHeight)
            Text(ctx, "RV-F", x, priceCandle(resistBoxEnd_price, index)['y1'] + 20, 'yellow');
            _emit("fake Bullish break out,  reversed ")
            resist[tradingRange] = priceCandle(edgePrice, index);
            update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
            fakebreakout = true
            breakout = 'await'
            EXIT()
          }
        }


        // TRAILING EXIT
        const priceChange = percentageChange(positionTmp['entryPrice'], cand.o) // %
        if (priceChange > .10 && isOrderPlaced) {
          trailing = true
        }

        if (trailing) {
          const trailingDiff = percentageChange(edgePrice, cand.o) // %
          // Mark(ctx, priceCandle(cand.o, index), 'orange', 10, 10)

          // index == data.length - 1 && console.log(trailingDiff, -.10 > trailingDiff);
          if (-1 > trailingDiff) { // %
            Mark(ctx, priceCandle(cand.o, index), '#cccccc', 10, 10)
            EXIT()
            _emit("exit - trailing stop match")


            if (!fakebreakout) {
              tradingRange += 1;
              support[tradingRange] = priceCandle(resist[tradingRange - 1]["price"], index);
              resist[tradingRange] = priceCandle(edgePrice, index);
              // diff_price = resist[tradingRange - 1]["price"] - support[tradingRange - 1]["price"];
              // supportResistArea_price = calculatePercentage(diff_price, botConfig.S_R_Area);

              // UPDATE Support Resist BOXES to last range
              update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
              _emit("+ range - support: last support, resist: last edgePrice . after trailing stop exit")
            }
            // reset breakout to await
            trailing = false
            // edgePrice = cand.o 
            breakout = 'await'
          }
        }

      }



      // BEARISH
      // index == data.length - 1 && log("--------", edgePrice);

      if (breakout == "bearish") {
        edgePrice = cand.o < edgePrice ? cand.o : edgePrice


        if (cand.o > resistBoxEnd_price) {
          Text(ctx, "RV-L", x, priceCandle(supportBoxEnd_price, index)['y1'] + 20, 'yellow');
          _emit("reversed fake bearish breakout")
          update_support_resist(support[tradingRange - 1]["price"], resist[tradingRange - 1]["price"])
          _emit("+ range - to last range")
          breakout = 'await'
          resetRange = 0
        }

        
        // TRAILING EXIT
        const priceChange = percentageChange(positionTmp['entryPrice'], cand.o) // %
        if (-.10 > priceChange && isOrderPlaced) {
          trailing = true
        }



        if (trailing) {
          const trailingDiff = percentageChange(cand.o, edgePrice) // %
          // Mark(ctx, priceCandle(cand.o, index), 'orange', 10, 10)

          index == data.length - 1 && log("--------", trailingDiff, -1 > trailingDiff);


          //   // index == data.length - 1 && console.log(trailingDiff, -.10 > trailingDiff);
          if (-1.3 > trailingDiff) { // %
            Mark(ctx, priceCandle(cand.o, index), '#cccccc', 10, 10)
            EXIT()
            _emit("exit - trailing stop match")

            // if (!fakebreakout) {
            tradingRange += 1;
            support[tradingRange] = priceCandle(edgePrice, index);
            resist[tradingRange] = priceCandle(support[tradingRange - 1]["price"], index);
            // diff_price = resist[tradingRange - 1]["price"] - support[tradingRange - 1]["price"];
            // supportResistArea_price = calculatePercentage(diff_price, botConfig.S_R_Area);

            // UPDATE Support Resist BOXES to last range
            update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
            _emit("+ range - support: last support, resist: last edgePrice . after trailing stop exit")
            // }

            //  reset breakout to await
            trailing = false
            // edgePrice = cand.o 
            breakout = 'await'
          }
        }



      }





      // trade



      // E N T E R LONG - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      var isCandleBearish = index > 1 ? data[index - 1]["c"] > cand.o : false;
      var or_low = index > 1 ? data[index - 1]["l"] < supportBoxStart_price : false;

      if (
        (cand.o < supportBoxStart_price || or_low) &&
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
        resetRange = 0
        Text(ctx, "LONG", x, 100, 'blue');
        _emit("LONG")
      }

      // E X I T LONG- - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      var r_b_s_w_p_s =
        resistBoxStart_price -
        calculatePercentage(resistBoxStart_price - supportBoxStart_price, position_span * botConfig.targetLoose); // resist_box_start_with_position_span
      isOrderPlaced && positionTmp["type"] == "LONG" && Mark(ctx, priceCandle(r_b_s_w_p_s, index), '#cccccc80', 1, 1);

      // exit for breackout
      if (
        (cand.o > r_b_s_w_p_s || data[index - 1]?.['c'] > r_b_s_w_p_s) &&
        index > botConfig.leftValue &&
        // index < 390 && // botConfig.leftValue
        isOrderPlaced &&
        isBullishCandle &&
        breakout == 'await' &&
        positionTmp["type"] == "LONG"
      ) {
        // log("EXIT", yLow, index, cand.c);
        Text(ctx, "LONG EXIT", x, 100, 'blue');
        EXIT()
        _emit("LONG EXIT")
        // N E W  R A N G E  O N  L O N G  C L O S E
        // if (cand.o < resistBoxEnd_price) {
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
        support[tradingRange] = priceCandle(newSupportFromLast_lhs, index);
        var newSupportFromLast_hls = Math.max(...hls_tmp.slice(-2)); // lowest value from higherlows
        resist[tradingRange] = priceCandle(newSupportFromLast_hls, index);

        // UPDATE Support Resist BOXES
        update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
        Text(ctx, "new range on sell", x, 130, 'pink');
        _emit("+ range - new range on sell")


        resetRange = 0
        offset = 0
      }

      // ///////////////////////////////////////////////////////////////////////////////////////////
      // ///////////////////////////////////   S H O R T   /////////////////////////////////////////
      // ///////////////////////////////////////////////////////////////////////////////////////////

      var or_high = index > 1 ? data[index - 1]["h"] > resistBoxStart_price : false;

      // E N T E R SHORT - - - - - - - - - - - - - - - - - - - - - - - - - - - -

      if (
        (cand.o > resistBoxStart_price || or_high) &&
        cand.o < resistBoxEnd_price &&
        index > botConfig.leftValue &&
        !isOrderPlaced &&
        breakout == "await" &&
        !isHolyday &&
        spread > 1
        // && false
      ) {
        ENTRY('SHORT')
        resetRange = 0
        Text(ctx, "SHORT", x, 100, 'blue');
        _emit("SHORT")
      }


      // E X I T SHORT- - - - - - - - - - - - - - - - - - - - - - - - - - - - -
      var short_r_b_s_w_p_s =
        supportBoxStart_price +
        calculatePercentage(resistBoxStart_price - supportBoxStart_price, position_span * botConfig.targetLoose); // resist_box_start_with_position_span
      isOrderPlaced && positionTmp["type"] == "SHORT" && Mark(ctx, priceCandle(short_r_b_s_w_p_s, index), '#cccccc40', 1, 1);

      // index > 322 && index < 331 && log(index, breakout, isOrderPlaced);

      if (
        cand.o < short_r_b_s_w_p_s &&
        // (cand.o < short_r_b_s_w_p_s || data[index - 1]["c"] < short_r_b_s_w_p_s) &&
        index > botConfig.leftValue &&
        isOrderPlaced &&
        breakout == "await" &&
        !isBullishCandle &&
        positionTmp["type"] == "SHORT"
      ) {
        EXIT()
        Text(ctx, "SHORT EXIT", x, 100, 'blue');
        _emit("SHORT EXIT")
        // N E W  R A N G E  O N  S H O R T  C L O S E
        resist[tradingRange]["x2"] = x;
        support[tradingRange]["x2"] = x;
      }


      // if (cand.o < resistBoxEnd_price && breakout == 'bullish') {
      if (cand.o < resist[tradingRange]['price'] && breakout == 'awaits') {
        Mark(ctx, priceCandle(edgePrice, index), 'pink', 10, 10);
        Text(ctx, "RV", x, 200, 'yellow');
        _emit("REVRSED from bullish breakout")
        breakout = 'await'
        resist[tradingRange] = priceCandle(edgePrice, index);
        update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
        _emit("+ range - resist: edge price")
      }


      if (cand.o > supportBoxEnd_price && breakout == 'bearish') {
        Mark(ctx, priceCandle(edgePrice, index), 'yellow', 10, 10);
        // Text(ctx, "RV", x, 200, 'yellow');
        breakout = 'await'
        support[tradingRange] = priceCandle(edgePrice, index);
        update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
        _emit("+ range - support: edge price")
      }


      // postion span calc
      if (isOrderPlaced) position_span += 1;

      // Mark(ctx, priceCandle(cand.o, index), '#ffffff' + 10, candleWidth, 4);










      // draw
























































      // // High Low shadow
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.strokeStyle = cand.o <= cand.c ? isHolyday ? upColor + 40 : upColor : isHolyday ? downColor + 40 : downColor;
      ctx.stroke();

      // Open Close body
      ctx.fillStyle = cand.o <= cand.c ? isHolyday ? upColor + 40 : upColor : isHolyday ? downColor + 40 : downColor;
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
        hl.push({ index, x, yClose, cand }); // 🔴
      }
      // LH 10
      if (lhs[index]) {
        ctx.fillStyle = downColor;
        ctx.fillRect(x, yClose, 15, 15);
        lh.push({ index, x, yClose, cand }); // 🔴
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
      // log(support[idx]);
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
      //   // log("SHORT", position);
      // }
    });
    console.log("::", events.at(-1));
    console.log("events:::", events);
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
