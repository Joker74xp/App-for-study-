import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import {
  BayesianPrediction,
  CycleRecord,
  PhenotypeProfile,
  TaxonomyDictionary,
} from '../types/health';

interface BayesianDashboardViewProps {
  cycles: CycleRecord[];
  prediction: BayesianPrediction;
  phenotype: PhenotypeProfile;
  onChangePhenotype: (p: PhenotypeProfile) => void;
  onAddCycle: (cycle: CycleRecord) => void;
  taxonomy: TaxonomyDictionary;
}

const BODY_PROFILES: {
  id: PhenotypeProfile;
  title: string;
  plainExplanation: string;
  typicalRange: string;
}[] = [
  {
    id: 'irregular-pcos',
    title: 'Irregular Cycles or PCOS',
    plainExplanation:
      'Expects longer or shifting gap days between cycles so you never get false "late" alarms.',
    typicalRange: 'Commonly 32–45+ days',
  },
  {
    id: 'endometriosis',
    title: 'Endometriosis / Pelvic Pain',
    plainExplanation:
      'Adapts to luteal shifts, spotting, and flare-up patterns with gentle symptom tracking.',
    typicalRange: 'Commonly 24–32 days',
  },
  {
    id: 'perimenopause',
    title: 'Perimenopause Transition',
    plainExplanation:
      'Handles sudden shorter or skipped cycles naturally as hormone rhythms change over time.',
    typicalRange: 'High month-to-month change',
  },
  {
    id: 'postpartum-transition',
    title: 'Post-Partum / Returning Cycle',
    plainExplanation:
      'Gently learns your rhythm as ovulation returns after pregnancy or chest/breastfeeding.',
    typicalRange: 'Gradual stabilization',
  },
  {
    id: 'standard-ovulatory',
    title: 'Consistent / Regular Cycle',
    plainExplanation:
      'Gives a tight, narrow 2-to-3 day window when your historical dates are already steady.',
    typicalRange: 'Commonly 26–31 days',
  },
];

function formatFriendlyDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export const BayesianDashboardView: React.FC<BayesianDashboardViewProps> = ({
  cycles,
  prediction,
  phenotype,
  onChangePhenotype,
  onAddCycle,
  taxonomy,
}) => {
  const [showLogForm, setShowLogForm] = useState(false);
  const [startDate, setStartDate] = useState('2026-10-30');
  const [lengthDays, setLengthDays] = useState('37');
  const [bleedingDays, setBleedingDays] = useState('5');
  const [notes, setNotes] = useState('');
  const [showMathDetails, setShowMathDetails] = useState(false);

  const handleCreateCycle = (e: React.FormEvent) => {
    e.preventDefault();
    const len = Math.max(15, Math.min(110, Number(lengthDays) || 35));
    const bleed = Math.max(1, Math.min(20, Number(bleedingDays) || 5));
    const newRec: CycleRecord = {
      id: `cyc-${Date.now()}`,
      startDate,
      lengthDays: len,
      bleedingDays: bleed,
      ovulationDayEst: Math.max(10, len - 13),
      lutealLengthEst: 13,
      notes: notes.trim() || `Logged ${taxonomy.primaryEventNoun.toLowerCase()} record.`,
      symptoms: [],
      bbtAvgCelsius: 36.45,
    };
    onAddCycle(newRec);
    setNotes('');
    setShowLogForm(false);
  };

  // Visual chart geometry
  const curvePoints = prediction.densityCurve;
  const maxProb = Math.max(...curvePoints.map((d) => d.probability), 1);
  const svgWidth = 680;
  const svgHeight = 190;
  const padLeft = 36;
  const padRight = 24;
  const padTop = 26;
  const padBottom = 32;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const minDay = curvePoints[0]?.day ?? 20;
  const maxDay = curvePoints[curvePoints.length - 1]?.day ?? 50;
  const daySpan = Math.max(1, maxDay - minDay);

  const xForDay = (d: number) => padLeft + ((d - minDay) / daySpan) * plotW;
  const yForProb = (p: number) => padTop + plotH - (p / maxProb) * plotH;

  const linePath = curvePoints
    .map(
      (pt, idx) =>
        `${idx === 0 ? 'M' : 'L'} ${xForDay(pt.day).toFixed(1)} ${yForProb(pt.probability).toFixed(1)}`
    )
    .join(' ');

  const buildBandArea = (filterFn: (pt: (typeof curvePoints)[0]) => boolean) => {
    const pts = curvePoints.filter(filterFn);
    if (pts.length < 2) return '';
    const topEdge = pts
      .map(
        (pt, idx) =>
          `${idx === 0 ? 'M' : 'L'} ${xForDay(pt.day).toFixed(1)} ${yForProb(pt.probability).toFixed(1)}`
      )
      .join(' ');
    const lastX = xForDay(pts[pts.length - 1].day).toFixed(1);
    const firstX = xForDay(pts[0].day).toFixed(1);
    const baseY = (padTop + plotH).toFixed(1);
    return `${topEdge} L ${lastX} ${baseY} L ${firstX} ${baseY} Z`;
  };

  const area90Path = buildBandArea((pt) => pt.in90);
  const area68Path = buildBandArea((pt) => pt.in68);

  const currentProfile =
    BODY_PROFILES.find((b) => b.id === phenotype) || BODY_PROFILES[0];

  return (
    <div className="space-y-6">
      {/* Page Header & Summary */}
      <div className="vespera-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs text-[var(--text-muted)] mb-1">
              Page 3 of 8 · Adaptive Machine Learning for Irregular Cycles &amp; PCOS
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              Your Smart {taxonomy.primaryEventNoun} Range &amp; Body Profile
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Current Profile: <strong>{currentProfile.title}</strong> · Typical Length:{' '}
              <strong>
                {prediction.posteriorMean} days (±{Math.round(prediction.posteriorStdDev)}d)
              </strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLogForm(!showLogForm)}
            className="min-h-[42px] px-4 py-2 rounded-xl vespera-btn-primary text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Add Past {taxonomy.primaryEventNoun}</span>
          </button>
        </div>
      </div>

      {/* Add Cycle Drawer */}
      {showLogForm && (
        <form
          onSubmit={handleCreateCycle}
          className="vespera-card rounded-2xl p-5 sm:p-6 space-y-4 border-2 border-[var(--accent-primary)]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-base font-semibold">Add a Past {taxonomy.primaryEventNoun}</h3>
            <button
              type="button"
              onClick={() => setShowLogForm(false)}
              className="text-xs text-[var(--text-muted)]"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl vespera-subtle text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Total Length (Days)
              </label>
              <input
                type="number"
                min={15}
                max={110}
                value={lengthDays}
                onChange={(e) => setLengthDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl vespera-subtle text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                {taxonomy.flowLabel} Days
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={bleedingDays}
                onChange={(e) => setBleedingDays(e.target.value)}
                className="w-full px-3 py-2 rounded-xl vespera-subtle text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Notes
              </label>
              <input
                type="text"
                placeholder="e.g., Delayed surge"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl vespera-subtle text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowLogForm(false)}
              className="min-h-[40px] px-4 py-2 rounded-xl vespera-subtle text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-xl vespera-btn-primary text-xs font-semibold"
            >
              Save &amp; Update Model
            </button>
          </div>
        </form>
      )}

      {/* Main 2-Column Split: Visual Confidence Curve + Body Profile Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left 7 Cols: Easy-to-Read Visual Forecast */}
        <div className="lg:col-span-7 vespera-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="pb-4 border-b border-[var(--border-subtle)]">
              <h3 className="text-base sm:text-lg font-semibold">
                Why 28-Day Apps Fail vs. Your Realistic Window
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                The shaded teal zone shows your high-confidence window (Days {prediction.ci68Low}–
                {prediction.ci68High})
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-secondary)] mt-4 mb-2">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[var(--accent-primary)] inline-block" />
                <span>
                  Most Likely (Days {prediction.ci68Low}–{prediction.ci68High})
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-sm inline-block border border-[var(--accent-primary)]"
                  style={{ backgroundColor: 'var(--accent-band)' }}
                />
                <span>
                  Outer Range (Days {prediction.ci90Low}–{prediction.ci90High})
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[var(--status-alert)] inline-block" />
                <span>28-Day App Wrong Guess</span>
              </span>
            </div>

            <div className="vespera-subtle rounded-xl p-3 overflow-x-auto">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-48 overflow-visible"
              >
                {[0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = padTop + plotH * (1 - ratio);
                  return (
                    <line
                      key={idx}
                      x1={padLeft}
                      y1={y}
                      x2={svgWidth - padRight}
                      y2={y}
                      stroke="var(--border-subtle)"
                      strokeDasharray="3 3"
                    />
                  );
                })}

                {area90Path && <path d={area90Path} fill="var(--accent-band)" />}
                {area68Path && (
                  <path d={area68Path} fill="var(--accent-primary)" fillOpacity={0.3} />
                )}

                {28 >= minDay && 28 <= maxDay && (
                  <g>
                    <line
                      x1={xForDay(28)}
                      y1={padTop}
                      x2={xForDay(28)}
                      y2={padTop + plotH}
                      stroke="var(--status-alert)"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                    />
                    <text
                      x={xForDay(28) + 6}
                      y={padTop + 12}
                      fill="var(--status-alert)"
                      fontSize="10"
                      fontWeight="600"
                    >
                      28-Day Guess
                    </text>
                  </g>
                )}

                <line
                  x1={xForDay(prediction.posteriorMean)}
                  y1={padTop}
                  x2={xForDay(prediction.posteriorMean)}
                  y2={padTop + plotH}
                  stroke="var(--accent-primary)"
                  strokeWidth={2}
                />
                <text
                  x={xForDay(prediction.posteriorMean) + 6}
                  y={padTop + 26}
                  fill="var(--text-primary)"
                  fontSize="11"
                  fontWeight="600"
                >
                  Center: Day {prediction.posteriorMean}
                </text>

                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--accent-primary)"
                  strokeWidth={2.5}
                />

                {curvePoints
                  .filter((_, i) => i % 4 === 0)
                  .map((pt) => (
                    <text
                      key={pt.day}
                      x={xForDay(pt.day)}
                      y={svgHeight - 8}
                      textAnchor="middle"
                      fill="var(--text-muted)"
                      fontSize="10"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      Day {pt.day}
                    </text>
                  ))}
              </svg>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setShowMathDetails(!showMathDetails)}
              className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
            >
              {showMathDetails ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              <span>
                {showMathDetails
                  ? 'Hide how the adaptive prediction works'
                  : 'How does Vespera calculate this for irregular cycles?'}
              </span>
            </button>
            {showMathDetails && (
              <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
                Vespera combines your selected body profile ({currentProfile.title}) with your
                recent cycle lengths using Bayesian machine learning, giving extra weight to recent
                months so one long PCOS cycle widens your window smoothly instead of breaking your
                calendar.
              </p>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Choose Your Body Pattern */}
        <div className="lg:col-span-5 vespera-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-1">
              Tap Your Body&apos;s Pattern
            </h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Select a profile below to watch the chart adapt immediately:
            </p>

            <div className="space-y-2.5">
              {BODY_PROFILES.map((prof) => {
                const active = phenotype === prof.id;
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => onChangePhenotype(prof.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-transform active:scale-[0.98] ${
                      active
                        ? 'vespera-subtle border-[var(--accent-primary)]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-[var(--text-primary)]">
                        {prof.title}
                      </span>
                      <span className="text-[11px] font-mono text-[var(--accent-primary)] font-semibold shrink-0">
                        {active ? 'Selected' : prof.typicalRange}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {prof.plainExplanation}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Past Cycles History (Mobile Touch Cards + Desktop Table) */}
      <div className="vespera-card rounded-2xl p-4 sm:p-6">
        <div className="mb-4">
          <h3 className="text-base font-semibold">
            Your Past {taxonomy.primaryEventNoun} History ({cycles.length} Logged)
          </h3>
          <p className="text-xs text-[var(--text-muted)]">
            Even when total cycle length changes (32 to 44 days), your post-ovulation phase stays
            steady at ~13–14 days
          </p>
        </div>

        {/* Mobile Touch Cards */}
        <div className="md:hidden space-y-2.5">
          {[...cycles].reverse().map((c) => (
            <div key={c.id} className="vespera-subtle rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono tabular-nums font-bold">
                  {formatFriendlyDate(c.startDate)}, {c.startDate.slice(0, 4)}
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-[var(--accent-primary)]">
                  {c.lengthDays} days total
                </span>
              </div>
              <div className="text-xs text-[var(--text-secondary)] font-mono tabular-nums">
                {c.bleedingDays} {taxonomy.flowLabel.toLowerCase()} days ·{' '}
                {c.ovulationDayEst ? `Ovulation ~Day ${c.ovulationDayEst}` : 'Logged'}
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{c.notes}</p>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                <th className="py-2.5 pr-4 font-medium">Start Date</th>
                <th className="py-2.5 px-4 font-medium text-right">Total Length</th>
                <th className="py-2.5 px-4 font-medium text-right">{taxonomy.flowLabel} Days</th>
                <th className="py-2.5 px-4 font-medium text-right">Estimated Ovulation</th>
                <th className="py-2.5 pl-4 font-medium">What You Noted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {[...cycles].reverse().map((c) => (
                <tr key={c.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="py-3 pr-4 font-mono tabular-nums font-medium">
                    {formatFriendlyDate(c.startDate)} ({c.startDate.slice(0, 4)})
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[var(--accent-primary)]">
                    {c.lengthDays} days
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums">
                    {c.bleedingDays} days
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-[var(--text-secondary)]">
                    {c.ovulationDayEst ? `Around Day ${c.ovulationDayEst}` : '—'}
                  </td>
                  <td className="py-3 pl-4 text-[var(--text-secondary)]">{c.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
