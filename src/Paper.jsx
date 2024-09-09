import React, { useEffect, useState } from 'react'
import { calculatePercentage, percentageChange } from './_fun/helpers';

function calculateProfitLoss(position) {
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
  // const fee_entry = calculateFee(INVEST, LEVERAGE, FEE);
  // const fee_exit = calculateFee(exit_size, LEVERAGE, FEE);

  let pl =
    l_exit_size - l_entry_size - (amount_entry_fee + amount_exit_fee);

  if (position["type"] == "SHORT") {
    pl = l_entry_size - l_exit_size - (amount_entry_fee + amount_exit_fee);
  }

  return pl

}


function Paper() {
  const [data, setData] = useState([]);


  useEffect(() => {
    const paper_data = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/test');
        const data = await response.json();
        // console.log({data});
        setData(data);
      } catch (error) {
        console.error('Error fetching the ping response:', error);
      }
    };
    paper_data();
  }, []);

  if (!data) return <p>Analysing...</p>
  return (
    <div className='paper'>
      {data.map((chart, idx) => {
        var pnl = 0

        return <div key={idx} className='chart-card'>
          <p>{chart.date}</p>
          {chart.positions.map((pos, id) => {
            var pl = calculateProfitLoss(pos)
            pnl += pl
            return <div key={id} className='pos-card'>
              <span style={{ color: pl > 0 ? 'green' : '#700f0f' }}>{pl.toFixed(2)}</span>
            </div>
          })}
          <p style={{ color: pnl > 0 ? 'green' : 'red' }}>{pnl.toFixed(2)}</p>
        </div>
      })}

    </div>
  )
}

export default Paper