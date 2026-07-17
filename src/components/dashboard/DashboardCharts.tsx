import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Target, Layers, Users } from 'lucide-react';
import { COLORS, PIE_COLORS } from './DashboardUtils';

interface KpTicketVolumeChartProps {
  kpCounts: any[];
}

interface RevenuePerformanceChartProps {
  summaryData: any[];
}

interface ServiceSidAllocationChartProps {
  summaryData: any[];
}

// Reusable Custom Tooltip component for Recharts
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100 ring-1 ring-black/5 text-xs">
        <p className="font-semibold text-slate-800 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
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

export function KpTicketVolumeChart({ kpCounts }: KpTicketVolumeChartProps) {
  const data = kpCounts?.slice(0, 12) || [];
  return (
    <div className="border border-slate-200/80 shadow-md shadow-slate-100/50 p-6 rounded-2xl glass-card bg-white">
      <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
        <Target className="w-5 h-5 text-emerald-500" /> Top Kantor Perwakilan (KP)
      </h3>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 25 }}>
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
  );
}

export function RevenuePerformanceChart({ summaryData }: RevenuePerformanceChartProps) {
  return (
    <div className="lg:col-span-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
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
  );
}

export function ServiceSidAllocationChart({ summaryData }: ServiceSidAllocationChartProps) {
  return (
    <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
      <div>
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
      </div>
      <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-semibold text-slate-650 border-t border-slate-100 pt-4">
        {summaryData.slice(0, 4).map((item: any, idx: number) => (
          <div key={idx} className="flex items-center gap-1.5 truncate">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
            <span className="truncate">{item.namaLayanan}: </span>
            <span className="font-extrabold text-slate-900">{item.Total_SID}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
