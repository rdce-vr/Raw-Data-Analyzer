import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { AlertTriangle, HelpCircle, Clock } from 'lucide-react';
import { formatMinutes } from './DashboardUtils';

interface RepeatingIncidentCausesProps {
  repeatingStats: {
    totalTickets: number;
    totalRepeating: number;
    repeatingRate: number;
    maxRepeats: number;
    avgRepeats: number;
    distribution: any[];
    topCauses: any[];
  };
  selectedSBU: string;
}

export function RepeatingIncidentCauses({
  repeatingStats,
  selectedSBU
}: RepeatingIncidentCausesProps) {
  // Reusable custom tooltip for the frequency distribution bar chart
  const SimpleTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-md border border-slate-100 ring-1 ring-black/5 text-xs font-semibold">
          <p className="text-slate-800 mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="text-indigo-600">
              {entry.name}: {entry.value.toLocaleString('id-ID')}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-8 rounded-2xl glass-card space-y-6 bg-white">
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
                    <Tooltip content={<SimpleTooltip />} />
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
                          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-55/30 text-[10px] font-bold text-indigo-650">
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
        </>
      )}
    </div>
  );
}
