import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingDown, 
  TrendingUp, 
  Activity, 
  Clock, 
  Layers, 
  Building2, 
  Users,
  AlertCircle
} from 'lucide-react';
import { formatMinutes } from './DashboardUtils';

export interface MoMDeltaItem {
  pct?: number;
  diff: number;
  prev: number;
  prevLabel?: string;
}

export interface DashboardMetricsProps {
  filteredDataLength: number;
  avgOutageMinutes?: number;
  totalOutageMinutes?: number;
  sbuCount: number;
  kpCount: number;
  customerCount: number;
  momDeltas?: {
    tickets?: MoMDeltaItem | null;
    avgOutage?: MoMDeltaItem | null;
    totalOutage?: MoMDeltaItem | null;
    sbu?: MoMDeltaItem | null;
    kp?: MoMDeltaItem | null;
    customers?: MoMDeltaItem | null;
  } | null;
}

export function DashboardMetrics({
  filteredDataLength,
  avgOutageMinutes = 0,
  totalOutageMinutes = 0,
  sbuCount,
  kpCount,
  customerCount,
  momDeltas = null
}: DashboardMetricsProps) {
  const ribbonRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = ribbonRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, [checkScroll]);

  const handleScroll = (direction: number) => {
    const el = ribbonRef.current;
    if (!el) return;
    // Scroll by precisely 1 card column slot
    const cardSlotWidth = (el.clientWidth / 4) + 4;
    el.scrollBy({ left: direction * cardSlotWidth, behavior: 'smooth' });
    setTimeout(checkScroll, 350);
  };

  const totalOutageHours = Math.round(totalOutageMinutes / 60);

  return (
    <div className="relative group/carousel">
      {/* Left Navigation Arrow */}
      <button
        type="button"
        onClick={() => handleScroll(-1)}
        className={`absolute -left-3.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 backdrop-blur border border-slate-300/90 shadow-lg text-slate-700 hover:text-cyan-600 flex items-center justify-center transition-all duration-200 hover:scale-110 cursor-pointer ${
          canScrollLeft ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        title="Scroll left"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Right Navigation Arrow */}
      <button
        type="button"
        onClick={() => handleScroll(1)}
        className={`absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white/95 backdrop-blur border border-slate-300/90 shadow-lg text-slate-700 hover:text-cyan-600 flex items-center justify-center transition-all duration-200 shadow-cyan-500/10 hover:scale-110 cursor-pointer ${
          canScrollRight ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        title="Scroll right"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Sliding Cards Container (Strictly 4 equal-width cards visible simultaneously on desktop) */}
      <div
        ref={ribbonRef}
        onScroll={checkScroll}
        className="flex gap-4 overflow-x-auto scroll-smooth py-1 px-0.5"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        
        {/* Card 1: TOTAL TICKETS */}
        <div className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] flex-shrink-0 border border-slate-200/80 shadow-sm p-5 rounded-2xl hover:shadow-md transition-all bg-white flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-xs font-extrabold tracking-wider uppercase">TOTAL TICKETS</p>
              <span className="text-[10px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md">Volume</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {filteredDataLength.toLocaleString('id-ID')}
            </h3>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {momDeltas?.tickets ? (
              <>
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${
                  momDeltas.tickets.pct! <= 0 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {momDeltas.tickets.pct! <= 0 ? <TrendingDown className="w-3 h-3 text-emerald-600" /> : <TrendingUp className="w-3 h-3 text-rose-600" />}
                  {momDeltas.tickets.pct! <= 0 ? '' : '+'}{momDeltas.tickets.pct}%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  vs. {momDeltas.tickets.prevLabel || 'last month'} ({momDeltas.tickets.prev.toLocaleString('id-ID')})
                </span>
              </>
            ) : (
              <span className="text-[10px] font-semibold text-slate-400">Active period count</span>
            )}
          </div>
        </div>

        {/* Card 2: AVG. OUTAGE DURATION */}
        <div className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] flex-shrink-0 border border-slate-200/80 shadow-sm p-5 rounded-2xl hover:shadow-md transition-all bg-white flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-xs font-extrabold tracking-wider uppercase">AVG. OUTAGE DURATION</p>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">Resolution</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {formatMinutes(avgOutageMinutes)}
            </h3>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {momDeltas?.avgOutage ? (
              <>
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${
                  momDeltas.avgOutage.diff <= 0 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {momDeltas.avgOutage.diff <= 0 ? <TrendingDown className="w-3 h-3 text-emerald-600" /> : <TrendingUp className="w-3 h-3 text-rose-600" />}
                  {momDeltas.avgOutage.diff <= 0 ? '' : '+'}{Math.round(momDeltas.avgOutage.diff)}m
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  vs. {momDeltas.avgOutage.prevLabel || 'last month'} ({formatMinutes(momDeltas.avgOutage.prev)})
                </span>
              </>
            ) : (
              <span className="text-[10px] font-semibold text-slate-400">{Math.round(avgOutageMinutes)} mins average</span>
            )}
          </div>
        </div>

        {/* Card 3: TOTAL OUTAGE DURATION */}
        <div className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] flex-shrink-0 border border-slate-200/80 shadow-sm p-5 rounded-2xl hover:shadow-md transition-all bg-white flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-xs font-extrabold tracking-wider uppercase">TOTAL OUTAGE</p>
              <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">Downtime</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {totalOutageHours.toLocaleString('id-ID')} hrs
            </h3>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {momDeltas?.totalOutage ? (
              <>
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${
                  momDeltas.totalOutage.pct! <= 0 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {momDeltas.totalOutage.pct! <= 0 ? <TrendingDown className="w-3 h-3 text-emerald-600" /> : <TrendingUp className="w-3 h-3 text-rose-600" />}
                  {momDeltas.totalOutage.pct! <= 0 ? '' : '+'}{momDeltas.totalOutage.pct}%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  vs. {momDeltas.totalOutage.prevLabel || 'last month'} ({Math.round(momDeltas.totalOutage.prev / 60).toLocaleString('id-ID')}h)
                </span>
              </>
            ) : (
              <span className="text-[10px] font-semibold text-slate-400">{Math.round(totalOutageMinutes).toLocaleString('id-ID')} total mins</span>
            )}
          </div>
        </div>

        {/* Card 4: SBU TERMINATING */}
        <div className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] flex-shrink-0 border border-slate-200/80 shadow-sm p-5 rounded-2xl hover:shadow-md transition-all bg-white flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-xs font-extrabold tracking-wider uppercase">SBU TERMINATING</p>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">Regions</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {sbuCount.toLocaleString('id-ID')}
            </h3>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {momDeltas?.sbu ? (
              <>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                  {momDeltas.sbu.diff === 0 ? '± 0' : (momDeltas.sbu.diff > 0 ? `+${momDeltas.sbu.diff}` : momDeltas.sbu.diff)}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  vs. {momDeltas.sbu.prevLabel || 'last month'} ({momDeltas.sbu.prev})
                </span>
              </>
            ) : (
              <span className="text-[10px] font-semibold text-slate-400">Operational units</span>
            )}
          </div>
        </div>

        {/* Card 5: KANTOR PERWAKILAN (KP) */}
        <div className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] flex-shrink-0 border border-slate-200/80 shadow-sm p-5 rounded-2xl hover:shadow-md transition-all bg-white flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-xs font-extrabold tracking-wider uppercase">KANTOR PERWAKILAN (KP)</p>
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Offices</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {kpCount.toLocaleString('id-ID')}
            </h3>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {momDeltas?.kp ? (
              <>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-slate-100 text-slate-700 border border-slate-200">
                  {momDeltas.kp.diff === 0 ? '± 0' : (momDeltas.kp.diff > 0 ? `+${momDeltas.kp.diff}` : momDeltas.kp.diff)}
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  vs. {momDeltas.kp.prevLabel || 'last month'} ({momDeltas.kp.prev})
                </span>
              </>
            ) : (
              <span className="text-[10px] font-semibold text-slate-400">Branch offices</span>
            )}
          </div>
        </div>

        {/* Card 6: IMPACTED CUSTOMERS */}
        <div className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] flex-shrink-0 border border-slate-200/80 shadow-sm p-5 rounded-2xl hover:shadow-md transition-all bg-white flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-xs font-extrabold tracking-wider uppercase">IMPACTED CUSTOMERS</p>
              <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">Customers</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2 tracking-tight">
              {customerCount.toLocaleString('id-ID')}
            </h3>
          </div>

          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            {momDeltas?.customers ? (
              <>
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[11px] font-extrabold border ${
                  momDeltas.customers.pct! <= 0 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {momDeltas.customers.pct! <= 0 ? <TrendingDown className="w-3 h-3 text-emerald-600" /> : <TrendingUp className="w-3 h-3 text-rose-600" />}
                  {momDeltas.customers.pct! <= 0 ? '' : '+'}{momDeltas.customers.pct}%
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  vs. {momDeltas.customers.prevLabel || 'last month'} ({momDeltas.customers.prev.toLocaleString('id-ID')})
                </span>
              </>
            ) : (
              <span className="text-[10px] font-semibold text-slate-400">Unique customer SIDs</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
