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
  Trash2
} from 'lucide-react';

interface DashboardProps {
  data: any;
  periods?: any[];
  activePeriodId?: string | null;
  onPeriodSelect?: (periodId: string) => void;
  onYearSelect?: (year: number) => void;
}

const COLORS = ['#00AFF0', '#fbbf24', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4'];
const PIE_COLORS = ['#00AFF0', '#38bdf8', '#fbbf24', '#f59e0b', '#93c5fd', '#818cf8', '#34d399'];

export function getFriendlyLabel(key: string): string {
  const map: Record<string, string> = {
    waktulapor: "Waktu Lapor",
    waktulaporanselesai: "Waktu Laporan Selesai",
    waktugangguan: "Waktu Gangguan",
    waktugangguan2: "Waktu Gangguan 2",
    waktugangguanselesai: "Waktu Gangguan Selesai",
    durasilaporanmenit: "Durasi Laporan (Menit)",
    durasigangguanmenit: "Durasi Gangguan (Menit)",
    durasilaporan: "Durasi Laporan",
    durasigangguan: "Durasi Gangguan",
    "Durasi Ticket": "Durasi Ticket",
    "DURASI (HH:MM:SS)": "Durasi (HH:MM:SS)",
    "Durasi Incident": "Durasi Incident",
    durasistopclock: "Durasi Stopclock",
    durasigangguaminusstopclock: "Durasi Gangguan - Stopclock",
    durasigangguanminusstopclock: "Durasi Gangguan - Stopclock",
    durasistopclockpelanggan: "Durasi Stopclock Pelanggan",
    durasigangguanminusstopclockpelanggan: "Durasi Gangguan - Stopclock Pelanggan",
    namapelanggan: "Nama Pelanggan",
    namasbu: "SBU Owner",
    namakp: "Kantor Perwakilan (KP)",
    status: "Status",
    idtiket: "ID Tiket",
    idpelanggan: "ID Pelanggan",
    idinsiden: "ID Insiden",
    sidbaru: "SID Baru",
    sidlama: "SID Lama",
    namakelompok: "Kelompok",
    namakondisi: "Kondisi",
    laporanberulang: "Laporan Berulang",
    namapelapor: "Nama Pelapor",
    isilaporan: "Isi Laporan",
    tanggapan: "Tanggapan",
    penerimalaporan: "Penerima Laporan",
    produk: "Produk",
    posisitiket: "Posisi Tiket",
    idolt: "ID OLT",
    brandolt: "Brand OLT",
    idsplitter: "ID Splitter",
    penyebab: "Penyebab",
    penyebabdetail: "Detail Penyebab",
    namamitra: "Nama Mitra",
    petugaslapangan: "Petugas Lapangan",
    tipetiket: "Tipe Tiket",
    namasumber: "Nama Sumber",
    detailSumberLaporan: "Detail Sumber Laporan",
    segmenicon: "Segmen Icon",
    tanggalinsiden: "Tanggal Insiden",
    priority: "Priority",
    "sbu owner": "SBU Owner (Asli)",
    periode: "Periode"
  };
  
  if (map[key]) return map[key];
  if (map[key.toLowerCase()]) return map[key.toLowerCase()];
  
  // Clean fallback
  return key.replace(/([A-Z0-9])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function Dashboard({ data, periods = [], activePeriodId = null, onPeriodSelect, onYearSelect }: DashboardProps) {
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
    totalRows
  } = data;

  // --- TICKETING DASHBOARD ---
  const [selectedSBU, setSelectedSBU] = useState('All');
  const [branchCustomers, setBranchCustomers] = useState<string[]>([]);
  const [limitToBranch, setLimitToBranch] = useState(false);

  // Fetch branch customer list on component mount
  useEffect(() => {
    fetch('/api/branch-customers')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to load branch customer list');
      })
      .then(data => {
        if (Array.isArray(data.values)) {
          setBranchCustomers(data.values);
        }
      })
      .catch(err => console.error('Error fetching branch customers:', err));
  }, []);

  const handleUploadBranchCustomers = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/branch-customers', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Upload failed');
      }
      const result = await response.json();
      setBranchCustomers(result.values || []);
      setLimitToBranch(true);
    } catch (err: any) {
      alert('Failed to upload branch customer list: ' + err.message);
    }
  };

  const handleDeleteBranchCustomers = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm('Are you sure you want to clear the registered Jawa Tengah branch customer list?')) return;
    
    try {
      const response = await fetch('/api/branch-customers', {
        method: 'DELETE'
      });
      if (response.ok) {
        setBranchCustomers([]);
        setLimitToBranch(false);
      }
    } catch (err: any) {
      console.error('Error clearing branch customer list:', err);
    }
  };

  // Hierarchy expand states
  const [expandedCustomers, setExpandedCustomers] = useState<Record<string, boolean>>({});
  const [expandedSIDs, setExpandedSIDs] = useState<Record<string, boolean>>({});

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

  const activeStats = selectedSBU === 'All' && stats ? stats : filteredStats;
  const statusCounts = activeStats?.status_counts || {};
  
  const statusChartData = useMemo(() => {
    return Object.entries(statusCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 10);
  }, [statusCounts]);

  // Helper to format minutes into human readable text
  const formatMinutes = (minutes: number): string => {
    if (!minutes || isNaN(minutes) || minutes <= 0) return '0m';
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remMin = Math.round(minutes % 60);
    if (hours < 24) {
      return `${hours}h ${remMin}m`;
    }
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  };

  // Helper to format dates (supporting Excel serial numbers and string dates)
  const formatDateVal = (val: any): string => {
    if (val === undefined || val === null || val === "") return '-';
    
    let dateObj: Date | null = null;
    if (typeof val === "number") {
      const msSinceEpoch = (val - 25569) * 86400 * 1000;
      dateObj = new Date(msSinceEpoch);
    } else {
      const s = String(val).trim();
      const dmyRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
      const dmyMatch = s.match(dmyRegex);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1], 10);
        const month = parseInt(dmyMatch[2], 10);
        const year = parseInt(dmyMatch[3], 10);
        const hours = dmyMatch[4] ? parseInt(dmyMatch[4], 10) : 0;
        const minutes = dmyMatch[5] ? parseInt(dmyMatch[5], 10) : 0;
        const seconds = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
        
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          dateObj = new Date(year, month - 1, day, hours, minutes, seconds);
        }
      } else {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          dateObj = d;
        }
      }
    }
    
    if (dateObj && !isNaN(dateObj.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear()} ${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}:${pad(dateObj.getSeconds())}`;
    }
    
    return String(val);
  };

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

          // Cause grouping for repeating tickets
          const cause = row.penyebab ? String(row.penyebab).trim() : "UNKNOWN";
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
  const detailedRepeatingTickets = useMemo(() => {
    if (fileType !== 'ticketing') return [];
    return filteredData.filter((row: any) => {
      const sid = String(row.sidbaru || row.sidlama || "").trim();
      const repeats = sid ? (sidFrequency[sid] || 1) : 1;
      return repeats > 1;
    }).sort((a: any, b: any) => {
      // 1. Group by Customer Name
      const nameA = String(a.namapelanggan || "").trim().toLowerCase();
      const nameB = String(b.namapelanggan || "").trim().toLowerCase();
      if (nameA !== nameB) {
        return nameA.localeCompare(nameB);
      }

      // 2. Group by Service ID (SID) within customer
      const sidA = String(a.sidbaru || a.sidlama || "").trim().toLowerCase();
      const sidB = String(b.sidbaru || b.sidlama || "").trim().toLowerCase();
      if (sidA !== sidB) {
        return sidA.localeCompare(sidB);
      }

      // 3. Sort by Ticket ID descending
      const idA = String(a.idtiket || "").trim();
      const idB = String(b.idtiket || "").trim();
      return idB.localeCompare(idA);
    });
  }, [filteredData, fileType, sidFrequency]);

  const filteredRepTickets = useMemo(() => {
    if (!repSearchQuery) return detailedRepeatingTickets;
    const q = repSearchQuery.toLowerCase().trim();
    return detailedRepeatingTickets.filter((row: any) => {
      return (
        String(row.namapelanggan || '').toLowerCase().includes(q) ||
        String(row.sidbaru || row.sidlama || '').toLowerCase().includes(q) ||
        String(row.idtiket || '').toLowerCase().includes(q) ||
        String(row.penyebab || '').toLowerCase().includes(q)
      );
    });
  }, [detailedRepeatingTickets, repSearchQuery]);

  const totalRepPages = Math.ceil(filteredRepTickets.length / repPerPage) || 1;
  const paginatedRepTickets = useMemo(() => {
    const start = (repPage - 1) * repPerPage;
    return filteredRepTickets.slice(start, start + repPerPage);
  }, [filteredRepTickets, repPage]);

  const handleExportTicketing = async () => {
    try {
      const sbuParam = selectedSBU !== 'All' ? `&sbu_filter=${encodeURIComponent(selectedSBU)}` : '';
      const response = await fetch(`/api/export?report_type=ticketing${sbuParam}`);
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
      <div className="w-full max-w-7xl mx-auto space-y-8 pb-12 font-sans animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-1">
          <div>
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
                  className="appearance-none bg-white border border-slate-300 text-slate-700 py-2.5 pl-10 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm font-extrabold cursor-pointer hover:bg-slate-50 transition-colors"
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
                className="appearance-none bg-white border border-slate-300 text-slate-700 py-2.5 pl-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm font-semibold cursor-pointer hover:bg-slate-50 transition-colors"
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

            {/* Jawa Tengah Branch Customers Filter */}
            {branchCustomers.length > 0 ? (
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl px-4 py-2.5 shadow-sm hover:bg-slate-50 cursor-pointer transition-colors select-none">
                <input
                  type="checkbox"
                  checked={limitToBranch}
                  onChange={(e) => setLimitToBranch(e.target.checked)}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-700 text-sm font-semibold">JT Branch ({branchCustomers.length})</span>
                <button
                  onClick={handleDeleteBranchCustomers}
                  className="text-rose-500 hover:text-rose-700 ml-1.5 focus:outline-none flex items-center justify-center p-0.5 rounded hover:bg-rose-50 cursor-pointer"
                  title="Clear Customer List"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </label>
            ) : (
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleUploadBranchCustomers}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <button className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-semibold rounded-xl text-sm transition-all shadow-sm active:scale-95 cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-500" />
                  <span>Upload JT Branch Customers</span>
                </button>
              </div>
            )}

            {/* Export Action */}
            <button
              onClick={handleExportTicketing}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-md shadow-emerald-500/10 active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Export filtered SBU</span>
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl hover:shadow-lg transition-all duration-300 glass-card hover:-translate-y-1">
            <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">TOTAL TICKETS</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{filteredData.length.toLocaleString('id-ID')}</h3>
            <span className="text-xs font-semibold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-md mt-3 inline-block">Volume</span>
          </div>
          <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl hover:shadow-lg transition-all duration-300 glass-card hover:-translate-y-1">
            <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">SBU OWNERS</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{(activeStats?.sbu_counts?.length || 0).toLocaleString('id-ID')}</h3>
            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md mt-3 inline-block">Regions</span>
          </div>
          <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl hover:shadow-lg transition-all duration-300 glass-card hover:-translate-y-1">
            <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">KANTOR PERWAKILAN (KP)</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{(activeStats?.kp_counts?.length || 0).toLocaleString('id-ID')}</h3>
            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md mt-3 inline-block">Offices</span>
          </div>
          <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl hover:shadow-lg transition-all duration-300 glass-card hover:-translate-y-1">
            <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">IMPACTED CUSTOMERS</p>
            <h3 className="text-3xl font-black text-slate-900 mt-2">{(activeStats?.customer_counts?.length || 0).toLocaleString('id-ID')}</h3>
            <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-md mt-3 inline-block">Customers</span>
          </div>
        </div>

        {/* KPs and Customers Block */}
        <div className="space-y-8">
          {/* Top KPs */}
          <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl glass-card">
            <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-500" /> Top Kantor Perwakilan (KP)
            </h3>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activeStats?.kp_counts?.slice(0, 12) || []} margin={{ top: 15, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9, fill: '#475569', angle: -25, textAnchor: 'end' }}
                    interval={0}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} name="Tickets">
                    <LabelList dataKey="value" position="top" fill="#475569" style={{ fontSize: '10px', fontWeight: 600 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
 
          {/* Top Customers by volume (Vertical wide list) */}
          <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl glass-card">
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
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2.5">
                          <div
                            className="bg-violet-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 justify-end flex-shrink-0 pl-12 md:pl-0">
                      <span className="text-xs font-semibold text-slate-400 font-mono">
                        {percent.toFixed(1)}% of top 50
                      </span>
                      <span className="text-xs font-black text-violet-700 bg-violet-50 border border-violet-100 px-3.5 py-2 rounded-full shadow-sm font-mono">
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
        <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-8 rounded-2xl glass-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-slate-900">Repeating Tickets Analysis</h3>
                <p className="text-sm font-medium text-slate-500 mt-0.5">Insights on ticket frequency, top repeating causes, and duration impacts</p>
              </div>
            </div>
            {selectedSBU !== 'All' && (
              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full self-start sm:self-center">
                Filtered: {selectedSBU} SBU
              </span>
            )}
          </div>

          {repeatingStats.totalRepeating === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HelpCircle className="w-12 h-12 text-slate-300 mb-3" />
              <p className="text-slate-600 font-bold">No Repeating Tickets Found</p>
              <p className="text-slate-400 text-xs mt-1">No ticket repeats recorded in the selected SBU/filter scope.</p>
            </div>
          ) : (
            <>
              {/* Repeating Metrics Mini-Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                  <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">REPEATING VOLUME</p>
                  <h4 className="text-2xl font-black text-indigo-900 mt-1.5">
                    {repeatingStats.totalRepeating.toLocaleString('id-ID')}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">
                    Tickets repeating &gt;1 time
                  </p>
                </div>
                
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                  <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">REPEAT RATE</p>
                  <h4 className="text-2xl font-black text-violet-700 mt-1.5">
                    {repeatingStats.repeatingRate.toFixed(1)}%
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">
                    Of total {repeatingStats.totalTickets.toLocaleString('id-ID')} tickets
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                  <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">AVG REPEATS</p>
                  <h4 className="text-2xl font-black text-amber-700 mt-1.5">
                    {repeatingStats.avgRepeats.toFixed(1)}x
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">
                    Per repeating customer/SID
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl">
                  <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">MAX REPEATS RECORDED</p>
                  <h4 className="text-2xl font-black text-rose-700 mt-1.5">
                    {repeatingStats.maxRepeats}x
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1">
                    Highest ticket frequency
                  </p>
                </div>
              </div>

              {/* Repeating Visualizations Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Distribution Chart (5 cols) */}
                <div className="lg:col-span-5 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4">
                    REPEATING FREQUENCY DISTRIBUTION
                  </h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={repeatingStats.distribution} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} name="Tickets">
                          <LabelList dataKey="value" position="top" fill="#475569" style={{ fontSize: '10px', fontWeight: 600 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Causes and Durations (7 cols) */}
                <div className="lg:col-span-7 bg-slate-50/50 border border-slate-100 p-5 rounded-2xl flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-3 mb-4 flex justify-between items-center">
                      <span>TOP REPEATING CAUSES &amp; IMPACT DURATIONS</span>
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        Sorted by count
                      </span>
                    </h4>
                    
                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                      {repeatingStats.topCauses.slice(0, 5).map((item, idx) => (
                        <div key={item.cause} className="bg-white border border-slate-100 p-4 rounded-xl shadow-sm hover:border-indigo-100 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-600">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-slate-800 text-xs sm:text-sm">{item.cause}</span>
                            </div>
                            <div className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                              <span className="text-indigo-600 font-bold">{item.count} tickets</span>
                              <span className="text-slate-300">|</span>
                              <span>{item.percentageOfRepeating.toFixed(1)}%</span>
                            </div>
                          </div>

                          {/* Progress bar */}
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-2.5">
                            <div 
                              className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                              style={{ width: `${item.percentageOfRepeating}%` }} 
                            />
                          </div>

                          {/* Duration statistics details */}
                          <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] text-slate-500 font-medium">
                            <div className="flex items-center gap-1 text-emerald-600 font-bold">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Avg Outage:</span>
                              <span className="font-mono text-slate-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {formatMinutes(item.avgDurationMinutes)}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-indigo-600">
                              <span>Total Accum:</span>
                              <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                {formatMinutes(item.totalDurationMinutes)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-slate-400 font-medium mt-3 italic">
                    Note: Duration analysis is based on the &apos;durasigangguanmenit&apos; column values for these repeating tickets.
                  </p>
                </div>
              </div>

              {/* Detailed Repeating Tickets Registry */}
              <div className="bg-slate-50/50 border border-slate-200 p-6 rounded-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" /> DETAILED REPEATING TICKETS REGISTRY
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      Showing {filteredRepTickets.length} repeating tickets matching criteria
                    </p>
                  </div>
                  <div className="relative max-w-xs w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search repeating tickets..."
                      value={repSearchQuery}
                      onChange={(e) => { setRepSearchQuery(e.target.value); setRepPage(1); }}
                      className="w-full bg-white border border-slate-300 text-slate-700 py-1.5 pl-9 pr-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs font-medium placeholder-slate-400 shadow-sm"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-5 py-3 font-extrabold text-[10px]">TICKET ID</th>
                        <th className="px-5 py-3 font-extrabold text-[10px]">CUSTOMER NAME</th>
                        <th className="px-5 py-3 font-extrabold text-[10px]">SERVICE ID (SID)</th>
                        <th className="px-5 py-3 font-extrabold text-[10px]">CAUSE</th>
                        <th className="px-5 py-3 font-extrabold text-[10px]">REPEAT FREQ</th>
                        <th className="px-5 py-3 font-extrabold text-[10px]">DURATION (MIN)</th>
                        <th className="px-5 py-3 font-extrabold text-[10px]">SBU OWNER</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {paginatedRepTickets.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-slate-400 font-semibold">
                            No matching repeating tickets found.
                          </td>
                        </tr>
                      ) : (
                        paginatedRepTickets.map((row: any, idx: number) => {
                          const prevRow = idx > 0 ? paginatedRepTickets[idx - 1] : null;
                          const showCustDivider = prevRow && String(row.namapelanggan || '').trim().toLowerCase() !== String(prevRow.namapelanggan || '').trim().toLowerCase();
                          const showSidDivider = prevRow && !showCustDivider && String(row.sidbaru || row.sidlama || '').trim().toLowerCase() !== String(prevRow.sidbaru || prevRow.sidlama || '').trim().toLowerCase();
                          
                          let borderClass = "";
                          if (showCustDivider) borderClass = "border-t-[3px] border-indigo-200 bg-slate-50/20";
                          else if (showSidDivider) borderClass = "border-t border-slate-300 border-dashed bg-cyan-50/5";

                          return (
                            <tr key={idx} className={`hover:bg-slate-50/70 transition-colors ${borderClass}`}>
                              <td className="px-5 py-3 font-mono font-bold text-indigo-600">{row.idtiket || '-'}</td>
                              <td className="px-5 py-3 text-slate-800 font-extrabold truncate max-w-[180px]" title={row.namapelanggan}>{row.namapelanggan || '-'}</td>
                              <td className="px-5 py-3 font-mono text-slate-600">{row.sidbaru || row.sidlama || '-'}</td>
                              <td className="px-5 py-3 text-slate-700 font-bold">{row.penyebab || '-'}</td>
                              <td className="px-5 py-3 font-mono">
                                <span className="bg-rose-50 border border-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full font-black">
                                  {sidFrequency[String(row.sidbaru || row.sidlama || '').trim()] || 1}x Repeats
                                </span>
                              </td>
                              <td className="px-5 py-3 font-mono text-slate-600">
                                {parseFloat(row.durasigangguanmenit || 0).toLocaleString('id-ID')} m
                              </td>
                              <td className="px-5 py-3 font-semibold text-slate-500">{row.namasbu || '-'}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalRepPages > 1 && (
                  <div className="flex items-center justify-between pt-3">
                    <span className="text-xs text-slate-400 font-semibold">
                      Page {repPage} of {totalRepPages}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setRepPage(prev => Math.max(prev - 1, 1))}
                        disabled={repPage === 1}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        Prev
                      </button>
                      <button
                        onClick={() => setRepPage(prev => Math.min(prev + 1, totalRepPages))}
                        disabled={repPage === totalRepPages}
                        className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Hierarchical Customer Ticket Explorer */}
        <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 rounded-2xl space-y-6 p-6 glass-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                <Database className="w-5.5 h-5.5 text-cyan-600" /> Hierarchical Ticketing Logs
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Grouped by ID Pelanggan &rarr; Service ID (SID) &rarr; Individual Tickets
              </p>
            </div>
            <div className="relative max-w-sm w-full">
              <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by Customer ID, Name, SID, or Ticket ID..."
                value={custSearchQuery}
                onChange={(e) => setCustSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-700 py-2 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-xs font-semibold placeholder-slate-400 shadow-sm"
              />
            </div>
          </div>

          {/* Grouped customers list */}
          <div className="space-y-4">
            {paginatedCustomers.length === 0 ? (
              <div className="text-center py-12 text-slate-400 font-semibold text-sm">
                No matching customers or SIDs found.
              </div>
            ) : (
              paginatedCustomers.map((cust: any) => {
                const isCustExpanded = !!expandedCustomers[cust.id];
                return (
                  <div key={cust.id} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm hover:border-slate-300 transition-colors">
                    {/* Customer Row */}
                    <div
                      onClick={() => setExpandedCustomers(prev => ({ ...prev, [cust.id]: !prev[cust.id] }))}
                      className="px-6 py-4 bg-slate-50 hover:bg-slate-100/60 flex items-center justify-between cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={`p-1.5 rounded-lg transition-colors ${isCustExpanded ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-100 text-slate-500'}`}>
                          {isCustExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-slate-800 text-sm md:text-base truncate flex items-center gap-2">
                            <span>{cust.name}</span>
                            <span className="text-xs font-mono font-medium text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                              ID: {cust.id}
                            </span>
                          </p>
                           <p className="text-xs font-semibold text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                            <span>{cust.sids.length} Service {cust.sids.length > 1 ? 'IDs' : 'ID'} (SIDs) registered</span>
                            <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300" />
                            <span className="text-[11px] text-cyan-700 bg-cyan-50/60 border border-cyan-100/50 px-2 py-0.5 rounded-md font-bold">
                              Avg Resolve: {formatMinutes(cust.avgResolveTime)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <span className="text-xs font-black text-cyan-700 bg-cyan-50 border border-cyan-100 px-3.5 py-1.5 rounded-full shadow-sm">
                          {cust.ticketCount} {cust.ticketCount > 1 ? 'Tickets' : 'Ticket'}
                        </span>
                        <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isCustExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>

                    {/* SIDs list under Customer */}
                    {isCustExpanded && (
                      <div className="bg-white border-t border-slate-150 divide-y divide-slate-100 p-2 md:p-4 space-y-3">
                        {cust.sids.map((sidObj: any) => {
                          const sidKey = `${cust.id}-${sidObj.sid}`;
                          const isSidExpanded = !!expandedSIDs[sidKey];
                          return (
                            <div key={sidObj.sid} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/30">
                              {/* SID Header Row */}
                              <div
                                onClick={() => setExpandedSIDs(prev => ({ ...prev, [sidKey]: !prev[sidKey] }))}
                                className="px-5 py-3.5 hover:bg-slate-100/50 flex items-center justify-between cursor-pointer select-none transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="text-slate-400">
                                    {isSidExpanded ? <Minus className="w-3.5 h-3.5 text-cyan-500" /> : <Plus className="w-3.5 h-3.5" />}
                                  </div>
                                  <div>
                                    <span className="text-[11px] font-black tracking-wider uppercase text-slate-400 mr-2">SERVICE ID</span>
                                    <span className="font-mono font-extrabold text-slate-700 text-sm">
                                      {sidObj.sid}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                    {sidObj.ticketCount} {sidObj.ticketCount > 1 ? 'Tickets' : 'Ticket'}
                                  </span>
                                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isSidExpanded ? 'rotate-90' : ''}`} />
                                </div>
                              </div>

                              {/* Tickets details under SID */}
                              {isSidExpanded && (
                                <div className="bg-white border-t border-slate-100 overflow-x-auto p-1.5 md:p-3">
                                  <table className="w-full text-xs text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                                      <tr>
                                        <th className="px-4 py-2 text-[10px]">TICKET ID</th>
                                        <th className="px-4 py-2 text-[10px]">SBU OWNER</th>
                                        <th className="px-4 py-2 text-[10px]">KP</th>
                                        <th className="px-4 py-2 text-[10px]">OPEN TICKET DATE</th>
                                        <th className="px-4 py-2 text-[10px]">TICKET DURATION</th>
                                        <th className="px-4 py-2 text-[10px]">REPEATING</th>
                                        <th className="px-4 py-2 text-[10px]">CAUSE</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                      {sidObj.tickets.map((t: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                          <td className="px-4 py-2.5 font-mono font-extrabold text-cyan-600">{t.idtiket || '-'}</td>
                                          <td className="px-4 py-2.5 text-slate-600 font-semibold">{t.namasbu || '-'}</td>
                                          <td className="px-4 py-2.5 text-slate-500">{t.namakp || '-'}</td>
                                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500">
                                            {formatDateVal(t.waktulapor || t.tanggalinsiden || t.waktugangguan2)}
                                          </td>
                                          <td className="px-4 py-2.5 font-mono text-slate-700">
                                            {t.durasigangguan || (t.durasigangguanmenit ? `${t.durasigangguanmenit} m` : '-')}
                                          </td>
                                          <td className="px-4 py-2.5 font-mono">
                                            {sidFrequency[String(t.sidbaru || t.sidlama || '').trim()] > 1 ? (
                                              <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold">
                                                {sidFrequency[String(t.sidbaru || t.sidlama || '').trim()]}x Repeats
                                              </span>
                                            ) : (
                                              <span className="text-slate-400">1x (First)</span>
                                            )}
                                          </td>
                                          <td className="px-4 py-2.5 text-slate-700 font-bold truncate max-w-[150px]" title={t.penyebab}>
                                            {t.penyebab || '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Grouped Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xs text-slate-400 font-semibold">
                Page {custPage} of {totalPages} ({filteredGroupedCustomers.length} customers)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCustPage(prev => Math.max(prev - 1, 1))}
                  disabled={custPage === 1}
                  className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCustPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={custPage === totalPages}
                  className="px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer shadow-sm active:scale-95"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
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
          <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Revenue Performance by Service</h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Total aggregated customer revenue per service type</p>
            </div>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summaryData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="namaLayanan" tick={{ fontSize: 10, fill: '#475569', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => (v / 1e6).toLocaleString() + 'M'}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="TotalRevenue" fill="#00AFF0" name="Revenue" radius={[4, 4, 0, 0]} barSize={40}>
                    {summaryData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* SIDs per Service Pie Chart */}
          <div className="bg-white border border-slate-200 p-6 rounded-2xl">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Service SID Allocation</h3>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">Total unique SIDs provisioned per service</p>
            </div>
            <div className="h-[260px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={summaryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="Total_SID"
                    nameKey="namaLayanan"
                  >
                    {summaryData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2 text-xs font-semibold text-slate-600">
              {summaryData.slice(0, 4).map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-1.5 truncate">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="truncate">{item.namaLayanan}: </span>
                  <span className="font-extrabold text-slate-900">{item.Total_SID}</span>
                </div>
              ))}
            </div>
          </div>
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
