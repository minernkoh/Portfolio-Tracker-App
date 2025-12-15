// this is the main app component that sets up routing

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import AssetDetails from "./components/AssetDetails";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* main dashboard route - shows portfolio overview */}
        <Route path="/" element={<Dashboard />} />
        {/* separate route for viewing individual asset details */}
        <Route path="/asset/:ticker" element={<AssetDetails />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
