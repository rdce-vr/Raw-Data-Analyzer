import React, { useState, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Dashboard } from './components/Dashboard';
import { RefreshCw, FileSpreadsheet, Github, Calendar, Trash2, Database, FolderOpen, ArrowRight, Loader2, Upload, Pencil, Check, X } from 'lucide-react';

export default function App() {
  const [data, setData] = useState<any>(null);
  const [periods, setPeriods] = useState<any[]>([]);
  const [activePeriodId, setActivePeriodId] = useState<string | null>(null);
  const [isLoadingPeriod, setIsLoadingPeriod] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [yearlyData, setYearlyData] = useState<any>(null);
  const [isLoadingYearly, setIsLoadingYearly] = useState<boolean>(false);
  const [showUploadForm, setShowUploadForm] = useState<boolean>(false);
  const [branchCustomers, setBranchCustomers] = useState<string[]>([]);
  const [filterVersions, setFilterVersions] = useState<any[]>([]);
  const [activeFilterVersion, setActiveFilterVersion] = useState<any>(null);
  const [limitToBranch, setLimitToBranch] = useState<boolean>(true);
  const [isUploadingBranch, setIsUploadingBranch] = useState<boolean>(false);
  const [newVersionName, setNewVersionName] = useState<string>('');
  const [editingVersionId, setEditingVersionId] = useState<string | null>(null);
  const [editingVersionName, setEditingVersionName] = useState<string>('');
  const clientDataCacheRef = React.useRef<Map<string, any>>(new Map());

  // Fetch branch customer list & versions
  const fetchFilterVersions = async () => {
    try {
      const res = await fetch('/api/branch-filter-versions');
      if (res.ok) {
        const data = await res.json();
        setFilterVersions(data.versions || []);
      }
    } catch (err) {
      console.error('Error fetching filter versions:', err);
    }
  };

  const fetchBranchCustomers = async () => {
    try {
      const res = await fetch('/api/branch-customers');
      if (res.ok) {
        const data = await res.json();
        setBranchCustomers(data.values || []);
        setActiveFilterVersion(data.activeVersion || null);
      }
    } catch (err) {
      console.error('Error fetching branch customers:', err);
    }
  };

  useEffect(() => {
    fetchBranchCustomers();
    fetchFilterVersions();
  }, []);

  const handleUploadBranchCustomers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);
    if (newVersionName.trim()) {
      formData.append('name', newVersionName.trim());
    }
    setIsUploadingBranch(true);

    try {
      const response = await fetch('/api/branch-filter-versions', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Upload failed');
      }
      setNewVersionName('');
      await fetchBranchCustomers();
      await fetchFilterVersions();
      setLimitToBranch(true);
    } catch (err: any) {
      alert('Failed to upload branch customer list: ' + err.message);
    } finally {
      setIsUploadingBranch(false);
      e.target.value = '';
    }
  };

  const handleRenameFilterVersion = async (versionId: string) => {
    if (!editingVersionName.trim()) return;
    try {
      const res = await fetch(`/api/branch-filter-versions/${versionId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingVersionName.trim() })
      });
      if (res.ok) {
        setEditingVersionId(null);
        setEditingVersionName('');
        await fetchFilterVersions();
        await fetchBranchCustomers();
      } else {
        const err = await res.json();
        alert('Failed to rename version: ' + (err.detail || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error renaming filter version:', err);
    }
  };

  const handleActivateFilterVersion = async (versionId: string) => {
    try {
      const res = await fetch(`/api/branch-filter-versions/${versionId}/activate`, {
        method: 'PUT'
      });
      if (res.ok) {
        await fetchBranchCustomers();
        await fetchFilterVersions();
      } else {
        alert('Failed to activate filter version.');
      }
    } catch (err) {
      console.error('Error activating filter version:', err);
    }
  };

  const handleDeleteFilterVersion = async (versionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('Are you sure you want to delete this customer filter version?')) return;

    try {
      const res = await fetch(`/api/branch-filter-versions/${versionId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchBranchCustomers();
        await fetchFilterVersions();
      }
    } catch (err) {
      console.error('Error deleting filter version:', err);
    }
  };

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
    const cacheKey = `yearly-${year}`;
    if (clientDataCacheRef.current.has(cacheKey)) {
      setYearlyData(clientDataCacheRef.current.get(cacheKey));
      return;
    }
    setIsLoadingYearly(true);
    try {
      const response = await fetch(`/api/yearly-data?year=${year}`);
      if (response.ok) {
        const result = await response.json();
        const formatted = {
          ...result,
          isYearly: true,
          year
        };
        clientDataCacheRef.current.set(cacheKey, formatted);
        setYearlyData(formatted);
      } else {
        setYearlyData(null);
      }
    } catch (err) {
      console.error("Failed to load yearly aggregated data:", err);
      setYearlyData(null);
    } finally {
      setIsLoadingYearly(false);
    }
  };

  useEffect(() => {
    if (selectedYear) {
      loadYearlyData(selectedYear);
    }
  }, [selectedYear, periods]);

  const handleUploadSuccess = (payload: any) => {
    clientDataCacheRef.current.clear();
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
    if (clientDataCacheRef.current.has(periodId)) {
      setData(clientDataCacheRef.current.get(periodId));
      setActivePeriodId(periodId);
      return;
    }
    setIsLoadingPeriod(true);
    try {
      const response = await fetch(`/api/period-data?periodId=${periodId}`);
      if (response.ok) {
        const result = await response.json();
        clientDataCacheRef.current.set(periodId, result);
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
        clientDataCacheRef.current.delete(periodId);
        for (const key of Array.from(clientDataCacheRef.current.keys())) {
          if (key.startsWith("yearly-")) clientDataCacheRef.current.delete(key);
        }
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
          <div className="flex items-center gap-3">
            <img src="/pln-logo.png" alt="PLN Icon Plus Logo" className="h-10 w-auto object-contain" />
            <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-700 tracking-tight hidden sm:block">Ticketing Report & SLA Dashboard</span>
          </div>

          <div className="flex items-center gap-3">
            {periods.length > 0 && (
              <button
                onClick={() => setShowUploadForm(!showUploadForm)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 shadow-sm active:scale-95 cursor-pointer border ${
                  showUploadForm
                    ? 'bg-slate-800 text-white border-slate-800 hover:bg-slate-900'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>{showUploadForm ? "Hide Manager" : "Upload & Manage"}</span>
              </button>
            )}
            <a
              href="https://github.com/rdce-vr/Raw-Data-Analyzer/"
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
              <div className="inline-flex p-4 bg-white rounded-3xl border border-slate-200/80 shadow-md">
                <img src="/pln-logo.png" alt="PLN Icon Plus Logo" className="h-16 w-auto object-contain" />
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600">
                  Ticketing Report & SLA Dashboard
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
                  {/* Column 1: File Upload */}
                  <div className="p-6 border border-slate-200/80 rounded-2xl shadow-sm flex flex-col glass-card">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Upload New Month</h4>
                    <FileUpload onUploadSuccess={handleUploadSuccess} />
                  </div>

                  {/* Column 2: Branch Filter Version Management */}
                  <div className="p-6 border border-slate-200/80 rounded-2xl shadow-sm flex flex-col glass-card">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Branch Filter Lists ({filterVersions.length})</h4>
                      <span className="text-[10px] font-bold text-cyan-700 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded-full">
                        Versioning
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-3">
                      Manage and track different baseline lists of customer names and SIDs over time.
                    </p>

                    {/* Versions List */}
                    <div className="flex-grow space-y-2.5 max-h-[190px] overflow-y-auto pr-1 mb-4">
                      {filterVersions.length > 0 ? (
                        filterVersions.map((v) => (
                          <div
                            key={v.id}
                            className={`p-3 rounded-xl border transition-all duration-150 flex items-center justify-between text-left ${
                              v.isActive
                                ? 'bg-cyan-50/60 border-cyan-300 ring-1 ring-cyan-200'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <div className="min-w-0 pr-2 flex-1">
                              {editingVersionId === v.id ? (
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="text"
                                    value={editingVersionName}
                                    onChange={(e) => setEditingVersionName(e.target.value)}
                                    className="px-2 py-0.5 text-xs font-bold bg-white border border-cyan-400 rounded-lg focus:outline-none w-full text-slate-800"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleRenameFilterVersion(v.id);
                                      if (e.key === 'Escape') setEditingVersionId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleRenameFilterVersion(v.id)}
                                    className="p-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-md cursor-pointer"
                                    title="Save name"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => setEditingVersionId(null)}
                                    className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-md cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-slate-800 text-xs truncate block">{v.name}</span>
                                    {v.isActive && (
                                      <span className="text-[9px] bg-cyan-600 text-white font-black px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                                        Active
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                                    {v.itemCount?.toLocaleString("id-ID") || 0} SIDs • {new Date(v.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              {editingVersionId !== v.id && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingVersionId(v.id);
                                    setEditingVersionName(v.name);
                                  }}
                                  className="p-1.5 bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                                  title="Rename filter list"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                              {!v.isActive && editingVersionId !== v.id && (
                                <button
                                  onClick={() => handleActivateFilterVersion(v.id)}
                                  className="px-2 py-1 bg-white hover:bg-cyan-50 text-cyan-700 border border-slate-200 hover:border-cyan-300 font-bold text-[10px] rounded-lg transition-all cursor-pointer"
                                  title="Set as active filter"
                                >
                                  Activate
                                </button>
                              )}
                              {editingVersionId !== v.id && (
                                <button
                                  onClick={(e) => handleDeleteFilterVersion(v.id, e)}
                                  className="p-1.5 bg-white hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 rounded-lg transition-colors cursor-pointer"
                                  title="Delete filter version"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-center text-slate-400 text-xs font-semibold">
                          No filter versions uploaded yet.
                        </div>
                      )}
                    </div>

                    {/* Upload New Version Form */}
                    <div className="space-y-2 pt-3 border-t border-slate-200">
                      <input
                        type="text"
                        placeholder="Version Name (e.g., Jawa Tengah - Aug 2026)"
                        value={newVersionName}
                        onChange={(e) => setNewVersionName(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 font-semibold text-slate-700"
                      />
                      <div className="relative">
                        <input
                          type="file"
                          accept=".xlsx, .xls, .xlsb, .csv"
                          onChange={handleUploadBranchCustomers}
                          disabled={isUploadingBranch}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button 
                          disabled={isUploadingBranch}
                          className="w-full flex items-center justify-center gap-2 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md shadow-cyan-500/10 active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          {isUploadingBranch ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Saving Version...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload New Filter Version</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Saved Datasets Management */}
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
            {(!data && !yearlyData) && (isLoadingPeriod || isLoadingYearly) ? (
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
                branchCustomers={branchCustomers}
                filterVersions={filterVersions}
                activeFilterVersion={activeFilterVersion}
                onActivateFilterVersion={handleActivateFilterVersion}
                limitToBranch={limitToBranch}
                setLimitToBranch={setLimitToBranch}
                isLoading={isLoadingPeriod || isLoadingYearly}
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
