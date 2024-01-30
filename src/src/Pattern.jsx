import React, { useEffect, useRef } from "react";
import { drawTrendLine, drawTrendLineObj, drawPosition } from "./_fun/draw";
import { calculatePercentage } from "./_fun/helpers";
import botConfig from "./botConfig";
import HeadShoulders from "./pattern/HeadShoulders";
import TestPat from "./pattern/TestPat";
import { drawRect } from "./pattern/help";

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

const Pattern = ({
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
    const padding = botConfig.padding;
    const candleWidth = botConfig.candleWidth;

    // Calculate candlestick dimensions
    const numDataPoints = data.length;
    // const candleWidth = (chartWidth - padding * 2) / numDataPoints;
    const maxPrice = Math.max(...data.map((point) => point.h));
    const minPrice = Math.min(...data.map((point) => point.l));
    const priceRange = maxPrice - minPrice;

    // D R A W   V A R S
    const pricePoint = (price, x) => ({
      price,
      x1: padding + x * candleWidth,
      y1: padding + (1 - (price - minPrice) / priceRange) * chartHeight,
      x2: padding + numDataPoints*candleWidth,
      y2: padding + (1 - (price - minPrice) / priceRange) * chartHeight,
    });

    // S T R A T E G Y   V A R S
    let hh = [];
    let ll = [];
    let hl = []; // on trading range
    let lh = []; // on trading range

    // ctx.fillRect(500, supportBoxEnd - 5, 10, 10); // position finder

    const hhllCombine = [];
    hls.map((_, idx) => {
      if (hls[idx]) hhllCombine.push({ idx, close: hls[idx], chPoint: pricePoint(hls[idx], idx) });
      if (lhs[idx]) hhllCombine.push({ idx, close: lhs[idx], chPoint: pricePoint(lhs[idx], idx) });
    });
    // console.log("hhllCombine",hhllCombine);

    // Draw the candlestick chart
    data.forEach((point, index) => {
      const x = padding + index * candleWidth;
      const yHigh = padding + (1 - (point.h - minPrice) / priceRange) * chartHeight;
      const yLow = padding + (1 - (point.l - minPrice) / priceRange) * chartHeight;
      const yOpen = padding + (1 - (point.o - minPrice) / priceRange) * chartHeight;
      const yClose = padding + (1 - (point.c - minPrice) / priceRange) * chartHeight;
      const pos = { x, yHigh, yLow, yOpen, yClose, point, index };
      ctx.pos = pos
      var shape = TestPat(ctx, hhllCombine)
      shape && console.log(x, shape);

      return;


      // D R A W

      // if(index == 30){
      //   const headShoulders = TestPat(
      //     ctx,
      //     [294, 29415, 29490, 29420, 29480, 29440, 29520, 29445, 29480, 29445]
      //     );
      //   }
      // if (headShoulders || index > 60) {
      //   return;
      // }

      return;

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
    }); // END CANDLE LOOP

    hhllCombine.forEach((loc, idx)=>{
    var _ = hhllCombine
    if(idx==0)return
    const x2 = padding + _[idx]['idx'] * candleWidth;
    drawTrendLine(ctx, [_[idx-1]['chPoint']['x1'], 
    _[idx-1]['chPoint']['y1'], x2,
    _[idx]['chPoint']['y2']], 
    _[idx-1]['chPoint']['y1'] >
    _[idx]['chPoint']['y2'] ? '#00ff0070':'#ff000070');
   })

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

export default Pattern;
