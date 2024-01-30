import React, { useRef } from "react";
import { useEffect } from "react";

export default function Test() {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Open Close body
    ctx.fillStyle = "red";
    ctx.fillRect(0, 10, 50, 100);

    // Add text elements
    // ctx.translate(x, 0);
    ctx.font = "12px Arial";
    ctx.fillStyle = "#ffffff20";
    // X-axis label
    // ctx.fillText(index, x - 2.5, yOpen - 400);
  }, []);
  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth * 5}
      height={window.innerHeight}
      style={{
        backgroundColor: "#000",
      }}
    />
  );
}
