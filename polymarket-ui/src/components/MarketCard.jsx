import React from "react";

const MarketCard = ({ market }) => {
  const yesPrice = (parseFloat(market.outcome_prices?.[0]) * 100).toFixed(1);
  const noPrice = (parseFloat(market.outcome_prices?.[1]) * 100).toFixed(1);

  return (
    <div className="bg-gray-800 p-4 rounded-2xl shadow hover:shadow-lg hover:scale-[1.02] transition duration-200">
      <img
        src={market.image}
        alt={market.question}
        className="w-full h-40 object-cover rounded-xl mb-3"
      />
      <h2 className="font-semibold text-sm mb-2 h-10 overflow-hidden">
        {market.question}
      </h2>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-green-400">Yes {yesPrice}%</span>
        <span className="text-red-400">No {noPrice}%</span>
      </div>
      <p className="text-gray-400 text-xs">Vol: ${(market.volume / 1e6).toFixed(1)}M</p>
    </div>
  );
};

export default MarketCard;
