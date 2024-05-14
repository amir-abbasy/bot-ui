import React, { useEffect, useRef, useState } from "react";
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
  log,
  calculateRSI,
  calculateSMA
} from "./_fun/helpers";
import botConfig from "./botConfig";
import { useStore } from "./store.jsx";

const upColor = "#089981";
const downColor = "#f23645";
const bgColor = "#161a25";
const logStartIndex = 0

const candleWidth = 10;
const padding = 5;


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
  const { setActiveCand, setEvent } = useStore()


  const handleMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const index = Math.floor(mouseX / (candleWidth - .895)); // Assuming candlestick width is 10px with 5px spacing
    if (data[index]) {
      setActiveCand({ index, cand: data[index], pos: { x: index, y: e.clientY } })
    }
  };

  const handleMouseOut = () => {
    setActiveCand(null);
  };




  const drawCandlestickChart = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const canvasBox = canvas.getBoundingClientRect();

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Replace these values with your desired dimensions
    const chartWidth = window.innerWidth;
    const chartHeight = canvasBox.height // window.innerHeight;

    // Calculate candlestick dimensions
    const numDatacands = data.length;
    // const candleWidth = (chartWidth - padding * 2) / numDatacands;
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
    var hlOffset = 0;
    var lhOffset = 0;
    var position_span = 0;
    var awaitLength = 0;
    var resetRange = 0
    var reset = false
    var edgePrice = 0
    var trailing = false
    let events = [];


    var diff = support[tradingRange]["y1"] - resist[tradingRange]["y1"];
    var supportResistArea = calculatePercentage(diff, botConfig.S_R_Area);
    resist[tradingRange]["diff"] = diff;
    support[tradingRange]["diff"] = diff;
    var resistBoxStart_plot = resist[tradingRange]["y1"] + supportResistArea / 2;
    var resistBoxEnd_plot = resist[tradingRange]["y1"] - supportResistArea / 2;
    var supportBoxStart_plot = support[tradingRange]["y1"] - supportResistArea / 2;
    var supportBoxEnd_plot = support[tradingRange]["y1"] + supportResistArea / 2;

    var diff = resist[tradingRange]["price"] - support[tradingRange]["price"];
    var supportResistArea = calculatePercentage(diff, botConfig.S_R_Area);
    var resistBoxStart = resist[tradingRange]["price"] - supportResistArea / 2;
    var resistBoxEnd = resist[tradingRange]["price"] + supportResistArea / 2;
    var supportBoxStart = support[tradingRange]["price"] + supportResistArea / 2;
    var supportBoxEnd = support[tradingRange]["price"] - supportResistArea / 2;

    // ctx.fillRect(500, supportBoxEnd - 5, 10, 10); // position finder

    function update_support_resist(support, resist, invert = false) {
      diff = resist - support
      supportResistArea = calculatePercentage(diff, botConfig.S_R_Area);
      resistBoxStart = resist - supportResistArea / 2;
      resistBoxEnd = resist + supportResistArea / 2;
      supportBoxStart = support + supportResistArea / 2;
      supportBoxEnd = support - supportResistArea / 2;
    }

    // const prices = data.map(_ => _.o)

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

      function _emit(datalog) {
        if (index > logStartIndex) {
          events.push(index + " - " + datalog)
          setEvent(datalog)
        }
      }

      var day = new Date(cand["t"]).getDay();
      var isHolyday = false // day == 5 || day == 6; // SAT, SUN
      // if (isHolyday) Mark(ctx, { x1: x, y1: 30 }, "yellow", 4, 1)
      // S & R
      Mark(ctx, priceCandle(resistBoxEnd, index), upColor + 40, candleWidth, 1);
      Mark(ctx, priceCandle(resistBoxStart, index), upColor + 90, candleWidth, 1);
      Mark(ctx, priceCandle(supportBoxStart, index), downColor + 90, candleWidth, 1);
      Mark(ctx, priceCandle(supportBoxEnd, index), downColor + 40, candleWidth, 1);

      // drawRect(ctx, { x1: x, y1: resistBoxStart, w: 10, h: resistBoxEnd-resistBoxStart }, upColor+20);

      // breakout
      if (breakout == 'bullish') Mark(ctx, { x1: x, y1: 30 }, "green", 4, 1)
      if (breakout == 'bearish') Mark(ctx, { x1: x, y1: 30 }, "red", 4, 1)
      if (breakout == 'await') Mark(ctx, { x1: x, y1: 30 }, "#cccccc50", 4, 1)

      console.log(cand.o, supportBoxEnd);
      if (cand.c < supportBoxEnd) {
        console.log('break out');
        
        // support[tradingRange] = priceCandle(cand.c, index);
        // resist[tradingRange] = priceCandle(support[tradingRange - 1]["price"], index);
        // UPDATE Support Resist BOXES to last range
        // update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
        // UPDATE Support Resist BOXES
        // update_support_resist(support[tradingRange]["price"], resist[tradingRange]["price"])
        // _emit("test")
      }








      // logic










      // BULLISH





      // BEARISH



      // trade



























      // // High Low shadow
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.strokeStyle = cand.o <= cand.c ? isHolyday ? upColor + 40 : upColor : isHolyday ? downColor + 40 : downColor;
      ctx.stroke();

      // Open Close body
      ctx.fillStyle = cand.o <= cand.c ? isHolyday ? upColor + 40 : upColor : isHolyday ? downColor + 40 : downColor;
      ctx.fillRect(x - 2.5, yOpen, candleWidth - padding, yClose - yOpen);

      // Add text elements
      // ctx.translate(x, 0);
      // ctx.font = "12px Arial";
      // ctx.fillStyle = "#ffffff20";
      // X-axis label
      // ctx.fillText(index, x - 2.5, yOpen - 400);

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

  return (<>

    <canvas
      ref={canvasRef}
      width={window.innerWidth * 20}
      height={window.innerHeight}
      style={{
        backgroundColor: bgColor,
      }}
      onMouseMove={handleMouseMove}
      onMouseOut={handleMouseOut}
    />
  </>
  );
};

export default CustomCandlestickChart;