import React from 'react';
import { Check, ChevronRight, CloudRain, Droplets } from 'lucide-react';
import { FieldIntelligenceViewModel } from './fieldDashboardModel';

interface WaterIrrigationCardProps {
  model: FieldIntelligenceViewModel;
  onViewDetails: () => void;
  onQuickLogIrrigation: () => void;
}

export const WaterIrrigationCard: React.FC<WaterIrrigationCardProps> = ({
  model,
  onViewDetails,
  onQuickLogIrrigation,
}) => {
  const { water } = model;
  // Semicircle path M 15 85 A 65 65 0 0 1 145 85 has radius 65 -> arc length = pi * 65 = 204.2035
  const arcLength = Math.PI * 65;
  const clampedPct = Math.max(4, Math.min(100, water.soilMoisturePct));
  const filledLen = (clampedPct / 100) * arcLength;

  return (
    <section
      aria-label="Water & Irrigation"
      onClick={onViewDetails}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onViewDetails();
        }
      }}
      className="relative rounded-[19px] border border-emerald-700/20 dark:border-[#35ED91]/32 bg-white/75 dark:bg-[#052B1C]/78 backdrop-blur-xl shadow-[0_10px_28px_rgba(4,40,26,0.12)] dark:shadow-[0_0_25px_rgba(0,192,89,0.09),inset_0_1px_0_rgba(255,255,255,0.08),0_10px_28px_rgba(0,0,0,0.30)] px-4 py-3 xl:px-5 xl:py-3.5 flex flex-col justify-between gap-2 transition-all cursor-pointer hover:border-emerald-500/50 dark:hover:border-[#35ED91]/60"
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-emerald-900/10 dark:border-[#9FD3B8]/18">
        <div className="flex items-center gap-2.5">
          <span className="w-6.5 h-6.5 rounded-lg bg-sky-500/15 dark:bg-[#38BFEF]/15 inline-flex items-center justify-center">
            <Droplets className="w-4 h-4 text-sky-600 dark:text-[#38BFEF] fill-sky-500/40 dark:fill-[#38BFEF]/60" />
          </span>
          <h3 className="text-[16.5px] xl:text-[18px] font-bold text-[#05291B] dark:text-white tracking-tight">
            Water &amp; Irrigation
          </h3>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="text-[12.5px] font-semibold text-emerald-700 dark:text-[#35ED91] hover:underline cursor-pointer whitespace-nowrap"
        >
          View Details →
        </button>
      </div>

      {/* Main Split: 3 Metrics + Recommendation Banner (Left) | Semicircular Moisture Gauge (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-[71fr_29fr] items-center gap-3 flex-1">
        <div className="flex flex-col justify-between gap-3">
          {/* 3 Equal Columns */}
          <div className="grid grid-cols-3 divide-x divide-emerald-900/12 dark:divide-[#9FD3B8]/18 text-center">
            {/* Crop Demand */}
            <div className="px-2 flex flex-col items-center justify-start gap-1">
              <Droplets className="w-4.5 h-4.5 text-sky-600 dark:text-[#38BFEF] fill-sky-500/50 dark:fill-[#38BFEF]/70" />
              <div className="text-[16px] xl:text-[18px] font-bold text-[#05291B] dark:text-white tabular-nums leading-tight">
                {water.cropDemandMmDay.toFixed(1)} mm/day
              </div>
              <div className="text-[11.5px] text-[#2A5E49] dark:text-[#C3D3C8] leading-tight">
                Crop Demand
              </div>
            </div>

            {/* Effective Rain */}
            <div className="px-2 flex flex-col items-center justify-start gap-1">
              <CloudRain className="w-4.5 h-4.5 text-sky-500 dark:text-[#7DD3FC]" />
              <div className="text-[16px] xl:text-[18px] font-bold text-[#05291B] dark:text-white tabular-nums leading-tight">
                {water.effectiveRain7dMm.toFixed(1)} mm
              </div>
              <div className="text-[11.5px] text-[#2A5E49] dark:text-[#C3D3C8] leading-tight">
                Effective Rain
                <br />
                <span className="opacity-80">(Last 7 days)</span>
              </div>
            </div>

            {/* Irrigation Needed */}
            <div className="px-2 flex flex-col items-center justify-start gap-1">
              <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5" aria-hidden="true">
                <path
                  d="M4 18h16M7 18v-3a5 5 0 0 1 10 0v3M12 10V5M8.5 7.5 7 5M15.5 7.5 17 5"
                  stroke="#22C55E"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <div className="text-[16px] xl:text-[18px] font-bold text-[#05291B] dark:text-white tabular-nums leading-tight">
                {water.irrigationNeededMm.toFixed(1)} mm
              </div>
              <div className="text-[11.5px] text-[#2A5E49] dark:text-[#C3D3C8] leading-tight">
                Irrigation Needed
                <br />
                <span className="opacity-80">(Today)</span>
              </div>
            </div>
          </div>

          {/* Glowing Green Recommendation Banner */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQuickLogIrrigation();
            }}
            className="w-full rounded-[14px] border border-emerald-600/35 dark:border-[#35ED91]/40 bg-emerald-500/12 dark:bg-[#0D432A]/75 hover:bg-emerald-500/18 dark:hover:bg-[#115234]/85 px-3.5 py-2.5 flex items-center justify-between gap-2.5 text-left transition-all shadow-[0_0_20px_rgba(19,214,107,0.12)] cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-full bg-[#16D979] text-[#032613] inline-flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(22,217,121,0.45)]">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </span>
              <div className="text-[12.5px] xl:text-[13.5px] leading-snug text-[#05291B] dark:text-[#E6F4EC] min-w-0">
                <div className="truncate">
                  <strong className="font-bold text-emerald-800 dark:text-[#35ED91]">
                    Recommended:
                  </strong>{' '}
                  Apply {water.irrigationNeededMm.toFixed(1)} mm today in {water.recommendedCycles}{' '}
                  cycle{water.recommendedCycles > 1 ? 's' : ''}
                </div>
                <div className="text-[#1E4F3D] dark:text-[#C3D3C8] tabular-nums truncate">
                  (~{water.recommendedVolumeM3.toLocaleString()} m³ for {model.fieldAreaLabel}) at{' '}
                  {water.recommendedTimeLabel}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-emerald-700 dark:text-[#78CC92] shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Right: Semicircular Soil Moisture Gauge */}
        <div className="lg:border-l border-emerald-900/12 dark:border-[#9FD3B8]/18 lg:pl-3 flex flex-col items-center justify-center py-0.5">
          <div className="relative w-[136px] xl:w-[148px] h-[84px] xl:h-[92px] flex items-end justify-center">
            <svg viewBox="0 0 160 98" className="w-full h-full overflow-visible" aria-hidden="true">
              <path
                d="M 15 85 A 65 65 0 0 1 145 85"
                fill="none"
                stroke="currentColor"
                className="text-emerald-950/15 dark:text-[#24463A]"
                strokeWidth="13.5"
                strokeLinecap="round"
              />
              <path
                d="M 15 85 A 65 65 0 0 1 145 85"
                fill="none"
                stroke={
                  clampedPct >= 50 ? '#16D979' : clampedPct >= 28 ? '#FFBE32' : '#EF4444'
                }
                strokeWidth="13.5"
                strokeLinecap="round"
                strokeDasharray={`${filledLen.toFixed(1)} ${arcLength.toFixed(1)}`}
              />
            </svg>
            <div className="absolute bottom-1.5 inset-x-0 text-center text-[24px] xl:text-[27px] font-bold text-[#05291B] dark:text-white tabular-nums leading-none">
              {water.soilMoisturePct}%
            </div>
          </div>
          <div className="mt-1 text-center">
            <div className="text-[14.5px] xl:text-[15.5px] font-semibold text-[#05291B] dark:text-white leading-tight">
              Soil Moisture
            </div>
            <div className="text-[12px] font-medium text-emerald-700 dark:text-[#8BCF9C]">
              ({water.soilMoistureStatusText})
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
