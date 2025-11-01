import React, { useEffect, useState } from "react";
import axios from "axios";
import MarketCard from "./MarketCard";

const MarketGrid = () => {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const res = await axios.get("https://predibet.onrender.com/api/markets?limit=1000");
        setMarkets(res.data.markets.slice(0, 20));
      } catch (err) {
        console.error("Error fetching markets:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMarkets();
  }, []);

  if (loading)
    return <p className="text-center text-gray-400 mt-10">Loading markets...</p>;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
      {markets.map((m) => (
        <MarketCard key={m.id} market={m} />
      ))}
    </div>
  );
};

export default MarketGrid;
