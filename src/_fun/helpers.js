function calculatePercentage(value, percentage) {
  // if (isNaN(value) || isNaN(percentage)) {
  //   throw new Error("Both value and percentage must be numbers.");
  // }

  // if (percentage < 0 || percentage > 100) {
  //   throw new Error("Percentage must be between 0 and 100.");
  // }

  return (value * percentage) / 100;
}

export { calculatePercentage };
