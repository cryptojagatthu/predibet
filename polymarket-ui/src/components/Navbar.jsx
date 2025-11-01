import React from "react";

const Navbar = () => {
  return (
    <nav className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <img
          src="/logo192.png"
          alt="Predibet"
          className="w-8 h-8 rounded"
        />
        <h1 className="text-lg font-bold">Predibet</h1>
      </div>

      <input
        type="text"
        placeholder="Search markets..."
        className="bg-gray-700 px-3 py-2 rounded text-sm w-72 outline-none"
      />

      <div className="flex gap-4 text-sm">
        <button className="hover:text-blue-400">Trending</button>
        <button className="hover:text-blue-400">Politics</button>
        <button className="hover:text-blue-400">Sports</button>
        <button className="hover:text-blue-400">Crypto</button>
      </div>
    </nav>
  );
};

export default Navbar;
