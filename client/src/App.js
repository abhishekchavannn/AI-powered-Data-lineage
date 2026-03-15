// src/App.js
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import LineageGraph from "./components/LineageGraph";
import FileUpload from "./components/FileUpload";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <h1>Data Lineage Visualization POC</h1>
          <nav>
            <ul>
              <li>
                <Link to="/">Home</Link>
              </li>
              <li>
                <Link to="/upload">Upload CSV</Link>
              </li>
              <li>
                <Link to="/visualization">Lineage Graph</Link>
              </li>
            </ul>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/upload" element={<FileUpload />} />
            <Route path="/visualization" element={<LineageGraph />} />
            <Route
              path="/"
              element={
                <div className="home-container">
                  <h2>Data Lineage Tool</h2>
                  <p>
                    This tool helps visualize data lineage across your systems.
                  </p>
                  <p>
                    Upload a CSV file with lineage information to get started.
                  </p>
                  <Link to="/upload" className="cta-button">
                    Get Started
                  </Link>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
