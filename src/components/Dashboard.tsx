import React, { useMemo, useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Database,
  Target,
  Layers,
  DollarSign,
  Users,
  Activity,
  ArrowUpRight,
  FileSpreadsheet,
  ChevronDown,
  Download,
  Percent,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  HelpCircle,
  ChevronRight,
  Eye,
  Plus,
  Minus,
  Upload,
  Trash2,
  Filter
} from 'lucide-react';

import { COLORS, PIE_COLORS, getFriendlyLabel, formatMinutes, formatDateVal } from './dashboard/DashboardUtils';
import { DashboardMetrics } from './dashboard/DashboardMetrics';
import { KpTicketVolumeChart, RevenuePerformanceChart, ServiceSidAllocationChart } from './dashboard/DashboardCharts';
import { HierarchicalLogs } from './dashboard/HierarchicalLogs';
import { RepeatingIncidentCauses } from './dashboard/RepeatingIncidentCauses';
import { DetailedRepeatingTickets } from './dashboard/DetailedRepeatingTickets';

interface DashboardProps {
  data: any;
  periods?: any[];
  activePeriodId?: string | null;
  onPeriodSelect?: (periodId: string) => void;
  onYearSelect?: (year: number) => void;
  branchCustomers: string[];
  limitToBranch: boolean;
  setLimitToBranch: (val: boolean) => void;
}

