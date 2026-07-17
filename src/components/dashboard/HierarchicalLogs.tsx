import React from 'react';
import { Database, Search, Plus, Minus, ChevronRight } from 'lucide-react';
import { formatMinutes, formatDateVal } from './DashboardUtils';

interface HierarchicalLogsProps {
  custSearchQuery: string;
  setCustSearchQuery: (val: string) => void;
  paginatedCustomers: any[];
  expandedCustomers: Record<string, boolean>;
  setExpandedCustomers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedSIDs: Record<string, boolean>;
  setExpandedSIDs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  sidFrequency: Record<string, number>;
  custPage: number;
  setCustPage: React.Dispatch<React.SetStateAction<number>>;
  totalPages: number;
}

export function HierarchicalLogs({
  custSearchQuery,
  setCustSearchQuery,
  paginatedCustomers,
  expandedCustomers,
  setExpandedCustomers,
  expandedSIDs,
  setExpandedSIDs,
  sidFrequency,
  custPage,
  setCustPage,
  totalPages
}: HierarchicalLogsProps) {
  return (
    <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 rounded-2xl space-y-6 p-6 glass-card bg-white">
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
                  className="px-6 py-4 bg-slate-55/20 hover:bg-slate-100/60 flex items-center justify-between cursor-pointer select-none transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`p-1.5 rounded-lg transition-colors ${isCustExpanded ? 'bg-cyan-50 text-cyan-600' : 'bg-slate-100 text-slate-500'}`}>
                      {isCustExpanded ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-slate-800 text-sm md:text-base truncate flex flex-wrap items-center gap-2">
                        <span>{cust.name}</span>
                        <span className="text-xs font-mono font-medium text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded">
                          ID: {cust.id}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span>{cust.sids.length} Service {cust.sids.length > 1 ? 'IDs' : 'ID'} (SIDs) registered</span>
                        <span className="hidden sm:inline w-1 h-1 rounded-full bg-slate-300" />
                        <span className="text-[11px] text-cyan-700 bg-cyan-50/60 border border-cyan-100/50 px-2 py-0.5 rounded-md font-bold">
                          Avg Resolve: {formatMinutes(cust.avgResolveTime)}
                        </span>
                      </div>
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
                            className="px-5 py-3.5 hover:bg-slate-100/55 flex items-center justify-between cursor-pointer select-none transition-colors"
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
                                <thead className="bg-slate-50 text-slate-550 font-bold uppercase tracking-wider border-b border-slate-200">
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
                                      <td className="px-4 py-2.5 text-slate-650 font-semibold">{t.namasbu || '-'}</td>
                                      <td className="px-4 py-2.5 text-slate-550">{t.namakp || '-'}</td>
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
          <span className="text-xs text-slate-450 font-semibold">
            Page {custPage} of {totalPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCustPage(prev => Math.max(prev - 1, 1))}
              disabled={custPage === 1}
              className="px-3.5 py-2 border border-slate-350 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Prev
            </button>
            <button
              onClick={() => setCustPage(prev => Math.min(prev + 1, totalPages))}
              disabled={custPage === totalPages}
              className="px-3.5 py-2 border border-slate-350 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
