import botConfig from "../botConfig";
import { calculatePercentage } from "./helpers";

const drawTrendLineObj = (ctx, obj, color = "blue") => {
  // Support Resist
  ctx.beginPath();
  ctx.moveTo(obj.x1, obj.y1);
  ctx.lineTo(obj.x2, obj.y2);
  ctx.strokeStyle = color;
  ctx.stroke();

  // Support Resist Area
  const supportResistArea = calculatePercentage(obj.diff, botConfig.S_R_Area);
  ctx.fillStyle = color + "20";
  ctx.fillRect(
    obj.x1,
    obj.y1 - supportResistArea / 2,
    obj.x2 - obj.x1,
    supportResistArea
  );
};

const drawPosition = (ctx, draw, type = "LONG") => {
  ctx.beginPath();
  ctx.moveTo(draw.x1, draw.y1);
  ctx.lineTo(draw.x2, draw.y2);
  ctx.strokeStyle =
    draw.y1 < draw.y2
      ? type == "LONG"
        ? "red"
        : "green"
      : type == "LONG"
      ? "green"
      : "red"; // "#6f03fc";
  // ctx.lineWidth = 4;
  ctx.stroke();
};

const drawTrendLine = (ctx, draw, color = "blue") => {
  ctx.beginPath();
  ctx.moveTo(draw[0], draw[1]);
  ctx.lineTo(draw[2], draw[3]);
  ctx.strokeStyle = color;
  ctx.stroke();
};

const Mark = (ctx, obj, color = "#6f03fc", width = 10, height = 10) => {
  // ctx.fillStyle = color + "20";
  ctx.fillStyle = color;
  ctx.fillRect(obj.x1, obj.y1, width, height);
};

const drawRect = (ctx, obj, color = "blue") => {
  ctx.fillStyle = color + "20";
  ctx.fillRect(obj.x1, obj.y1, obj.w, obj.h);
};

// const Text = (ctx, text = "no text", obj, color = "#fff") => {
//   ctx.fillStyle = color;
//   ctx.fillText(text, obj.x1, obj.y1);
// };

const Text = (ctx, text = "no text", x, y, color = "#fff") => {
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
};

export { drawPosition, drawTrendLineObj, drawTrendLine, drawRect, Mark, Text };
