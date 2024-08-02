import React, { useEffect, useRef, useState } from "react";
import {
  drawTrendLine,
  drawTrendLineObj,
  drawPosition,
  drawRect,
  Mark,
  Text,
  image
} from "./_fun/draw.js";
import {
  calculatePercentage,
  percentageChange,
  calculateFee,
  log,
  calculateRSI,
  transformData
} from "./_fun/helpers.js";
import botConfig from "./botConfig.js";
import { useStore } from "./store.jsx";
import StatusStore from './_fun/StatusStore.js'

import { isBullishKicker, isBearishKicker, isHammer, isBearishInvertedHammer } from "candlestick"



const upColor = "#089981";
const downColor = "#f23645";
const bgColor = "#161a25";
const logStartIndex = 0

const candleWidth = 6;
const padding = 2;




const CustomCandlestickChart = ({
  data,
  hhs,
  lls,
  hls,
  lhs,
  initalRangeStart,
  initialResist,
  initialSupport,
  hls10,
  lhs10
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
    let hl_ = []; // on trading range
    let lh_ = []; // on trading range
    let hl_temp_ = [];
    let lh_temp_ = [];
    let hl10_ = []
    let lh10_ = []
    let range_start = 0 // index
    var position_span = 0;
    var edgePrice = 0
    var trailing = false
    // var status = []
    var Status = new StatusStore()
    var strong_support = false
    var strong_resist = false


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

      Status.remove('bullish')
      Status.remove('bearish')
    }

    // const prices = data.map(_ => _.o)


    // Draw the candlestick chart
    data.forEach((cand, index) => {
      if (index < 1) return
      const end = index == data.length - 1


      let hl = hl_.filter(_ => (_.index + botConfig.leftValueSmall) < index)
      let lh = lh_.filter(_ => (_.index + botConfig.leftValueSmall) < index)
      let hl10 = hl10_.filter(_ => (_.index + 10) < index)
      let lh10 = lh10_.filter(_ => (_.index + 10) < index)

      let hl_last = hl.filter(_ => _.index > range_start) // breakout area
      let lh_last = lh.filter(_ => _.index > range_start) // breakout area
      let hl_temp = hl_temp_.filter(_ => (_.index + botConfig.leftValueSmall) < index); // position area
      let lh_temp = lh_temp_.filter(_ => (_.index + botConfig.leftValueSmall) < index); // position area

      let hl10_last = hl10.filter(_ => _.index > range_start) // breakout area
      let lh10_last = lh10.filter(_ => _.index > range_start) // breakout area

      const middle = support[tradingRange]['price'] + (resist[tradingRange]['price'] - support[tradingRange]['price']) / 2
      const spread = percentageChange(support[tradingRange]?.["price"], resist[tradingRange]["price"]);
      var isBullishCand = data[index - 1]["c"] > data[index - 1]["o"]  // confirm exit



      const x = padding + index * candleWidth;
      const yHigh = padding + (1 - (cand.h - minPrice) / priceRange) * chartHeight;
      const yLow = padding + (1 - (cand.l - minPrice) / priceRange) * chartHeight;
      const yOpen = padding + (1 - (cand.o - minPrice) / priceRange) * chartHeight;
      const yClose = padding + (1 - (cand.c - minPrice) / priceRange) * chartHeight;


      var day = new Date(cand["t"]).getDay();
      // var isHolyday = hl.length < 2 || lh.length < 2 // day == 5 || day == 6; // SAT, SUN
      // var isHolyday = initalRangeStart + botConfig.leftValueSmall > index
      var isHolyday = 100 > index
      // if (isHolyday) Mark(ctx, { x1: x, y1: 30 }, "yellow", 4, 1)


      // find strong support and resist ****************************************************
      // var diffHeightView = Math.abs((priceCandle(resistBoxEnd, index)?.y1 - priceCandle(resistBoxStart, index)?.y2))
      var tolerance = .6
      // var diffHeight = Math.abs(resistBoxEnd - resistBoxStart) * tolerance
      var diffHeight = Math.abs((hl.at(-1)?.c - lh.at(-1)?.c) / 2) * tolerance
      var lastHlZoneStart = hl.at(-1)?.c + (diffHeight / 2)
      var lastHlZoneEnd =  hl.at(-1)?.c - (diffHeight / 2) 
      var lastLhZoneStart = lh.at(-1)?.c + (diffHeight / 2)
      var lastLhZoneEnd = lh.at(-1)?.c - (diffHeight / 2)
      var hls_in_last_HL_zone = hl.slice(-3).filter(({ c }) => c < lastHlZoneStart && c > lastHlZoneEnd) // strong resist if length > 1
      var hls_in_last_LH_zone = lh.slice(-3).filter(({ c }) => c < lastLhZoneStart && c > lastLhZoneEnd) // strong support if length > 1

      if (hls_in_last_HL_zone.length > 1) {
        strong_resist = hl.at(-1)?.c
        // breakout = 'await'
      }

      if (hls_in_last_LH_zone.length > 1) {
        strong_support = lh.at(-1)?.c
        // breakout = 'await'
      }

      Mark(ctx, priceCandle(lastHlZoneStart, index), upColor + 40, candleWidth, 1);
      Mark(ctx, priceCandle(lastHlZoneEnd, index), upColor + 40, candleWidth, 1);
      Mark(ctx, priceCandle(strong_resist, index), upColor, candleWidth, 2) // Last hl 

      Mark(ctx, priceCandle(lastLhZoneStart, index), downColor + 40, candleWidth, 1);
      Mark(ctx, priceCandle(lastLhZoneEnd, index), downColor + 40, candleWidth, 1);
      Mark(ctx, priceCandle(strong_support, index), downColor, candleWidth, 2) // Last hl 


      // var t =  Math.abs((cur - prev) / cur) * 100
      // ******* end ********

      // breakout
      if (breakout == 'bullish') Mark(ctx, { x1: x, y1: 30 }, "#00ff00", 4, 1)
      if (breakout == 'bearish') Mark(ctx, { x1: x, y1: 30 }, "#ff0000", 4, 1)
      if (breakout == 'await') Mark(ctx, { x1: x, y1: 30 }, "#cccccc50", 4, 1)
      index % 5 == 0 && Text(ctx, index, x, 10, '#cccccc50');

      edgePrice = edgePrice == 0 ? cand.o : edgePrice // set inital value


      // CANDLE PATTERN
      // const prevCand = transformData(data[index - 1])
      // const currCand = transformData(data[index])

      // var bullishKicker = isBullishKicker(prevCand, currCand)
      // // if (isHammer(prevCand, currCand)) {
      // if (isBearishInvertedHammer(currCand)) {
      //   console.log(index, "HAMMER");
      //   Mark(ctx, priceCandle(middle, index), 'skyblue', candleWidth, 1);
      // }


      function ENTRY(type = "LONG", tag = null) {
        // if (index < 300) return
        if (isHolyday) return
        if (isOrderPlaced) return
        positionTmp["entryPrice"] = cand.o;
        positionTmp["x1"] = x;
        positionTmp["y1"] = yOpen;
        positionTmp["type"] = type;
        isOrderPlaced = true;
        Text(ctx, tag ?? type, x, yOpen, 'white');
        _emit(tag)
      }

      function EXIT(tag = null, exitPrice = cand.o) {
        if (!isOrderPlaced) return
        positionTmp["exitPrice"] = exitPrice // cand.o ;
        positionTmp["x2"] = x;
        positionTmp["y2"] = priceCandle(exitPrice)?.y2 // yOpen;
        positions.push(positionTmp);
        positionTmp = {};
        isOrderPlaced = false;
        position_span = 0;
        tag && Text(ctx, tag, x, yOpen - 120, 'red');
        _emit(tag)
        hl_temp_ = []
        lh_temp_ = []

        Status.remove("crossed_down")
        Status.remove("crossed_up")
      }


      function _emit(datalog) {
        if (!datalog) return
        if (index > logStartIndex) {
          setEvent({ index, log: datalog })
        }
      }



      //  reversal
      if (breakout == 'bullish' && cand.o < lastHlZoneStart) {
        breakout = 'await'
        EXIT()
        image(ctx, 'return', x, yClose - 10)
      }
      if (breakout == 'bearish' && cand.o > lastLhZoneStart) {
        breakout = 'await'
        EXIT()
        image(ctx, 'return', x, yClose - 10)
      }



      // on position
      if (cand.o < lh.at(-1)?.c && positionTmp['type'] == 'LONG') {
        EXIT()
        // breakout = "await"
      }

      if (cand.o > hl.at(-1)?.c && positionTmp['type'] == 'SHORT') {
        EXIT()
        // breakout = "await"
      }




      // if ((cand.o < supportBoxEnd && data[index - 1]?.o < supportBoxEnd && data[index - 1]?.c < supportBoxEnd) && breakout == 'await' && !isHolyday) {
      if ((strong_support && cand.o < strong_support && cand.o < lastLhZoneEnd) && !isHolyday && breakout == 'await') {
        // if ((cand.o < supportBoxEnd) && breakout == 'await' && !isHolyday) {
        _emit('BEARISH breakout');
        breakout = "bearish"
        range_start = index
        // Text(ctx, 'bearish', x, priceCandle(lh_last.at(-1)?.c, index)['y1'], 'yellow');

        if (positionTmp["type"] != "SHORT") {
          // EXIT(undefined, supportBoxEnd)
          EXIT()
          ENTRY('SHORT', 'BRK-S')
          image(ctx, 'bearish', x, yClose + 10)
          // if (hl_temp.length == 0 || hl_temp.at(-1)?.c < middle) ENTRY('SHORT', 'breakout S')
        }
      }



      // if ((cand.o > resistBoxEnd && data[index - 1]?.o > resistBoxEnd && data[index - 1]?.c > resistBoxEnd) && breakout == 'await' && !isHolyday) {
      if ((strong_resist && cand.o > strong_resist && cand.o > lastHlZoneEnd) && breakout == 'await' && !isHolyday) {
        // if ((cand.o > resistBoxEnd) && breakout == 'await' && !isHolyday) {
        _emit('BULLISH breakout');
        breakout = "bullish"
        range_start = index
        // Text(ctx, 'bullish', x, priceCandle(lh_last.at(-1)?.c, index)['y1'], 'yellow');

        if (positionTmp["type"] != "LONG") {
          // EXIT(undefined, resistBoxEnd)
          EXIT()
          ENTRY(undefined, 'BRK')
          image(ctx, 'bullish', x, yClose + 10)

          // if (lh_temp.length == 0 || lh_temp.at(-1)?.c > middle) ENTRY(undefined, 'breakout L')
        }

      }




      if (isOrderPlaced) position_span += 1;




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

      if (hls[index]) {
        ctx.beginPath();
        ctx.arc(x, yClose, 6, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fillStyle = upColor;
        ctx.fill();
        hl_.push({ index, x, yClose, ...cand }); // 🔴
        hl_temp_.push({ index, x, yClose, ...cand });
      }

      if (lhs[index]) {
        ctx.beginPath();
        ctx.arc(x, yClose, 6, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fillStyle = downColor;
        ctx.fill();
        lh_.push({ index, x, yClose, ...cand }); // 🔴
        lh_temp_.push({ index, x, yClose, ...cand });
      }


      // HL/LH 10
      if (hls10[index]) {
        hl10_.push({ index, x, yClose, ...cand }); // 🔴

        ctx.beginPath();
        ctx.arc(x, yClose, 10, 0, 2 * Math.PI);
        ctx.stroke();
      }
      if (lhs10[index]) {
        lh10_.push({ index, x, yClose, ...cand }); // 🔴

        ctx.beginPath();
        ctx.arc(x, yClose, 10, 0, 2 * Math.PI);
        ctx.stroke();
      }


      // HH
      if (hhs[index]) {
        hh.push({ x, yClose }); // 
        ctx.beginPath();
        ctx.arc(x, yClose, 25, 0, 2 * Math.PI);
        ctx.stroke();
      }
      // LL
      if (lls[index]) {
        ll.push({ x, yClose }); // 
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
    var pnl = 0;
    positions.forEach((position, idx) => {
      // if (position["type"] == "LONG") {
      drawPosition(ctx, position, position["type"]);

      // RESULT BOX
      let INVEST = 10; // $60 = Rs-5000
      let LEVERAGE = 5; // x
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

      // if (pl > 3) return

      pnl += pl;

      ctx.font = "16px Arial";
      // entryPrice exitPrice
      ctx.fillStyle = pl < 0 ? "red" : "white";
      ctx.fillText(pl.toFixed(2), 20, (idx + 1) * 30);
      ctx.fillText("(" + diff.toFixed(2) + "%)", 70, (idx + 1) * 30);
      ctx.fillStyle = "#6f03fc";
      ctx.fillText(pnl.toFixed(2), 160, (idx + 1) * 30);
      // }

      // if (position["type"] == "SHORT") {
      //   // log("SHORT", position);
      // }
    });
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