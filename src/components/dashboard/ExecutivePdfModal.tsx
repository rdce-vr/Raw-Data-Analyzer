import React from 'react';
import { 
  FileText, 
  Printer, 
  X, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  Layers, 
  Building2,
  Users, 
  AlertTriangle,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { formatMinutes } from './DashboardUtils';

interface ExecutivePdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  periodLabel: string;
  isYearly?: boolean;
  limitToBranch: boolean;
  activeFilterVersion?: any;
  totalTickets: number;
  avgOutageMinutes: number;
  totalOutageMinutes: number;
  customerCount: number;
  kpCount?: number;
  momDeltas?: {
    tickets?: { pct?: number; diff: number; prev: number; prevLabel?: string } | null;
    avgOutage?: { diff: number; prev: number; prevLabel?: string } | null;
    totalOutage?: { pct?: number; diff: number; prev: number; prevLabel?: string } | null;
    sbu?: { pct?: number; diff: number; prev: number; prevLabel?: string } | null;
    kp?: { pct?: number; diff: number; prev: number; prevLabel?: string } | null;
    customers?: { pct?: number; diff: number; prev: number; prevLabel?: string } | null;
  } | null;
  topCauses?: Array<{ name: string; value: number }>;
  topCustomers?: Array<{ name: string; value: number }>;
  repeatingStats?: {
    totalTickets: number;
    totalRepeating: number;
    repeatingRate: number;
    maxRepeats: number;
    avgRepeats: number;
    topCauses?: Array<any>;
  };
  topRepeatSIDs?: Array<{ 
    sid: string; 
    customerName: string; 
    dominantCause?: string; 
    sbuOwner?: string; 
    repeats: number; 
    totalDuration: number 
  }>;
  sbuCounts?: Array<{ name: string; value: number }>;
}

