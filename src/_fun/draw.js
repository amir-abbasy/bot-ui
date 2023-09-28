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

const drawPosition = (ctx, draw) => {
  ctx.beginPath();
  ctx.moveTo(draw.x1, draw.y1);
  ctx.lineTo(draw.x2, draw.y2);
  ctx.strokeStyle = draw.y1 < draw.y2 ? 'red' : 'green' // "#6f03fc";
  // ctx.lineWidth = 4;
  ctx.stroke();
};

const drawTrendLine = (ctx, draw) => {
  ctx.beginPath();
  ctx.moveTo(draw[0], draw[1]);
  ctx.lineTo(draw[2], draw[3]);
  ctx.strokeStyle = "yellow";
  ctx.stroke();
};

export { drawPosition, drawTrendLineObj, drawTrendLine };
