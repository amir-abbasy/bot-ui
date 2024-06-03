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
  const diff = num2 - num1
  return diff * 100 / num1
}


function calculateFee(orderValue, leverage, feeRate) {
  // Convert fee rate to a decimal
  const feeRateDecimal = feeRate / 100;

  // Calculate the fee using the formula
  const fee = (orderValue * leverage * feeRateDecimal);

  return fee;
}

const log = (..._) => console.log(..._)




function calculateRSI(prices, period = 14) {
  if (prices.length < period) {
    throw new Error("Not enough prices to calculate RSI.");
  }

  const changes = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  const gains = [];
  const losses = [];
  for (let i = 0; i < changes.length; i++) {
    if (changes[i] > 0) {
      gains.push(changes[i]);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(-changes[i]);
    }
  }

  let averageGain = gains.slice(0, period).reduce((acc, val) => acc + val, 0) / period;
  let averageLoss = losses.slice(0, period).reduce((acc, val) => acc + val, 0) / period;

  const rsArray = [];
  rsArray.push(averageGain / averageLoss);

  for (let i = period; i < prices.length; i++) {
    averageGain = (averageGain * (period - 1) + gains[i]) / period;
    averageLoss = (averageLoss * (period - 1) + losses[i]) / period;
    rsArray.push(averageGain / averageLoss);
  }

  const rsiArray = rsArray.map(rs => 100 - (100 / (1 + rs)));

  return rsiArray;
}



const calculateRSIMA = (rsi, period = 14) => {
  const ma = [];
  for (let i = 0; i < rsi.length; i++) {
    if (i < period - 1) {
      ma.push(null);
    } else {
      const avg = rsi.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val, 0) / period;
      ma.push(avg);
    }
  }
  return ma;
};

function calculateSMA_(prices, period = 14) {
  if (prices.length < period) {
    throw new Error("Not enough prices to calculate SMA.");
  }

  // Slice the array from the back
  const slicedPrices = prices.slice(-period);

  const sum = slicedPrices.reduce((acc, val) => acc + val, 0);
  const sma = sum / period;

  return sma;
}




export { calculatePercentage, percentageChange, calculateFee, log, calculateRSI, calculateRSIMA };