export function ExecutivePdfModal({
  isOpen,
  onClose,
  periodLabel,
  isYearly = false,
  limitToBranch,
  activeFilterVersion,
  totalTickets,
  avgOutageMinutes,
  totalOutageMinutes,
  customerCount,
  kpCount = 0,
  momDeltas,
  topCauses = [],
  topCustomers = [],
  repeatingStats,
  topRepeatSIDs = [],
  sbuCounts = []
}: ExecutivePdfModalProps) {
  if (!isOpen) return null;

  const totalOutageHours = Math.round(totalOutageMinutes / 60);

  const handlePrint = () => {
    window.print();
  };

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 8mm 10mm;
        }
        @media print {
          html, body {
            height: auto !important;
            overflow: visible !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden;
          }
          #executive-report-sheet, #executive-report-sheet * {
            visibility: visible;
          }
          #executive-report-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          .no-print-area {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[94vh] overflow-y-auto border border-slate-200 flex flex-col">
        
        {/* Modal Top Bar (Screen-Only) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 rounded-t-3xl no-print-area sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-100 text-cyan-700 rounded-xl shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-900 block">Executive 1-Page Summary Report Preview</span>
              <span className="text-[11px] text-slate-500 font-medium">Ready for A4 Portrait print or PDF export</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button 
              onClick={handlePrint} 
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Container (A4 Portrait Layout, Document-Style Readability) */}
        <div id="executive-report-sheet" className="p-8 space-y-5 bg-white text-slate-900 font-sans text-xs">
          
          {/* Header Banner */}
          <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
            <div className="flex items-center gap-4">
              <img 
                src="/pln-logo.png" 
                alt="PLN Icon Plus Logo" 
                className="h-12 w-auto object-contain flex-shrink-0"
              />
              <div className="h-9 w-px bg-slate-300"></div>
              <div>
                <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                  PLN ICON PLUS — EXECUTIVE SLA & INCIDENT REPORT
                </h1>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 font-medium mt-0.5">
                  <span>Period: <strong className="text-slate-900">{periodLabel}</strong></span>
                  <span>•</span>
                  <span>
                    Scope: <strong className="text-slate-900">{limitToBranch ? (activeFilterVersion?.name || 'Jawa Tengah Branch Active') : 'All Customers (Unfiltered)'}</strong>
                  </span>
                  <span>•</span>
                  <span>Date: <strong className="text-slate-900">{currentDateStr}</strong></span>
                </div>
              </div>
            </div>

            <div className="text-right flex flex-col items-end flex-shrink-0">
              <span className="border border-slate-800 text-slate-900 text-[10px] font-black px-2.5 py-0.5 rounded uppercase tracking-wider">
                Official Briefing
              </span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Internal Use</span>
            </div>
          </div>

          {/* Section 1: 6 Key Performance Indicators (Structured Comparison Table) */}
          <div className="space-y-1.5">
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1">
              <span className="w-2 h-2 bg-cyan-600 rounded-xs"></span>
              1. Executive Performance Metrics
            </h2>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              
              {/* Metric 1: Total Tickets */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Total Tickets</span>
                <div className="text-lg font-black text-slate-900 mt-1">{totalTickets.toLocaleString('id-ID')}</div>
                <div className="mt-1 pt-1 border-t border-slate-200 text-[10px]">
                  {momDeltas?.tickets?.pct !== undefined ? (
                    <span className={`font-extrabold ${momDeltas.tickets.pct <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {momDeltas.tickets.pct <= 0 ? '↓' : '↑'} {Math.abs(momDeltas.tickets.pct)}% vs lastmonth
                    </span>
                  ) : (
                    <span className="text-slate-400">Current volume</span>
                  )}
                </div>
              </div>

              {/* Metric 2: Avg Outage Duration */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Avg Outage</span>
                <div className="text-lg font-black text-slate-900 mt-1">{formatMinutes(avgOutageMinutes)}</div>
                <div className="mt-1 pt-1 border-t border-slate-200 text-[10px]">
                  {momDeltas?.avgOutage?.diff !== undefined ? (
                    <span className={`font-extrabold ${momDeltas.avgOutage.diff <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {momDeltas.avgOutage.diff <= 0 ? '↓' : '↑'} {Math.abs(Math.round(momDeltas.avgOutage.diff))}m vs lastmonth
                    </span>
                  ) : (
                    <span className="text-slate-400">Resolution avg</span>
                  )}
                </div>
              </div>

              {/* Metric 3: Total Outage Hours */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Outage Hours</span>
                <div className="text-lg font-black text-slate-900 mt-1">{totalOutageHours.toLocaleString('id-ID')}h</div>
                <div className="mt-1 pt-1 border-t border-slate-200 text-[10px]">
                  {momDeltas?.totalOutage?.pct !== undefined ? (
                    <span className={`font-extrabold ${momDeltas.totalOutage.pct <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {momDeltas.totalOutage.pct <= 0 ? '↓' : '↑'} {Math.abs(momDeltas.totalOutage.pct)}% vs lastmonth
                    </span>
                  ) : (
                    <span className="text-slate-400">Downtime</span>
                  )}
                </div>
              </div>

              {/* Metric 4: SBU Regions */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">SBU Regions</span>
                <div className="text-lg font-black text-slate-900 mt-1">{sbuCounts.length}</div>
                <div className="mt-1 pt-1 border-t border-slate-200 text-[10px]">
                  {momDeltas?.sbu?.diff !== undefined ? (
                    <span className="font-extrabold text-slate-700">
                      {momDeltas.sbu.diff === 0 ? '± 0' : (momDeltas.sbu.diff > 0 ? `+${momDeltas.sbu.diff}` : momDeltas.sbu.diff)} vs lastmonth
                    </span>
                  ) : (
                    <span className="text-slate-400">Operational</span>
                  )}
                </div>
              </div>

              {/* Metric 5: KP Offices */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">KP Offices</span>
                <div className="text-lg font-black text-slate-900 mt-1">{kpCount.toLocaleString('id-ID')}</div>
                <div className="mt-1 pt-1 border-t border-slate-200 text-[10px]">
                  {momDeltas?.kp?.diff !== undefined ? (
                    <span className="font-extrabold text-slate-700">
                      {momDeltas.kp.diff === 0 ? '± 0' : (momDeltas.kp.diff > 0 ? `+${momDeltas.kp.diff}` : momDeltas.kp.diff)} vs lastmonth
                    </span>
                  ) : (
                    <span className="text-slate-400">Offices</span>
                  )}
                </div>
              </div>

              {/* Metric 6: Impacted Customers */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col justify-between">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-wider">Impacted SIDs</span>
                <div className="text-lg font-black text-slate-900 mt-1">{customerCount.toLocaleString('id-ID')}</div>
                <div className="mt-1 pt-1 border-t border-slate-200 text-[10px]">
                  {momDeltas?.customers?.pct !== undefined ? (
                    <span className={`font-extrabold ${momDeltas.customers.pct <= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {momDeltas.customers.pct <= 0 ? '↓' : '↑'} {Math.abs(momDeltas.customers.pct)}% vs lastmonth
                    </span>
                  ) : (
                    <span className="text-slate-400">Customers</span>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Section 2: Top Impacted Customers & SBU Distribution */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Left: Top Impacted Customers */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-violet-600" />
                  2. Top Impacted Customers
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">% Volume</span>
              </h3>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[9px] uppercase">
                  <tr>
                    <th className="p-1">#</th>
                    <th className="p-1">Customer Name</th>
                    <th className="p-1 text-right">Tickets</th>
                    <th className="p-1 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {topCustomers.slice(0, 5).map((cust, idx) => {
                    const share = totalTickets > 0 ? ((cust.value / totalTickets) * 100).toFixed(1) : '0';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-1 font-bold text-slate-400 text-[10px]">#{idx + 1}</td>
                        <td className="p-1 font-bold text-slate-900 truncate max-w-[150px]">{cust.name || 'Unknown Customer'}</td>
                        <td className="p-1 text-right font-mono">{cust.value.toLocaleString('id-ID')}</td>
                        <td className="p-1 text-right font-bold text-violet-700">{share}%</td>
                      </tr>
                    );
                  })}
                  {topCustomers.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-2 text-center text-slate-400">No customer data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Right: SBU Operational Distribution */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  3. SBU Terminating Distribution
                </span>
                <span className="text-[10px] text-slate-400 font-semibold">% Volume</span>
              </h3>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[9px] uppercase">
                  <tr>
                    <th className="p-1">#</th>
                    <th className="p-1">SBU Region</th>
                    <th className="p-1 text-right">Tickets</th>
                    <th className="p-1 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {sbuCounts.slice(0, 5).map((sbu, idx) => {
                    const share = totalTickets > 0 ? ((sbu.value / totalTickets) * 100).toFixed(1) : '0';
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-1 font-bold text-slate-400 text-[10px]">#{idx + 1}</td>
                        <td className="p-1 font-bold text-slate-900 truncate max-w-[150px]">{sbu.name || 'Unknown SBU'}</td>
                        <td className="p-1 text-right font-mono">{sbu.value.toLocaleString('id-ID')}</td>
                        <td className="p-1 text-right font-bold text-amber-700">{share}%</td>
                      </tr>
                    );
                  })}
                  {sbuCounts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-2 text-center text-slate-400">No SBU data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Section 3: Repeating Tickets & Chronic Incident Analysis */}
          <div className="border border-slate-200 rounded-xl p-3.5 bg-white space-y-2.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                4. Repeating Incidents & Chronic Service IDs (SIDs)
              </h3>
              {repeatingStats && (
                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-600">
                  <span>Repeating Tickets: <strong className="text-rose-700">{repeatingStats.totalRepeating.toLocaleString('id-ID')}</strong> ({repeatingStats.repeatingRate.toFixed(1)}%)</span>
                  <span>•</span>
                  <span>Max Repeats: <strong className="text-rose-700">{repeatingStats.maxRepeats}x</strong></span>
                </div>
              )}
            </div>

            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[9px] uppercase">
                <tr>
                  <th className="p-1.5">Service ID</th>
                  <th className="p-1.5">Customer Name</th>
                  <th className="p-1.5">Dominant Cause</th>
                  <th className="p-1.5">SBU Owner</th>
                  <th className="p-1.5 text-right">Repeats</th>
                  <th className="p-1.5 text-right">Downtime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {topRepeatSIDs.slice(0, 4).map((rep, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="p-1.5 font-mono font-bold text-indigo-700">{rep.sid}</td>
                    <td className="p-1.5 truncate max-w-[130px] font-bold text-slate-900">{rep.customerName || '-'}</td>
                    <td className="p-1.5 truncate max-w-[130px] text-slate-600">{rep.dominantCause || '-'}</td>
                    <td className="p-1.5 truncate max-w-[110px] text-slate-500 text-[10px]">{rep.sbuOwner || '-'}</td>
                    <td className="p-1.5 text-right">
                      <span className="bg-rose-50 text-rose-700 font-black px-1.5 py-0.5 rounded text-[10px] border border-rose-200">
                        {rep.repeats}x
                      </span>
                    </td>
                    <td className="p-1.5 text-right font-mono text-slate-700 font-semibold">
                      {formatMinutes(rep.totalDuration)}
                    </td>
                  </tr>
                ))}
                {topRepeatSIDs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-3 text-center text-slate-400">No chronic repeating incidents found for this scope</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Section 4: Top Incident Root Causes */}
          <div className="border border-slate-200 rounded-xl p-3 bg-white space-y-2">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-1.5">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-600" />
                5. Top Incident Root Causes Breakdown
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Highest Severity</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-0.5">
              {topCauses.slice(0, 5).map((cause, idx) => {
                const share = totalTickets > 0 ? ((cause.value / totalTickets) * 100).toFixed(1) : '0';
                return (
                  <div key={idx} className="p-2 bg-slate-50 border border-slate-200/80 rounded-lg">
                    <span className="text-[9px] font-bold text-slate-700 truncate block" title={cause.name}>
                      {idx + 1}. {cause.name || 'Unspecified'}
                    </span>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="font-mono text-slate-600">{cause.value.toLocaleString('id-ID')} tix</span>
                      <span className="font-black text-cyan-700">{share}%</span>
                    </div>
                  </div>
                );
              })}
              {topCauses.length === 0 && (
                <div className="col-span-5 p-2 text-center text-slate-400">No root cause details recorded</div>
              )}
            </div>
          </div>

          {/* Section 5: Sign-off & Confidentiality Footer */}
          <div className="border-t-2 border-slate-800 pt-3 flex items-center justify-between text-[10px] text-slate-600">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-900 block uppercase">Prepared By:</span>
              <span>Network Operation Analytics — SLA Management Unit</span>
            </div>
            <div className="space-y-0.5 text-right">
              <span className="font-bold text-slate-900 block uppercase">Classification:</span>
              <span>CONFIDENTIAL • STRICTLY FOR INTERNAL OPERATIONAL USE</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
