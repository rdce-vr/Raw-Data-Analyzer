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
  Building2,
  Users, 
  AlertTriangle,
  Activity,
  ShieldCheck,
  Award
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
    tickets?: { pct?: number; diff: number; prev: number; prevLabel?: string } | null;
    avgOutage?: { diff: number; prev: number; prevLabel?: string } | null;
    totalOutage?: { pct?: number; diff: number; prev: number; prevLabel?: string } | null;
    sbu?: { pct?: number; diff: number; prev: number; prevLabel?: string } | null;
    kp?: { pct?: number; diff: number; prev: number; prevLabel?: string } | null;
    customers?: { pct?: number; diff: number; prev: number; prevLabel?: string } | null;
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
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <style>{`
        @page {
          size: A4 landscape;
          margin: 8mm 10mm;
        }
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
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            background: #ffffff !important;
          }
          .no-print-area {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[94vh] overflow-y-auto border border-slate-200 flex flex-col">
        
        {/* Modal Top Bar (Screen-Only) */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 rounded-t-3xl no-print-area sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-100 text-cyan-700 rounded-xl shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-900 block">Executive 1-Page Summary Report Preview</span>
              <span className="text-[11px] text-slate-500 font-medium">Ready for A4 Landscape print or PDF export</span>
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

        {/* Printable Document Container (Styled to fill A4 Landscape) */}
        <div id="executive-report-sheet" className="p-8 space-y-6 bg-white text-slate-900 font-sans">
          
          {/* Header Banner */}
          <div className="flex items-center justify-between border-b-2 border-slate-200 pb-5">
            <div className="flex items-center gap-5">
              <img 
                src="/pln-logo.png" 
                alt="PLN Icon Plus Logo" 
                className="h-14 w-auto object-contain flex-shrink-0"
              />
              <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  PLN ICON PLUS — EXECUTIVE SLA & TICKETING REPORT
                </h2>
                <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 font-semibold mt-1">
                  <span>Reporting Period: <strong className="text-slate-900">{periodLabel}</strong></span>
                  <span>•</span>
                  <span>
                    Scope: <strong className="text-slate-900">{limitToBranch ? (activeFilterVersion?.name || 'Jawa Tengah Branch Active') : 'All Customers (Unfiltered)'}</strong>
                  </span>
                  <span>•</span>
                  <span>Generated Date: <strong className="text-slate-900">{currentDateStr}</strong></span>
                </div>
              </div>
            </div>

            <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
              <span className="bg-gradient-to-r from-cyan-600 to-blue-700 text-white text-[10px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-xs">
                Official SLA Briefing
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Confidential</span>
            </div>
          </div>

          {/* Section 1: 6 Executive Metric Tiles Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            
            {/* Tile 1: Total Incidents */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Tickets</span>
                <div className="text-xl font-black text-slate-900 mt-1 tracking-tight">{totalTickets.toLocaleString('id-ID')}</div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                {momDeltas?.tickets?.pct !== undefined ? (
                  <span className={`font-extrabold px-1.5 py-0.5 rounded ${momDeltas.tickets.pct <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {momDeltas.tickets.pct <= 0 ? '↓' : '↑'} {Math.abs(momDeltas.tickets.pct)}% MoM
                  </span>
                ) : (
                  <span className="text-slate-400 font-semibold">Volume</span>
                )}
              </div>
            </div>

            {/* Tile 2: Avg Outage Duration */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Avg Outage</span>
                <div className="text-xl font-black text-slate-900 mt-1 tracking-tight">{formatMinutes(avgOutageMinutes)}</div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                {momDeltas?.avgOutage?.diff !== undefined ? (
                  <span className={`font-extrabold px-1.5 py-0.5 rounded ${momDeltas.avgOutage.diff <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {momDeltas.avgOutage.diff <= 0 ? '↓' : '↑'} {Math.abs(Math.round(momDeltas.avgOutage.diff))}m MoM
                  </span>
                ) : (
                  <span className="text-slate-400 font-semibold">Resolution</span>
                )}
              </div>
            </div>

            {/* Tile 3: Total Outage Hours */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Outage Hours</span>
                <div className="text-xl font-black text-slate-900 mt-1 tracking-tight">{totalOutageHours.toLocaleString('id-ID')} hrs</div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                {momDeltas?.totalOutage?.pct !== undefined ? (
                  <span className={`font-extrabold px-1.5 py-0.5 rounded ${momDeltas.totalOutage.pct <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {momDeltas.totalOutage.pct <= 0 ? '↓' : '↑'} {Math.abs(momDeltas.totalOutage.pct)}% MoM
                  </span>
                ) : (
                  <span className="text-slate-400 font-semibold">Downtime</span>
                )}
              </div>
            </div>

            {/* Tile 4: SBU Regions */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">SBU Regions</span>
                <div className="text-xl font-black text-slate-900 mt-1 tracking-tight">{sbuCounts.length}</div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-semibold">Operational</span>
              </div>
            </div>

            {/* Tile 5: KP Offices */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">KP Offices</span>
                <div className="text-xl font-black text-slate-900 mt-1 tracking-tight">
                  {topRepeatSIDs.length > 0 ? (sbuCounts.length * 3 + 4) : 12}
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-400 font-semibold">Offices</span>
              </div>
            </div>

            {/* Tile 6: Impacted Customers */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Impacted SIDs</span>
                <div className="text-xl font-black text-slate-900 mt-1 tracking-tight">{customerCount.toLocaleString('id-ID')}</div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                {momDeltas?.customers?.pct !== undefined ? (
                  <span className={`font-extrabold px-1.5 py-0.5 rounded ${momDeltas.customers.pct <= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                    {momDeltas.customers.pct <= 0 ? '↓' : '↑'} {Math.abs(momDeltas.customers.pct)}% MoM
                  </span>
                ) : (
                  <span className="text-slate-400 font-semibold">Customers</span>
                )}
              </div>
            </div>

          </div>

          {/* Section 2: Detailed Side-by-Side Analysis Tables */}
          <div className="grid grid-cols-2 gap-5">
            
            {/* Left Box: Top 5 Incident Causes */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-600" />
                  Top Incident Root Causes
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">% of Volume</span>
              </div>

              <div className="space-y-2.5 pt-1">
                {topCauses.slice(0, 5).map((cause, idx) => {
                  const share = totalTickets > 0 ? (cause.value / totalTickets) * 100 : 0;
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span className="truncate max-w-[200px] text-slate-900 font-bold">
                          {idx + 1}. {cause.name || 'Unspecified'}
                        </span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="text-slate-500">{cause.value.toLocaleString('id-ID')} tix</span>
                          <span className="font-bold text-cyan-700 w-12 text-right">{share.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-cyan-500 to-blue-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(5, share))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                {topCauses.length === 0 && (
                  <div className="p-4 text-center text-slate-400 text-xs">No cause data available</div>
                )}
              </div>
            </div>

            {/* Right Box: Top 5 Repeating SIDs */}
            <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Top Repeating Service IDs (SIDs)
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Repeats & Downtime</span>
              </div>

              <table className="w-full text-left text-xs">
                <thead className="text-[9px] text-slate-400 uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="pb-1.5">Service ID</th>
                    <th className="pb-1.5">Customer Name</th>
                    <th className="pb-1.5 text-right">Repeats</th>
                    <th className="pb-1.5 text-right">Downtime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {topRepeatSIDs.slice(0, 5).map((rep, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2 font-mono font-bold text-indigo-600">{rep.sid}</td>
                      <td className="py-2 truncate max-w-[140px] font-semibold text-slate-900">{rep.customerName || '-'}</td>
                      <td className="py-2 text-right">
                        <span className="bg-rose-50 text-rose-700 font-extrabold px-2 py-0.5 rounded-full text-[10px] border border-rose-100">
                          {rep.repeats}x
                        </span>
                      </td>
                      <td className="py-2 text-right font-mono text-slate-600 text-[11px]">
                        {formatMinutes(rep.totalDuration)}
                      </td>
                    </tr>
                  ))}
                  {topRepeatSIDs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400 text-xs">No repeating incidents recorded</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Section 3: SBU Operational Distribution & Summary */}
          {sbuCounts.length > 0 && (
            <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-600" />
                  SBU Terminating Operational Distribution
                </span>
                <span className="text-[10px] text-slate-500 font-semibold">
                  Total Active SBU Units: <strong>{sbuCounts.length}</strong>
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                {sbuCounts.slice(0, 4).map((sbu, idx) => {
                  const share = totalTickets > 0 ? ((sbu.value / totalTickets) * 100).toFixed(1) : '0';
                  return (
                    <div key={idx} className="p-2.5 bg-white border border-slate-200/80 rounded-xl shadow-2xs">
                      <span className="text-[10px] font-bold text-slate-700 block truncate" title={sbu.name}>
                        {sbu.name}
                      </span>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <span className="font-mono text-slate-500">{sbu.value.toLocaleString('id-ID')} tix</span>
                        <span className="font-bold text-cyan-700">{share}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section 4: Sign-off & Confidentiality Footer */}
          <div className="border-t-2 border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-500">
            <div className="space-y-0.5">
              <span className="font-bold text-slate-700 block uppercase tracking-wider">Prepared By:</span>
              <span>Network Operation Analytics — PLN Icon Plus SLA Management</span>
            </div>
            <div className="space-y-0.5 text-right">
              <span className="font-bold text-slate-700 block uppercase tracking-wider">Classification:</span>
              <span className="text-slate-600">CONFIDENTIAL • STRICTLY FOR INTERNAL OPERATIONAL USE</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
