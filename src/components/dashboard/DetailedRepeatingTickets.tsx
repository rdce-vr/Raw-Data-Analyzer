import React from 'react';
import { AlertTriangle, Search, ChevronDown } from 'lucide-react';
import { formatMinutes, formatDateVal } from './DashboardUtils';

interface DetailedRepeatingTicketsProps {
  filteredRepSIDGroups: any[];
  paginatedRepSIDGroups: any[];
  expandedRepSIDs: Record<string, boolean>;
  setExpandedRepSIDs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  repSearchQuery: string;
  setRepSearchQuery: (val: string) => void;
  repPage: number;
  setRepPage: (page: number) => void;
  totalRepPages: number;
}

export function DetailedRepeatingTickets({
  filteredRepSIDGroups,
  paginatedRepSIDGroups,
  expandedRepSIDs,
  setExpandedRepSIDs,
  repSearchQuery,
  setRepSearchQuery,
  repPage,
  setRepPage,
  totalRepPages
}: DetailedRepeatingTicketsProps) {
  return (
    <div className="bg-slate-50/50 border border-slate-200 p-6 rounded-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-xs font-black text-indigo-750 uppercase tracking-widest flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" /> DETAILED REPEATING TICKETS REGISTRY
          </h4>
          <p className="text-xs text-slate-450 font-semibold mt-1">
            Showing {filteredRepSIDGroups.length} unique Service IDs with repeating tickets
          </p>
        </div>
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search repeating tickets..."
            value={repSearchQuery}
            onChange={(e) => { setRepSearchQuery(e.target.value); setRepPage(1); }}
            className="w-full bg-white border border-slate-350 text-slate-700 py-1.5 pl-9 pr-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-xs font-semibold placeholder-slate-400 shadow-sm"
          />
        </div>
      </div>

      <div className="space-y-3">
        {paginatedRepSIDGroups.length === 0 ? (
          <div className="p-8 text-center text-slate-450 font-bold bg-white border border-slate-200 rounded-xl">
            No matching repeating tickets found.
          </div>
        ) : (
          paginatedRepSIDGroups.map((group) => {
            const isExpanded = !!expandedRepSIDs[group.sid];
            return (
              <div key={group.sid} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-300">
                {/* SID Header Row */}
                <div 
                  onClick={() => setExpandedRepSIDs(prev => ({ ...prev, [group.sid]: !isExpanded }))}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors select-none"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <span className="bg-indigo-50 text-indigo-750 font-mono font-bold text-xs px-2.5 py-1 rounded-lg border border-indigo-100">
                      {group.sid}
                    </span>
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-slate-800 text-sm block sm:inline">{group.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-semibold sm:ml-2 block sm:inline">({group.sbuOwner})</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-6">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-extrabold">Dominant Cause</span>
                      <span className="text-xs text-slate-700 font-bold block">{group.dominantCause}</span>
                    </div>

                    <div className="text-left md:text-right">
                      <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-extrabold">Total Duration</span>
                      <span className="text-xs font-mono text-slate-700 font-bold block">
                        {group.totalDuration.toLocaleString('id-ID')} mins ({formatMinutes(group.totalDuration)})
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="bg-rose-50 border border-rose-100 text-rose-700 px-3 py-1 rounded-full font-black text-xs">
                        {group.repeats}x Repeats
                      </span>
                      <div className="text-slate-400 p-1">
                        <ChevronDown className={`w-4 h-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-650' : ''}`} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Tickets Table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/30 p-4 animate-in fade-in duration-200">
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-550 font-bold uppercase border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2 font-extrabold text-[9px] tracking-wider">Ticket ID</th>
                            <th className="px-4 py-2 font-extrabold text-[9px] tracking-wider">Open Date</th>
                            <th className="px-4 py-2 font-extrabold text-[9px] tracking-wider">Duration</th>
                            <th className="px-4 py-2 font-extrabold text-[9px] tracking-wider">Ticket Cause</th>
                            <th className="px-4 py-2 font-extrabold text-[9px] tracking-wider">SBU Owner</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {group.tickets.map((ticket: any) => (
                            <tr key={ticket.idtiket} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-2.5 font-mono font-bold text-indigo-600">{ticket.idtiket}</td>
                              <td className="px-4 py-2.5 text-slate-500 font-mono text-[11px]">
                                {formatDateVal(ticket.waktulapor || ticket.tanggalinsiden || ticket.waktugangguan2)}
                              </td>
                              <td className="px-4 py-2.5 font-mono text-slate-600">
                                {parseFloat(ticket.durasigangguanmenit || 0).toLocaleString('id-ID')} m ({formatMinutes(parseFloat(ticket.durasigangguanmenit || 0))})
                              </td>
                              <td className="px-4 py-2.5 text-slate-800 font-bold">{ticket.penyebab || '-'}</td>
                              <td className="px-4 py-2.5 text-slate-500 font-semibold">{ticket.namasbu || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Controls */}
      {totalRepPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <span className="text-xs text-slate-405 font-semibold">
            Page {repPage} of {totalRepPages}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setRepPage(Math.max(repPage - 1, 1))}
              disabled={repPage === 1}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-655 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Prev
            </button>
            <button
              onClick={() => setRepPage(Math.min(repPage + 1, totalRepPages))}
              disabled={repPage === totalRepPages}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-bold text-slate-655 hover:bg-slate-100 disabled:opacity-40 transition-colors cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
