function calculatePercentage(value, percentage) {
  // if (isNaN(value) || isNaN(percentage)) {
  //   throw new Error("Both value and percentage must be numbers.");
  // }

  // if (percentage < 0 || percentage > 100) {
  //   throw new Error("Percentage must be between 0 and 100.");
  // }

  return (value * percentage) / 100;
}

function percentageChange(num1, num2) {
  const diff = num2-num1
  return diff*100/num1
}


function calculateFee(orderValue, leverage, feeRate) {
  // Convert fee rate to a decimal
  const feeRateDecimal = feeRate / 100;

  // Calculate the fee using the formula
  const fee = (orderValue * leverage * feeRateDecimal);

  return fee;
}


export { calculatePercentage, percentageChange, calculateFee};


