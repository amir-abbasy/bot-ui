import React, { useState, useEffect } from 'react';
import dates from '../data/data'

const JsonLoader = ({ setJsonData = () => null }) => {
  const [selectedDate, setSelectedDate] = useState('2022-06-20');

  useEffect(() => {
    // Assuming your JSON files are in the data folder
    const fetchData = async () => {
      try {
        const response = await import(`../data/ohlcv/${selectedDate}.json`);
        setJsonData(response.default);
      } catch (error) {
        console.error('Error loading JSON data:', error);
        setJsonData(null);
      }
    };

    fetchData();
  }, [selectedDate]);

  return (
    <select
      id="dateSelect"
      value={selectedDate}
      onChange={(event) => setSelectedDate(event.target.value)}
    >
      {dates.map((date, key) => {
        return <option value={date} key={key}>{date}</option>
      })}
    </select>
  );
};

export default JsonLoader;