export function Dashboard({ 
  data, 
  periods = [], 
  activePeriodId = null, 
  onPeriodSelect, 
  onYearSelect,
  branchCustomers = [],
  limitToBranch = false,
  setLimitToBranch
}: DashboardProps) {
  if (!data) return null;

  const {
    fileName,
    summaryData,
    originalData,
    extractedData,
    variableAnalysis,
    groupingInfo,
    fileType,
    stats,
    totalRows,
    isYearly,
    year
  } = data;

  // --- TICKETING DASHBOARD ---
  const [selectedSBU, setSelectedSBU] = useState('All');
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);

  // Hierarchy expand states
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [expandedSIDs, setExpandedSIDs] = useState<Record<string, boolean>>({});
  const [expandedRepSIDs, setExpandedRepSIDs] = useState<Record<string, boolean>>({});

  // Grouped customer list pagination & search
  const [custSearchQuery, setCustSearchQuery] = useState('');
  const [custPage, setCustPage] = useState(1);
  const custPerPage = 10;

  // Reset pagination on search
  useEffect(() => {
    setCustPage(1);
  }, [custSearchQuery]);

  // Repeating tickets detail registry pagination & search
  const [repSearchQuery, setRepSearchQuery] = useState('');
  const [repPage, setRepPage] = useState(1);
  const repPerPage = 8;

  useEffect(() => {
    setRepPage(1);
  }, [repSearchQuery]);

  // SBU Owner Filter Logic
  const uniqueSBUOwners = useMemo(() => {
    if (fileType === 'ticketing') {
      if (stats?.sbu_counts) {
        return stats.sbu_counts.map((s: any) => s.name).sort();
      }
      if (!originalData) return [];
      const owners = new Set<string>(originalData.map((row: any) => row.namasbu).filter(Boolean));
      return Array.from(owners).sort();
    }
    return [];
  }, [originalData, stats, fileType]);

  const filteredData = useMemo(() => {
    if (fileType !== 'ticketing') return [];
    let data = originalData || [];

    // 1. SBU Owner Filter
    if (selectedSBU !== 'All') {
      data = data.filter((row: any) => row.namasbu === selectedSBU);
    }

    // 2. Branch Customer List Filter
    if (limitToBranch && branchCustomers.length > 0) {
      const customerSet = new Set(branchCustomers.map(v => String(v).toLowerCase().trim()));
      data = data.filter((row: any) => {
        const idPel = String(row.idpelanggan || "").toLowerCase().trim();
        const namePel = String(row.namapelanggan || "").toLowerCase().trim();
        const sidBaru = String(row.sidbaru || "").toLowerCase().trim();
        const sidLama = String(row.sidlama || "").toLowerCase().trim();
        
        return customerSet.has(idPel) || customerSet.has(namePel) || customerSet.has(sidBaru) || customerSet.has(sidLama);
      });
    }

    return data;
  }, [originalData, selectedSBU, fileType, limitToBranch, branchCustomers]);

  const sidFrequency = useMemo(() => {
    const counts: Record<string, number> = {};
    if (fileType !== 'ticketing' || !filteredData) return counts;
    filteredData.forEach((row: any) => {
      const sid = String(row.sidbaru || row.sidlama || "").trim();
      if (sid) {
        counts[sid] = (counts[sid] || 0) + 1;
      }
    });
    return counts;
  }, [filteredData, fileType]);

  const filteredStats = useMemo(() => {
    if (fileType !== 'ticketing') return null;
    if (!filteredData || filteredData.length === 0) {
      return {
        status_counts: {},
        sbu_counts: [],
        kp_counts: [],
        customer_counts: []
      };
    }

    // Recalculate status counts
    const status_counts: Record<string, number> = {};
    filteredData.forEach((row: any) => {
      const val = row.status;
      if (val) status_counts[val] = (status_counts[val] || 0) + 1;
    });

    const getTopCounts = (key: string) => {
      const counts: Record<string, number> = {};
      filteredData.forEach((row: any) => {
        const val = row[key];
        if (val) counts[val] = (counts[val] || 0) + 1;
      });
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 50);
    };

    return {
      status_counts,
      sbu_counts: getTopCounts('namasbu'),
      kp_counts: getTopCounts('namakp'),
      customer_counts: getTopCounts('namapelanggan'),
      time_summary: stats?.time_summary || {}
    };
  }, [filteredData, stats, fileType]);

  const activeStats = (selectedSBU === 'All' && !limitToBranch && stats) ? stats : filteredStats;
  const statusCounts = activeStats?.status_counts || {};
  
  const statusChartData = useMemo(() => {
    return Object.entries(statusCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10);
  }, [statusCounts]);



  // --- REPEATING TICKETS ANALYSIS DATA ---
  const repeatingStats = useMemo(() => {
    if (fileType !== 'ticketing' || !filteredData) {
      return {
        totalTickets: 0,
        totalRepeating: 0,
        repeatingRate: 0,
        maxRepeats: 0,
        avgRepeats: 0,
        distribution: [],
        topCauses: []
      };
    }

    const totalTickets = filteredData.length;
    let totalRepeating = 0;
    let maxRepeats = 0;
    let totalRepeatsSum = 0;

    const distCounts: Record<string, number> = {};
    const penyebabCounts: Record<string, number> = {};
    const penyebabDurations: Record<string, number[]> = {};

    filteredData.forEach((row: any) => {
      const sid = String(row.sidbaru || row.sidlama || "").trim();
      const repeats = sid ? (sidFrequency[sid] || 1) : 1;

      if (repeats > 0) {
        if (repeats > maxRepeats) maxRepeats = repeats;

        // Group into normal vs repeats
        const groupKey = repeats === 1 ? "1x (Normal)" : `${repeats}x Repeats`;
        distCounts[groupKey] = (distCounts[groupKey] || 0) + 1;

        if (repeats > 1) {
          totalRepeating++;
          totalRepeatsSum += repeats;

          // Cause grouping for repeating tickets (filter out '-')
          const cause = row.penyebab ? String(row.penyebab).trim() : "UNKNOWN";
          if (cause !== "-") {
            penyebabCounts[cause] = (penyebabCounts[cause] || 0) + 1;

            // Duration tracking
            const durVal = parseFloat(row.durasigangguanmenit);
            const dur = isNaN(durVal) ? 0 : durVal;
            if (!penyebabDurations[cause]) {
              penyebabDurations[cause] = [];
            }
            penyebabDurations[cause].push(dur);
          }
        }
      }
    });

    const repeatingRate = totalTickets > 0 ? (totalRepeating / totalTickets) * 100 : 0;
    const avgRepeats = totalRepeating > 0 ? totalRepeatsSum / totalRepeating : 0;

    // Build the distribution chart data for Recharts, sorted by repeat count
    const distribution = Object.entries(distCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => {
        const getNum = (str: string) => {
          const match = str.match(/\d+/);
          return match ? parseInt(match[0]) : 1;
        };
        return getNum(a.name) - getNum(b.name);
      });

    // Format top causes of repeating tickets
    const topCauses = Object.entries(penyebabCounts)
      .map(([cause, count]) => {
        const durations = penyebabDurations[cause] || [];
        const totalDuration = durations.reduce((a, b) => a + b, 0);
        const avgDuration = durations.length > 0 ? totalDuration / durations.length : 0;
        return {
          cause,
          count,
          percentageOfRepeating: totalRepeating > 0 ? (count / totalRepeating) * 100 : 0,
          avgDurationMinutes: avgDuration,
          totalDurationMinutes: totalDuration
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      totalTickets,
      totalRepeating,
      repeatingRate,
      maxRepeats,
      avgRepeats,
      distribution,
      topCauses
    };
  }, [filteredData, fileType, sidFrequency]);

  // --- HIERARCHICAL DATA GROUPING LOGIC ---
  const groupedTicketingData = useMemo(() => {
    if (fileType !== 'ticketing') return [];
    
    // Build hierarchy
    const customerMap: Record<string, {
      id: string;
      name: string;
      ticketCount: number;
      totalDuration: number;
      durationCount: number;
      sids: Record<string, {
        sid: string;
        ticketCount: number;
        tickets: any[];
      }>;
    }> = {};

    filteredData.forEach(row => {
      const custId = String(row.idpelanggan || "UNKNOWN_CUST").trim();
      const custName = String(row.namapelanggan || "Unknown Customer").trim();
      const sid = String(row.sidbaru || row.sidlama || "UNKNOWN_SID").trim();

      if (!customerMap[custId]) {
        customerMap[custId] = {
          id: custId,
          name: custName,
          ticketCount: 0,
          totalDuration: 0,
          durationCount: 0,
          sids: {}
        };
      }

      customerMap[custId].ticketCount++;
      const durVal = parseFloat(row.durasigangguanmenit);
      if (!isNaN(durVal)) {
        customerMap[custId].totalDuration += durVal;
        customerMap[custId].durationCount++;
      }

      if (!customerMap[custId].sids[sid]) {
        customerMap[custId].sids[sid] = {
          sid: sid,
          ticketCount: 0,
          tickets: []
        };
      }

      customerMap[custId].sids[sid].ticketCount++;
      customerMap[custId].sids[sid].tickets.push(row);
    });

    // Convert map to sorted array
    return Object.values(customerMap)
      .sort((a, b) => b.ticketCount - a.ticketCount) // Sort by total tickets descending
      .map(cust => {
        const avgResolve = cust.durationCount > 0 ? cust.totalDuration / cust.durationCount : 0;
        return {
          ...cust,
          avgResolveTime: avgResolve,
          sids: Object.values(cust.sids).sort((a, b) => b.ticketCount - a.ticketCount)
        };
      });
  }, [filteredData, fileType]);

  const filteredGroupedCustomers = useMemo(() => {
    if (!custSearchQuery) return groupedTicketingData;
    const q = custSearchQuery.toLowerCase().trim();
    return groupedTicketingData.filter(cust => {
      const nameMatch = cust.name.toLowerCase().includes(q) || cust.id.toLowerCase().includes(q);
      const sidMatch = cust.sids.some((s: any) => s.sid.toLowerCase().includes(q));
      const ticketMatch = cust.sids.some((s: any) => s.tickets.some((t: any) => String(t.idtiket || '').toLowerCase().includes(q)));
      return nameMatch || sidMatch || ticketMatch;
    });
  }, [groupedTicketingData, custSearchQuery]);

  const totalPages = Math.ceil(filteredGroupedCustomers.length / custPerPage) || 1;
  const paginatedCustomers = useMemo(() => {
    const start = (custPage - 1) * custPerPage;
    return filteredGroupedCustomers.slice(start, start + custPerPage);
  }, [filteredGroupedCustomers, custPage]);

  // --- DETAILED REPEATING TICKETS LOG ---
  const repeatingSIDGroups = useMemo(() => {
    if (fileType !== 'ticketing') return [];

    const groupsMap: Record<string, {
      sid: string;
      customerName: string;
      repeats: number;
      sbuOwner: string;
      dominantCause: string;
      totalDuration: number;
      tickets: any[];
    }> = {};

    filteredData.forEach((row: any) => {
      const sid = String(row.sidbaru || row.sidlama || "").trim();
      if (!sid) return;

      const repeats = sidFrequency[sid] || 1;
      if (repeats <= 1) return; // Only repeating SIDs

      if (!groupsMap[sid]) {
        groupsMap[sid] = {
          sid,
          customerName: String(row.namapelanggan || "Unknown Customer").trim(),
          repeats,
          sbuOwner: String(row.namasbu || "-").trim(),
          dominantCause: String(row.penyebab || "-").trim(),
          totalDuration: 0,
          tickets: []
        };
      }

      groupsMap[sid].tickets.push(row);
      const dur = parseFloat(row.durasigangguanmenit);
      if (!isNaN(dur)) {
        groupsMap[sid].totalDuration += dur;
      }
    });

    // Determine dominant cause for each SID
    Object.values(groupsMap).forEach(group => {
      const causeCounts: Record<string, number> = {};
      group.tickets.forEach(t => {
        const c = String(t.penyebab || "-").trim();
        causeCounts[c] = (causeCounts[c] || 0) + 1;
      });
      let maxCount = 0;
      let dominant = "-";
      Object.entries(causeCounts).forEach(([cause, count]) => {
        if (count > maxCount) {
          maxCount = count;
          dominant = cause;
        }
      });
      group.dominantCause = dominant;
      
      // Sort tickets within SID descending by ticket ID
      group.tickets.sort((a: any, b: any) => {
        const idA = String(a.idtiket || "").trim();
        const idB = String(b.idtiket || "").trim();
        return idB.localeCompare(idA);
      });
    });

    // Convert map to array and sort by repeat count descending
    return Object.values(groupsMap).sort((a, b) => {
      if (b.repeats !== a.repeats) {
        return b.repeats - a.repeats;
      }
      return a.customerName.localeCompare(b.customerName);
    });
  }, [filteredData, fileType, sidFrequency]);

  const filteredRepSIDGroups = useMemo(() => {
    if (!repSearchQuery) return repeatingSIDGroups;
    const q = repSearchQuery.toLowerCase().trim();
    return repeatingSIDGroups.filter(g => {
      return (
        g.sid.toLowerCase().includes(q) ||
        g.customerName.toLowerCase().includes(q) ||
        g.sbuOwner.toLowerCase().includes(q) ||
        g.dominantCause.toLowerCase().includes(q) ||
        g.tickets.some(t => String(t.idtiket || '').toLowerCase().includes(q))
      );
    });
  }, [repeatingSIDGroups, repSearchQuery]);

  const totalRepPages = Math.ceil(filteredRepSIDGroups.length / repPerPage) || 1;
  const paginatedRepSIDGroups = useMemo(() => {
    const start = (repPage - 1) * repPerPage;
    return filteredRepSIDGroups.slice(start, start + repPerPage);
  }, [filteredRepSIDGroups, repPage]);

  const handleExportTicketing = async () => {
    try {
      const sbuParam = selectedSBU !== 'All' ? `&sbu_filter=${encodeURIComponent(selectedSBU)}` : '';
      const periodParam = activePeriodId 
        ? `&periodId=${activePeriodId}` 
        : `&year=${year || ''}`;

      const response = await fetch(`/api/export?report_type=ticketing${sbuParam}${periodParam}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedSBU === 'All' ? 'Ticketing_Data.xlsx' : `Ticketing_Data_${selectedSBU.replace(/[/]/g, '-')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to export ticketing data: ' + err.message);
    }
  };

  // --- STANDARD DASHBOARD ---
  const hasSummary = summaryData && summaryData.length > 0;
  const globalMetrics = useMemo(() => {
    if (!hasSummary) return null;
    const totalRevenue = summaryData.reduce((acc: number, curr: any) => acc + (curr.TotalRevenue || 0), 0);
    const totalCustomers = summaryData.reduce((acc: number, curr: any) => acc + (curr.CustomerCount || 0), 0);
    const avgPrice = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

    return {
      revenue: totalRevenue.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }),
      customers: totalCustomers.toLocaleString(),
      avgPrice: avgPrice.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
    };
  }, [summaryData, hasSummary]);

  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleExportStandard = async (type: string) => {
    try {
      const response = await fetch(`/api/export?report_type=${type}`);
      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'all' 
        ? 'Full_Data_Export.xlsx' 
        : type === 'service' 
        ? 'Service_Summary.xlsx' 
        : 'Customer_Summary.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setIsExportMenuOpen(false);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Failed to export data: ' + err.message);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100 ring-1 ring-black/5">
          <p className="font-semibold text-slate-800 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm mb-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-500">{entry.name}:</span>
              <span className="font-semibold text-slate-900">
                {typeof entry.value === 'number' && entry.name.toLowerCase().includes('revenue')
                  ? entry.value.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
                  : entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // --- TICKETING RENDERING ---
  if (fileType === 'ticketing') {
    return (
      <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Title Section */}
        <div className="p-1">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{fileName}</h2>
          <div className="flex items-center gap-2 mt-2 text-slate-500 text-sm font-semibold">
            <Layers className="w-4.5 h-4.5 text-cyan-500" />
            <span>Ticketing Metrics & SLA Dashboard</span>
            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full mx-1"></span>
            <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-100 shadow-sm">
              <Activity className="w-3.5 h-3.5" /> {filteredData.length} Tickets Found
            </span>
          </div>
        </div>

        {/* Dashboard Controls Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm">
          {/* Left side: Selectors and Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector Filter */}
            {periods && periods.length > 0 && (
              <div className="relative">
                <select
                  value={activePeriodId || `yearly-${data.year || new Date().getFullYear()}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val.startsWith("yearly-")) {
                      const yr = parseInt(val.replace("yearly-", ""));
                      if (onYearSelect) onYearSelect(yr);
                      if (onPeriodSelect) onPeriodSelect("");
                    } else {
                      if (onPeriodSelect) onPeriodSelect(val);
                    }
                  }}
                  className="appearance-none bg-slate-50 border border-slate-300 text-slate-750 py-2.5 pl-10 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm font-extrabold cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  {Array.from(new Set(periods.map(p => p.year || parseInt(p.id.split('-')[0])))).filter(Boolean).sort((a: any, b: any) => b - a).map((yr: any) => (
                    <optgroup key={yr} label={`Year ${yr}`} className="font-bold text-slate-900">
                      <option value={`yearly-${yr}`} className="font-bold text-cyan-600">
                        ⭐ {yr} Full Year Summary
                      </option>
                      {periods
                        .filter(p => (p.year || parseInt(p.id.split('-')[0])) === yr)
                        .map((p: any) => (
                          <option key={p.id} value={p.id}>
                            📅 {p.label} Dataset
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-3.5 text-cyan-600">
                  <Calendar className="h-4.5 w-4.5" />
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            )}

            {/* SBU Selector Filter */}
            <div className="relative">
              <select
                value={selectedSBU}
                onChange={(e) => setSelectedSBU(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-300 text-slate-750 py-2.5 pl-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm font-semibold cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <option value="All">All SBU Owners</option>
                {uniqueSBUOwners.map((sbu: string) => (
                  <option key={sbu} value={sbu}>
                    {sbu}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <ChevronDown className="h-4 w-4" />
              </div>
            </div>

            {/* Filter Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95 cursor-pointer select-none ${
                  limitToBranch 
                    ? 'border-cyan-500 text-cyan-600 bg-cyan-50/10 ring-1 ring-cyan-200' 
                    : 'border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <Filter className={`w-4 h-4 ${limitToBranch ? 'text-cyan-600' : 'text-slate-500'}`} />
                <span>Filters</span>
                {limitToBranch && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                )}
                <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform duration-205 ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isFilterDropdownOpen && (
                <>
                  {/* Backdrop overlay to close when clicking outside */}
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsFilterDropdownOpen(false)}
                  />
                  {/* Dropdown Menu Container */}
                  <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Branch Filters</h5>
                    
                    {branchCustomers.length > 0 ? (
                      <label className="flex items-start gap-3 p-2.5 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors select-none">
                        <input
                          type="checkbox"
                          checked={limitToBranch}
                          onChange={(e) => setLimitToBranch(e.target.checked)}
                          className="mt-0.5 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <span className="text-slate-800 text-xs font-bold block">Jawa Tengah Branch</span>
                          <span className="text-[10px] text-slate-450 font-semibold block">{branchCustomers.length} registered SIDs/Customers</span>
                        </div>
                      </label>
                    ) : (
                      <div className="p-3 text-center bg-slate-50 border border-slate-150 border-dashed rounded-xl">
                        <span className="text-[11px] text-slate-450 font-bold block">No Branch List</span>
                        <span className="text-[9px] text-slate-405 font-medium block mt-0.5">Upload a customer list in the Dataset Manager first.</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right side: Actions */}
          <div className="flex items-center gap-3">
            {/* Export Action */}
            <button
              onClick={handleExportTicketing}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all duration-200 shadow-md shadow-emerald-500/10 active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export filtered SBU</span>
            </button>
          </div>
        </div>

        <DashboardMetrics
          filteredDataLength={filteredData.length}
          sbuCount={activeStats?.sbu_counts?.length || 0}
          kpCount={activeStats?.kp_counts?.length || 0}
          customerCount={activeStats?.customer_counts?.length || 0}
        />

        {/* KPs and Customers Block */}
        <div className="space-y-8">
          {/* Top KPs Chart */}
          <KpTicketVolumeChart kpCounts={activeStats?.kp_counts || []} />
 
          {/* Top Customers by volume (Vertical wide list) */}
          <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl glass-card bg-white">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-500" /> Top Impacted Customers
            </h3>
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {activeStats?.customer_counts?.slice(0, 10).map((item: any, idx: number) => {
                const total = activeStats?.customer_counts?.reduce((acc: number, cur: any) => acc + cur.value, 0) || 1;
                const percent = (item.value / total) * 100;
                return (
                  <div key={idx} className="bg-slate-50 hover:bg-slate-100/75 border border-slate-200 p-4 rounded-xl transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <span className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-xs font-black shadow-sm ${
                        idx === 0 ? "bg-amber-500 text-white" :
                        idx === 1 ? "bg-slate-400 text-white" :
                        idx === 2 ? "bg-amber-700 text-white" : "bg-slate-200 text-slate-700"
                      }`}>
                        #{idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-extrabold text-slate-800 text-sm md:text-base truncate" title={item.name}>
                          {item.name}
                        </p>
                        <div className="w-full bg-slate-250/20 h-1.5 rounded-full overflow-hidden mt-2.5">
                          <div
                            className="bg-violet-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 justify-end flex-shrink-0 pl-12 md:pl-0">
                      <span className="text-xs font-semibold text-slate-405 font-mono">
                        {percent.toFixed(1)}% of top 50
                      </span>
                      <span className="text-xs font-black text-violet-750 bg-violet-50 border border-violet-100 px-3.5 py-2 rounded-full shadow-sm font-mono">
                        {item.value} Tickets
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Repeating Tickets Analysis Section */}
        <RepeatingIncidentCauses
          repeatingStats={repeatingStats}
          selectedSBU={selectedSBU}
        />

        {/* Detailed Repeating Tickets Registry */}
        {repeatingStats.totalRepeating > 0 && (
          <DetailedRepeatingTickets
            filteredRepSIDGroups={filteredRepSIDGroups}
            paginatedRepSIDGroups={paginatedRepSIDGroups}
            expandedRepSIDs={expandedRepSIDs}
            setExpandedRepSIDs={setExpandedRepSIDs}
            repSearchQuery={repSearchQuery}
            setRepSearchQuery={setRepSearchQuery}
            repPage={repPage}
            setRepPage={setRepPage}
            totalRepPages={totalRepPages}
          />
        )}

        {/* Hierarchical Customer Ticket Explorer */}
        <HierarchicalLogs
          custSearchQuery={custSearchQuery}
          setCustSearchQuery={setCustSearchQuery}
          paginatedCustomers={paginatedCustomers}
          expandedCustomers={expandedCustomers}
          setExpandedCustomers={setExpandedCustomers}
          expandedSIDs={expandedSIDs}
          setExpandedSIDs={setExpandedSIDs}
          sidFrequency={sidFrequency}
          custPage={custPage}
          setCustPage={setCustPage}
          totalPages={totalPages}
        />
      </div>
    );
  }

  // --- STANDARD RENDERING ---
  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-12 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-1">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">{fileName}</h2>
          <div className="flex items-center gap-2 mt-2 text-slate-500 text-sm font-semibold">
            <Layers className="w-4.5 h-4.5 text-cyan-500" />
            <span>{groupingInfo}</span>
            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full mx-1"></span>
            <span className="text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-0.5 rounded-full text-xs font-bold border border-emerald-100 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5" /> Data Analysis Ready
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-md shadow-emerald-500/10 active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export Reports</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExportMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2.5 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">Select Report Type</div>
                <button
                  onClick={() => handleExportStandard('customer')}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-sm font-medium text-slate-700 hover:text-cyan-600 transition-colors"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                  <div>
                    <div className="font-semibold text-slate-800">Customer Summary</div>
                    <div className="text-[10px] text-slate-400 font-medium">Grouped by Customer & SIDs</div>
                  </div>
                </button>
                <button
                  onClick={() => handleExportStandard('service')}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-sm font-medium text-slate-700 hover:text-cyan-600 transition-colors"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <div>
                    <div className="font-semibold text-slate-800">Service Summary</div>
                    <div className="text-[10px] text-slate-400 font-medium">Grouped by Service & Revenue</div>
                  </div>
                </button>
                <div className="h-px bg-slate-100 my-1" />
                <button
                  onClick={() => handleExportStandard('all')}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center gap-3 text-sm font-medium text-slate-700 hover:text-cyan-600 transition-colors"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <div>
                    <div className="font-semibold text-slate-800">Full Stacked Report</div>
                    <div className="text-[10px] text-slate-400 font-medium">All Summaries + Raw Data</div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <span className="text-xs bg-slate-100 text-slate-500 px-3 py-2 border border-slate-200 rounded-xl font-bold shadow-sm">
            {extractedData?.length || 0} Detail Records
          </span>
        </div>
      </div>

      {/* Metrics Row */}
      {hasSummary && globalMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-300">
          <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl hover:shadow-lg transition-all duration-300 glass-card hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                <DollarSign className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" /> Revenue
              </span>
            </div>
            <p className="text-slate-500 text-sm font-semibold tracking-wide uppercase">Total Revenue</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{globalMetrics.revenue}</h3>
          </div>

          <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl hover:shadow-lg transition-all duration-300 glass-card hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                Active Users
              </span>
            </div>
            <p className="text-slate-500 text-sm font-semibold tracking-wide uppercase">Total Customers</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{globalMetrics.customers}</h3>
          </div>

          <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl hover:shadow-lg transition-all duration-300 glass-card hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                Avg Rate
              </span>
            </div>
            <p className="text-slate-500 text-sm font-semibold tracking-wide uppercase">Average Value</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{globalMetrics.avgPrice}</h3>
          </div>
        </div>
      )}

      {/* Visualizations Charts */}
      {hasSummary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue by Service Bar Chart */}
          {/* Revenue by Service Bar Chart */}
          <RevenuePerformanceChart summaryData={summaryData} />

          {/* SIDs per Service Pie Chart */}
          <ServiceSidAllocationChart summaryData={summaryData} />
        </div>
      )}

      {/* Variable Analysis Grid */}
      {variableAnalysis && (
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-5.5 h-5.5 text-cyan-600" /> Frequency Distribution Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(variableAnalysis).map(([colName, list]: [string, any]) => (
              <div key={colName} className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col h-[280px]">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-3">
                  {getFriendlyLabel(colName)}
                </h4>
                <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                  {list.slice(0, 10).map((item: any, idx: number) => {
                    const total = list.reduce((a: number, b: any) => a + b.count, 0);
                    const percent = total > 0 ? (item.count / total) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-slate-700">
                          <span className="truncate max-w-[70%]">{item.value === 'None' || !item.value ? 'Empty' : item.value}</span>
                          <span className="font-mono text-slate-500">{item.count}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Standard Detail Log Table */}
      {extractedData && extractedData.length > 0 && (
        <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 rounded-2xl overflow-hidden glass-card">
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Extracted Detail Log Records</h3>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Showing first 100 records of extracted columns</p>
          </div>
          <div className="overflow-x-auto max-h-[450px]">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider sticky top-0 border-b border-slate-200 z-10">
                <tr>
                  {Object.keys(extractedData[0]).map((col: string) => (
                    <th key={col} className="px-6 py-4 whitespace-nowrap font-bold">
                      {getFriendlyLabel(col)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {extractedData.slice(0, 100).map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                    {Object.entries(row).map(([key, val]: any, j: number) => {
                      let textValue = val === null || val === undefined ? '-' : String(val);
                      if (key === 'hargaPelanggan' && typeof val === 'number') {
                        textValue = val.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
                      }
                      return (
                        <td key={j} className="px-6 py-3.5 whitespace-nowrap text-slate-700 font-medium font-mono text-xs">
                          {textValue}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
