import React, { useState, useEffect } from 'react';
import { PlnLogo } from './components/PlnLogo';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { RefreshCw, FileSpreadsheet, Github, Calendar, Trash2, Database, FolderOpen, ArrowRight, Loader2 } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [isLoadingPeriod, setIsLoadingPeriod] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [yearlyData, setYearlyData] = useState<any>(null);
  const [isLoadingYearly, setIsLoadingYearly] = useState<boolean>(false);
  const [showUploadForm, setShowUploadForm] = useState<boolean>(false);

  const fetchPeriods = async () => {
    try {
      const response = await fetch('/api/periods');
      if (response.ok) {
        const result = await response.json();
        setPeriods(result.periods || []);
      }
    } catch (err) {
      console.error("Failed to fetch periods:", err);
    }
  };

  useEffect(() => {
    fetchPeriods();
  }, []);

  const availableYears = Array.from(
    new Set(periods.map(p => p.year || parseInt(p.id.split('-')[0])))
  ).filter(Boolean).sort((a: any, b: any) => b - a);

  useEffect(() => {
    if (availableYears.length > 0) {
      if (selectedYear === null || !availableYears.includes(selectedYear)) {
        setSelectedYear(availableYears[0]);
      }
    } else {
      setSelectedYear(null);
      setYearlyData(null);
    }
  }, [periods]);

  const loadYearlyData = async (year: number) => {
    setIsLoadingYearly(true);
    try {
      const yearPeriods = periods.filter(p => (p.year || parseInt(p.id.split('-')[0])) === year);
      if (yearPeriods.length === 0) {
        setYearlyData(null);
        return;
      }

      const promises = yearPeriods.map(p =>
        fetch(`/api/period-data?periodId=${p.id}`).then(res => {
          if (!res.ok) throw new Error(`Failed to load ${p.id}`);
          return res.json();
        })
      );

      const results = await Promise.all(promises);

      let allRows: any[] = [];
      results.forEach(res => {
        if (res && Array.isArray(res.originalData)) {
          allRows = allRows.concat(res.originalData);
        }
      });

      setYearlyData({
        fileType: 'ticketing',
        fileName: `Yearly Dashboard Summary - ${year}`,
        originalData: allRows,
        totalRows: allRows.length,
        stats: null, // Let Dashboard calculate stats on the fly
        isYearly: true,
        year
      });
    } catch (err) {
      console.error("Failed to load yearly aggregated data:", err);
    } finally {
      setIsLoadingYearly(false);
    }
  };

  useEffect(() => {
    if (selectedYear) {
      loadYearlyData(selectedYear);
    }
  }, [selectedYear]);

  const handleUploadSuccess = (payload: any) => {
    setData(payload);
    fetchPeriods();
    if (payload.periodId) {
      setActivePeriodId(payload.periodId);
      const yr = parseInt(payload.periodId.split('-')[0]);
      if (yr) {
        setSelectedYear(yr);
      }
    }
    setShowUploadForm(false);
  };

  const loadPeriodData = async (periodId: string) => {
    setIsLoadingPeriod(true);
    try {
      const response = await fetch(`/api/period-data?periodId=${periodId}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
        setActivePeriodId(periodId);
      } else {
        alert("Failed to load period data.");
      }
    } catch (err) {
      console.error(err);
      alert("Connection error loading period.");
    } finally {
      setIsLoadingPeriod(false);
    }
  };

  const handlePeriodSelect = (periodId: string) => {
    if (!periodId || periodId.startsWith("yearly-")) {
      setData(null);
      setActivePeriodId(null);
      if (periodId.startsWith("yearly-")) {
        const yr = parseInt(periodId.replace("yearly-", ""));
        setSelectedYear(yr);
      }
    } else {
      loadPeriodData(periodId);
    }
  };

  const deletePeriod = async (periodId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete data for ${periodId}? This will remove it from the Cloud database.`)) {
      return;
    }
    try {
      const response = await fetch(`/api/period?periodId=${periodId}`, { method: 'DELETE' });
      if (response.ok) {
        if (activePeriodId === periodId) {
          setData(null);
          setActivePeriodId(null);
        }
        fetchPeriods();
      } else {
        alert("Failed to delete period.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting period.");
    }
  };

  const handleReset = () => {
    setData(null);
    setActivePeriodId(null);
    fetchPeriods();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-800">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-lg border-b border-slate-200/80 glass-panel">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PlnLogo height={42} />
            <div className="h-6 w-px bg-slate-200 mx-1.5 hidden sm:block"></div>
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-700 tracking-tight hidden sm:block">PLN IconSLA Analytics</span>
          </div>

          <div className="flex items-center gap-3">
            {periods.length > 0 && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all duration-150 border border-slate-200 active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reset to Yearly view</span>
              </button>
            )}
            <a
              href="https://github.com/NaufalTD/raw-data-manager"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              title="View GitHub Repository"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-grow flex flex-col">
        {periods.length === 0 ? (
          // Empty State - No Datasets Yet (Show Full-Screen Upload Form)
          <div className="flex-grow flex flex-col justify-center py-12 px-6">
            <div className="max-w-3xl mx-auto text-center space-y-6 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="inline-flex p-3 bg-cyan-50 text-cyan-600 rounded-2xl border border-cyan-100 shadow-sm">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600">
                  PLN IconSLA Analytics
                </h1>
                <p className="text-lg text-slate-500 max-w-xl mx-auto font-medium leading-relaxed">
                  Analyze, visualize, and optimize Service Level Agreement metrics from raw ticketing sheets and performance logs.
                </p>
              </div>
            </div>

            <FileUpload onUploadSuccess={handleUploadSuccess} />
          </div>
        ) : (
          // Data is Available in the Database (Show Yearly/Monthly Dashboard)
          <div className="px-6 py-8">
            {/* Header Toolbar containing Toggle Form button and Year pills */}
            <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 border border-slate-200/80 rounded-2xl shadow-md shadow-slate-100/50 glass-card">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-cyan-600">
                  <Database className="w-5 h-5 animate-pulse" />
                  <span className="font-extrabold text-sm tracking-wide uppercase">Active Dataset</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  {activePeriodId 
                    ? `Viewing Monthly Dataset: ${periods.find(p => p.id === activePeriodId)?.label || activePeriodId}`
                    : `Viewing Combined Yearly Summary: ${selectedYear}`
                  }
                </h2>
                <p className="text-xs text-slate-400 font-semibold">
                  {activePeriodId 
                    ? "Filtered to a single calendar month dataset" 
                    : `Aggregated data from all ${periods.filter(p => (p.year || parseInt(p.id.split('-')[0])) === selectedYear).length} months of the year ${selectedYear}`
                  }
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Year Select Tabs (Pills) */}
                {!activePeriodId && (
                  <div className="bg-slate-100 p-1 rounded-xl flex gap-1 border border-slate-200 shadow-inner">
                    {availableYears.map((yr: any) => (
                      <button
                        key={yr}
                        onClick={() => setSelectedYear(yr)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 cursor-pointer ${
                          selectedYear === yr
                            ? 'bg-white text-cyan-600 shadow-sm ring-1 ring-black/5'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                )}

                {/* Manage & Upload Toggle Button */}
                <button
                  onClick={() => setShowUploadForm(!showUploadForm)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm active:scale-95 cursor-pointer border ${
                    showUploadForm
                      ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-900'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${showUploadForm ? 'rotate-180 transition-transform duration-300' : ''}`} />
                  <span>{showUploadForm ? "Hide Dataset Manager" : "Upload & Manage Datasets"}</span>
                </button>
              </div>
            </div>

            {/* Collapsible Upload Form & Dataset Manager */}
            {showUploadForm && (
              <div className="max-w-7xl mx-auto mb-8 bg-slate-50/50 p-6 border border-slate-200 rounded-2xl border-dashed">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-600" /> Database Management Center
                  </h3>
                  <button onClick={() => setShowUploadForm(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer">
                    Close ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left columns: File Upload */}
                  <div className="lg:col-span-2 p-6 border border-slate-200/80 rounded-2xl shadow-sm glass-card">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Upload New Month</h4>
                    <FileUpload onUploadSuccess={handleUploadSuccess} />
                  </div>

                  {/* Right column: Saved Datasets Management */}
                  <div className="p-6 border border-slate-200/80 rounded-2xl shadow-sm flex flex-col glass-card">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Saved Datasets ({periods.length})</h4>
                    <div className="flex-grow space-y-3 max-h-[350px] overflow-y-auto pr-1">
                      {periods.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => {
                            loadPeriodData(p.id);
                            setShowUploadForm(false);
                          }}
                          className={`p-3.5 border rounded-xl transition-all duration-150 cursor-pointer flex items-center justify-between group text-left ${
                            activePeriodId === p.id 
                              ? 'bg-cyan-50/55 border-cyan-300 ring-1 ring-cyan-200' 
                              : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="min-w-0 pr-3">
                            <span className="font-bold text-slate-800 text-xs block">{p.label}</span>
                            <span className="text-[10px] text-slate-400 font-medium truncate block mt-0.5">{p.fileName || "unknown.xlsx"}</span>
                            <span className="inline-block text-[9px] font-extrabold text-cyan-700 bg-cyan-50 border border-cyan-100 px-1.5 py-0.5 rounded mt-1.5">
                              {p.totalRows?.toLocaleString("id-ID")} Tickets
                            </span>
                          </div>
                          <button
                            onClick={(e) => deletePeriod(p.id, e)}
                            className="p-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-all duration-150 cursor-pointer flex-shrink-0"
                            title="Delete dataset"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dashboard Display */}
            {isLoadingPeriod || isLoadingYearly ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4 max-w-7xl mx-auto bg-white border border-slate-200 rounded-2xl shadow-sm">
                <Loader2 className="w-12 h-12 text-cyan-600 animate-spin" />
                <p className="text-slate-600 font-bold">Assembling and aggregating data...</p>
                <p className="text-xs text-slate-400">Loading requested dataset and processing statistics...</p>
              </div>
            ) : (
              <Dashboard
                data={activePeriodId ? data : yearlyData}
                periods={periods}
                activePeriodId={activePeriodId}
                onPeriodSelect={handlePeriodSelect}
                onYearSelect={setSelectedYear}
              />
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs font-semibold text-slate-400">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>Powered by Node.js & React-Vite. Secure Local SLA Insights.</p>
          <p>© {new Date().getFullYear()} PLN Icon Plus Workspace.</p>
        </div>
      </footer>
    </div>
  );
}
