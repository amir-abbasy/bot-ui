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
    var rangeResizeCount = 1;
    var supportTouches = 0;
    var resistTouches = 0;
    var resetRange = 0
    var offset = 0
    var breakoutBullishOffset = 0
    var breakoutBearishOffset = 0
    var edgePrice = 0
    var trailing = false

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
        // log("ENTRY "+type, yLow, index, cand.o);
        positionTmp["entryPrice"] = cand.o;
        positionTmp["x1"] = x;
        positionTmp["y1"] = yOpen;
        positionTmp["type"] = type;
        isOrderPlaced = true;
      }
      function EXIT() {
        // log("EXIT", yLow, index, cand.o);
        positionTmp["exitPrice"] = cand.o;
        positionTmp["x2"] = x;
        positionTmp["y2"] = yOpen;
        positions.push(positionTmp);
        positionTmp = {};
        isOrderPlaced = false;
        position_span = 0;
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
        // Reset higher low and lower high
        hl = [];
        lh = [];
        // log({ supportTouches, resistTouches });
        supportTouches = 0;
        resistTouches = 0;
        edgePrice = cand.o
        // E X I T - - - on breakout - - -
        // if (isOrderPlaced && !isBullishCandle && positionTmp["type"] == "LONG") EXIT()
        if (isOrderPlaced && positionTmp["type"] == "LONG") EXIT()
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
        //  Reset higher low and lower high
        hl = [];
        lh = [];
        // log({ supportTouches, resistTouches });
        supportTouches = 0;
        resistTouches = 0;
        edgePrice = cand.o
        // E X I T STOP LOSS SHORT  - - - on breakout - - -
        // if (isOrderPlaced && isBullishCandle && positionTmp["type"] == "SHORT") EXIT()
        if (isOrderPlaced && positionTmp["type"] == "SHORT") EXIT()
      }

      // index > 310 && index < 350 && log(index, edgePrice, breakout, cand.o);


      if (breakout == "bullish") {
        edgePrice = cand.o > edgePrice ? cand.o : edgePrice



        if (!isOrderPlaced) {
          ENTRY()
          Text(ctx, "entery br", x, priceCandle(resistBoxEnd_price, index)['y1'] - 50);
        }

        // TRAILING EXIT
        const priceChange = percentageChange(positionTmp['entryPrice'], cand.o) // %
        if (priceChange > .10 && isOrderPlaced) {
          trailing = true
        }


        if (trailing) {

          const trailingDiff = percentageChange(edgePrice, cand.o) // %
          // Mark(ctx, priceCandle(cand.o, index), 'orange', 10, 10)

          index == data.length - 1 && console.log(trailingDiff, -.10 > trailingDiff);
          if (-.20 > trailingDiff) { // %
        

            //  R E V E R S A L
            if (cand.o < resistBoxEnd_price) {
              // fake breakout
              if (hls[index]) {
                // index > 160 &&  index < 180 && log();
                Text(ctx, "RV-F", x, priceCandle(resistBoxEnd_price, index)['y1'] + 20, 'yellow');
                resist[tradingRange] = priceCandle(hls[index], index);
                update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
                
                Mark(ctx, priceCandle(cand.o, index), '#cccccc', 10, 10)
                EXIT()
                trailing = false
                edgePrice = cand.o
                breakout = 'await'
              }
            } else {

              Mark(ctx, priceCandle(cand.o, index), '#cccccc', 10, 10)
              EXIT()

              tradingRange += 1;
              support[tradingRange] = priceCandle(resist[tradingRange - 1]["price"], index);
              resist[tradingRange] = priceCandle(edgePrice, index);

              // diff_price = resist[tradingRange - 1]["price"] - support[tradingRange - 1]["price"];
              // supportResistArea_price = calculatePercentage(diff_price, botConfig.S_R_Area);

              // UPDATE Support Resist BOXES to last range
              update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])

              // reset breakout to await
              trailing = false
              edgePrice = cand.o
              breakout = 'await'
            }





          }
        }

      }


      if (breakout == "bearish") {
        edgePrice = cand.o < edgePrice ? cand.o : edgePrice


        // if (cand.o > resistBoxEnd_price) {
        //   Text(ctx, "RV-L", x, priceCandle(supportBoxEnd_price, index)['y1'] + 20, 'yellow');
        //   update_support_resist(support[tradingRange - 1]["price"], resist[tradingRange - 1]["price"])
        //   breakout = 'await'
        //   resetRange = 0
        //   breakoutBearishOffset = 0
        // }



        if (!isOrderPlaced) {
          ENTRY("SHORT")
          Text(ctx, "entery br s", x, priceCandle(resistBoxEnd_price, index)['y1'] - 50);
        }

        // TRAILING EXIT
        const priceChange = percentageChange(positionTmp['entryPrice'], cand.o) // %
        log(priceChange)
        if (priceChange > -.10 && isOrderPlaced) {
          trailing = true
        }


        if (trailing) {

          const trailingDiff = percentageChange(edgePrice, cand.o) // %
          // Mark(ctx, priceCandle(cand.o, index), 'orange', 10, 10)

          index == data.length - 1 && console.log(trailingDiff, -.10 > trailingDiff);
          if (-.20 > trailingDiff) { // %
            Mark(ctx, priceCandle(cand.o, index), '#cccccc', 10, 10)
            EXIT()

            tradingRange += 1;
            support[tradingRange] = priceCandle(resist[tradingRange - 1]["price"], index);
            resist[tradingRange] = priceCandle(edgePrice, index);

            // diff_price = resist[tradingRange - 1]["price"] - support[tradingRange - 1]["price"];
            // supportResistArea_price = calculatePercentage(diff_price, botConfig.S_R_Area);

            // UPDATE Support Resist BOXES to last range
            update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])

            // reset breakout to await
            trailing = false
            edgePrice = cand.o
            breakout = 'await'

          }
        }


      }


      // postion span calc
      if (isOrderPlaced) position_span += 1;

      // Mark(ctx, priceCandle(cand.o, index), '#ffffff' + 10, candleWidth, 4);

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
