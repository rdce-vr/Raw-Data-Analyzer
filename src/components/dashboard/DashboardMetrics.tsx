import React from 'react';

interface DashboardMetricsProps {
  filteredDataLength: number;
  sbuCount: number;
  kpCount: number;
  customerCount: number;
}

export function DashboardMetrics({
  filteredDataLength,
  sbuCount,
  kpCount,
  customerCount
}: DashboardMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl hover:shadow-lg transition-all duration-300 glass-card hover:-translate-y-1">
        <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">TOTAL TICKETS</p>
        <h3 className="text-3xl font-black text-slate-900 mt-2">{filteredDataLength.toLocaleString('id-ID')}</h3>
        <span className="text-xs font-semibold text-cyan-600 bg-cyan-50 px-2.5 py-1 rounded-md mt-3 inline-block">Volume</span>
      </div>
      <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl hover:shadow-lg transition-all duration-300 glass-card hover:-translate-y-1">
        <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">SBU OWNERS</p>
        <h3 className="text-3xl font-black text-slate-900 mt-2">{sbuCount.toLocaleString('id-ID')}</h3>
        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md mt-3 inline-block">Regions</span>
      </div>
      <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl hover:shadow-lg transition-all duration-300 glass-card hover:-translate-y-1">
        <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">KANTOR PERWAKILAN (KP)</p>
        <h3 className="text-3xl font-black text-slate-900 mt-2">{kpCount.toLocaleString('id-ID')}</h3>
        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md mt-3 inline-block">Offices</span>
      </div>
      <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl hover:shadow-lg transition-all duration-300 glass-card hover:-translate-y-1">
        <p className="text-slate-500 text-xs font-bold tracking-wider uppercase">IMPACTED CUSTOMERS</p>
        <h3 className="text-3xl font-black text-slate-900 mt-2">{customerCount.toLocaleString('id-ID')}</h3>
        <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-md mt-3 inline-block">Customers</span>
      </div>
    </div>
  );
}
