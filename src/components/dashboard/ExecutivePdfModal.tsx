import React from 'react';
import { 
  FileText, 
  Printer, 
  X, 
  CheckCircle2, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  Layers, 
  Users, 
  AlertTriangle,
  Activity,
  Zap
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
  momDeltas?: {
    tickets?: { pct: number; diff: number; prev: number } | null;
    avgOutage?: { diff: number; prev: number } | null;
    totalOutage?: { pct: number; diff: number; prev: number } | null;
    customers?: { pct: number; diff: number; prev: number } | null;
  } | null;
  topCauses: Array<{ name: string; value: number }>;
  topRepeatSIDs: Array<{ sid: string; customerName: string; repeats: number; totalDuration: number }>;
  sbuCounts: Array<{ name: string; value: number }>;
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
  momDeltas,
  topCauses = [],
  topRepeatSIDs = [],
  sbuCounts = []
}: ExecutivePdfModalProps) {
  if (!isOpen) return null;

  const totalOutageHours = Math.round(totalOutageMinutes / 60);
  const leadSBU = sbuCounts.length > 0 ? sbuCounts[0] : null;
  const leadSBUShare = leadSBU && totalTickets > 0 ? Math.round((leadSBU.value / totalTickets) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  const currentDateStr = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #executive-report-sheet, #executive-report-sheet * {
            visibility: visible;
          }
          #executive-report-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print-area {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto border border-slate-200 flex flex-col">
        
        {/* Modal Toolbar (Screen-Only) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 rounded-t-3xl no-print-area">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-100 text-cyan-700 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-900 block">Executive 1-Page Summary Report Preview</span>
              <span className="text-[11px] text-slate-500 font-medium">Ready for printing or saving as PDF (A4 Landscape)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint} 
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
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

        {/* Printable Document Container */}
        <div id="executive-report-sheet" className="p-8 space-y-6 bg-white text-slate-900 text-xs">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-5">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-md shadow-cyan-500/20">
                ⚡
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                  PLN ICON PLUS — SLA & INCIDENT REPORT
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-semibold mt-1">
                  <span>Period: <strong className="text-slate-800">{periodLabel}</strong></span>
                  <span>•</span>
                  <span>
                    Scope: <strong className="text-slate-800">{limitToBranch ? (activeFilterVersion?.name || 'Jawa Tengah Branch Active') : 'All Customers (Unfiltered)'}</strong>
                  </span>
                  <span>•</span>
                  <span>Generated: <strong className="text-slate-800">{currentDateStr}</strong></span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                Executive Briefing
              </span>
            </div>
          </div>

          {/* Section 1: Executive KPI Grid (4 Metrics with MoM Badges) */}
          <div className="grid grid-cols-4 gap-3.5">
            
            {/* Total Tickets */}
            <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Incidents</span>
              <div className="text-xl font-black text-slate-900 mt-1">{totalTickets.toLocaleString('id-ID')}</div>
              {momDeltas?.tickets ? (
                <div className="mt-1 flex items-center gap-1">
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${momDeltas.tickets.pct <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {momDeltas.tickets.pct <= 0 ? '↓' : '↑'} {Math.abs(momDeltas.tickets.pct)}% MoM
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 mt-1 block">Volume</span>
              )}
            </div>

            {/* Avg Outage Duration */}
            <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Avg. Outage Duration</span>
              <div className="text-xl font-black text-slate-900 mt-1">{formatMinutes(avgOutageMinutes)}</div>
              {momDeltas?.avgOutage ? (
                <div className="mt-1 flex items-center gap-1">
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${momDeltas.avgOutage.diff <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {momDeltas.avgOutage.diff <= 0 ? '↓' : '↑'} {Math.abs(Math.round(momDeltas.avgOutage.diff))}m MoM
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 mt-1 block">{Math.round(avgOutageMinutes)} mins avg</span>
              )}
            </div>

            {/* Total Outage Hours */}
            <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Outage Hours</span>
              <div className="text-xl font-black text-slate-900 mt-1">{totalOutageHours.toLocaleString('id-ID')} hrs</div>
              {momDeltas?.totalOutage ? (
                <div className="mt-1 flex items-center gap-1">
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${momDeltas.totalOutage.pct <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {momDeltas.totalOutage.pct <= 0 ? '↓' : '↑'} {Math.abs(momDeltas.totalOutage.pct)}% MoM
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 mt-1 block">Downtime</span>
              )}
            </div>

            {/* Impacted Customers */}
            <div className="p-3.5 bg-slate-50/80 border border-slate-200 rounded-2xl">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Impacted SIDs</span>
              <div className="text-xl font-black text-slate-900 mt-1">{customerCount.toLocaleString('id-ID')}</div>
              {momDeltas?.customers ? (
                <div className="mt-1 flex items-center gap-1">
                  <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${momDeltas.customers.pct <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {momDeltas.customers.pct <= 0 ? '↓' : '↑'} {Math.abs(momDeltas.customers.pct)}% MoM
                  </span>
                </div>
              ) : (
                <span className="text-[10px] font-semibold text-slate-400 mt-1 block">Unique SIDs</span>
              )}
            </div>

          </div>

          {/* Section 2: Side-by-Side Tables (Top Causes & Top Repeating SIDs) */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Top Root Causes Table */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 shadow-xs">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>Top Incident Root Causes</span>
                <span className="text-[10px] text-slate-400 font-semibold">% Share</span>
              </h4>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase">
                  <tr>
                    <th className="p-1.5">Root Cause</th>
                    <th className="p-1.5 text-right">Tickets</th>
                    <th className="p-1.5 text-right">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {topCauses.slice(0, 4).map((cause, idx) => {
                    const share = totalTickets > 0 ? ((cause.value / totalTickets) * 100).toFixed(1) : '0';
                    return (
                      <tr key={idx}>
                        <td className="p-1.5 font-bold text-slate-900 truncate max-w-[150px]">{cause.name || 'Unspecified'}</td>
                        <td className="p-1.5 text-right font-mono">{cause.value.toLocaleString('id-ID')}</td>
                        <td className="p-1.5 text-right font-bold text-cyan-700">{share}%</td>
                      </tr>
                    );
                  })}
                  {topCauses.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-3 text-center text-slate-400">No cause data available</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Top Repeating SIDs Table */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 shadow-xs">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>Top Repeating Service IDs (SIDs)</span>
                <span className="text-[10px] text-slate-400 font-semibold">Highest Repeat</span>
              </h4>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase">
                  <tr>
                    <th className="p-1.5">Service ID</th>
                    <th className="p-1.5">Customer Name</th>
                    <th className="p-1.5 text-right">Repeats</th>
                    <th className="p-1.5 text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {topRepeatSIDs.slice(0, 4).map((rep, idx) => (
                    <tr key={idx}>
                      <td className="p-1.5 font-mono font-bold text-indigo-600">{rep.sid}</td>
                      <td className="p-1.5 truncate max-w-[120px] font-medium">{rep.customerName || '-'}</td>
                      <td className="p-1.5 text-right">
                        <span className="bg-rose-50 text-rose-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                          {rep.repeats}x
                        </span>
                      </td>
                      <td className="p-1.5 text-right font-mono text-slate-600">
                        {formatMinutes(rep.totalDuration)}
                      </td>
                    </tr>
                  ))}
                  {topRepeatSIDs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-400">No repeating incidents recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Section 3: SBU Operational Summary */}
          {leadSBU && (
            <div className="border border-slate-200 rounded-2xl p-3.5 bg-slate-50/60 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-800 uppercase text-[10px] tracking-wider block">Operational Summary</span>
                <span className="text-slate-600 font-medium">
                  Leading SBU Terminating Owner: <strong className="text-slate-900">{leadSBU.name}</strong> handling <strong>{leadSBU.value.toLocaleString('id-ID')} tickets ({leadSBUShare}%)</strong>.
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-bold block uppercase">Active SBU Regions</span>
                <span className="font-bold text-slate-900">{sbuCounts.length} Operational Units</span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold border-t border-slate-200 pt-3">
            <span>Confidential — Internal PLN Icon Plus Operational SLA Report</span>
            <span>Page 1 of 1</span>
          </div>

        </div>

      </div>
    </div>
  );
}
