import { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Link, useLocation } from "react-router-dom";
import LineageGraph from "./components/LineageGraph";
import FileUpload from "./components/FileUpload";

function App() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground">
        <Header darkMode={darkMode} setDarkMode={setDarkMode} />
        <main className="max-w-8xl mx-auto w-full px-4 py-8">
          <Routes>
            <Route path="/upload" element={<FileUpload />} />
            <Route path="/visualization" element={<LineageGraph />} />
            <Route path="/" element={<Home />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

function Header({ darkMode, setDarkMode }) {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <header className="h-16 border-b border-border bg-card">
      <div className="mx-auto flex h-full max-w-8xl items-center px-4">
        <div className="flex w-full items-center justify-between">
          <Link to="/" className="group flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
              <svg className="h-5 w-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-base font-semibold tracking-tight">Data Lineage</h1>
          </Link>

          <nav className="flex items-center space-x-1">
            <Link
              to="/"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Home
            </Link>
            <Link
              to="/upload"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive('/upload') 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Upload
            </Link>
            <Link
              to="/visualization"
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                isActive('/visualization') 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Visualization
            </Link>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className="ml-2 rounded-full p-2.5 transition-colors hover:bg-secondary"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
}

function Home() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center space-y-6 py-12">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/10 mb-6 shadow-2xl">
          <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <h2 className="text-4xl font-bold tracking-tight">Data Lineage Tool</h2>
        
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Visualize and track data flow across your systems with interactive lineage graphs
        </p>

        <div className="grid md:grid-cols-3 gap-6 mt-12">
          <div className="p-8 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-primary/30">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-5 shadow-lg">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 tracking-tight">Upload Data</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Import your lineage data via CSV files
            </p>
          </div>

          <div className="p-8 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-primary/30">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-5 shadow-lg">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 tracking-tight">Visualize</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Interactive graphs showing data relationships
            </p>
          </div>

          <div className="p-8 rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 hover:border-primary/30">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-5 shadow-lg">
              <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2 tracking-tight">Analyze</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Track dependencies and data transformations
            </p>
          </div>
        </div>

        <div className="pt-8">
          <Link
            to="/upload"
            className="inline-flex items-center justify-center px-10 py-4 rounded-2xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
          >
            Get Started
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default App;
