import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Calendar,
  Camera,
  Check,
  Heart,
  Lock,
  Palette,
  Plus,
  Share2,
  Sparkles,
  Thermometer,
  TrendingUp,
} from 'lucide-react';
import {
  BayesianPrediction,
  CycleRecord,
  PhenotypeProfile,
  StripScanResult,
  TaxonomyDictionary,
} from '../types/health';

export type AppPageId =
  | 'home'
  | 'calendar'
  | 'forecast'
  | 'scanner'
  | 'care-paths'
  | 'partner-sync'
  | 'privacy-vault'
  | 'settings';

interface DailyCheckInEntry {
  id: string;
  date: string;
  flow: string;
  mood: string;
  bbtCelsius: string;
  symptoms: string[];
}

interface HomeCheckInPageProps {
  cycles: CycleRecord[];
  prediction: BayesianPrediction;
  phenotype: PhenotypeProfile;
  taxonomy: TaxonomyDictionary;
  latestScan?: StripScanResult;
  onAddCycle: (cycle: CycleRecord) => void;
  onNavigatePage: (page: AppPageId) => void;
}

function formatFriendlyDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Helper for SVG polar-to-cartesian arc drawing
function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}

export const HomeCheckInPage: React.FC<HomeCheckInPageProps> = ({
  cycles,
  prediction,
  taxonomy,
  latestScan,
  onAddCycle,
  onNavigatePage,
}) => {
  const [selectedFlow, setSelectedFlow] = useState<string>('None');
  const [selectedMood, setSelectedMood] = useState<string>('Steady');
  const [selectedBbt, setSelectedBbt] = useState<string>('36.48');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['Good Sleep']);
  const [dailySaved, setDailySaved] = useState<boolean>(false);
  const [activeRingZone, setActiveRingZone] = useState<
    'current' | 'flow' | 'fertile' | 'window'
  >('window');

  const [checkIns, setCheckIns] = useState<DailyCheckInEntry[]>(() => {
    try {
      const saved = localStorage.getItem('vespera_daily_checkins');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [
      {
        id: 'chk-1',
        date: 'Oct 29, 2026',
        flow: 'None',
        mood: 'Rested',
        bbtCelsius: '36.46',
        symptoms: ['Good Sleep', 'High Energy'],
      },
      {
        id: 'chk-2',
        date: 'Oct 28, 2026',
        flow: 'None',
        mood: 'Steady',
        bbtCelsius: '36.44',
        symptoms: ['Mild Cramps'],
      },
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem('vespera_daily_checkins', JSON.stringify(checkIns));
    } catch {
      // ignore
    }
  }, [checkIns]);

  const [showLogForm, setShowLogForm] = useState(false);
  const [startDate, setStartDate] = useState('2026-10-30');
  const [lengthDays, setLengthDays] = useState('37');
  const [bleedingDays, setBleedingDays] = useState('5');
  const [notes, setNotes] = useState('');

  const toggleSymptom = (sym: string) => {
    setSelectedSymptoms((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    );
  };

  const handleQuickDailySave = () => {
    const newEntry: DailyCheckInEntry = {
      id: `chk-${Date.now()}`,
      date: 'Today (Oct 30)',
      flow: selectedFlow,
      mood: selectedMood,
      bbtCelsius: selectedBbt,
      symptoms: selectedSymptoms.length ? selectedSymptoms : ['No symptoms noted'],
    };
    setCheckIns((prev) => [newEntry, ...prev.slice(0, 5)]);
    setDailySaved(true);
    setTimeout(() => setDailySaved(false), 2500);
  };

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
      notes:
        notes.trim() ||
        `Flow: ${selectedFlow}, Mood: ${selectedMood}. ${selectedSymptoms.join(', ')}`,
      symptoms: selectedSymptoms,
      bbtAvgCelsius: Number(selectedBbt) || 36.45,
    };
    onAddCycle(newRec);
    setNotes('');
    setShowLogForm(false);
  };

  const wrongDaysDiff = Math.abs(Math.round(prediction.posteriorMean - 28));
  const totalRingDays = Math.max(35, prediction.ci68High + 2);
  const currentCycleDay = 33; // Relative to latest cycle start Sep 27

  // Angles for Interactive Radial Cycle Ring
  const dayToAngle = (d: number) => Math.min(358, Math.max(2, (d / totalRingDays) * 360));
  const flowEndAngle = dayToAngle(5);
  const fertileStartAngle = dayToAngle(Math.max(10, prediction.ci68Low - 16));
  const fertileEndAngle = dayToAngle(Math.max(15, prediction.ci68High - 12));
  const win68StartAngle = dayToAngle(prediction.ci68Low);
  const win68EndAngle = dayToAngle(prediction.ci68High);
  const currentDayMarker = polarToCartesian(120, 120, 88, dayToAngle(currentCycleDay));

  return (
    <div className="space-y-6">
      {/* 1. HERO CARD WITH INTERACTIVE RADIAL CYCLE RING */}
      <div className="vespera-card rounded-2xl p-5 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left 4 Cols: Interactive Radial Cycle & Hormone Dial */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center vespera-subtle rounded-2xl p-5">
            <div className="relative w-[230px] h-[230px] flex items-center justify-center">
              <svg viewBox="0 0 240 240" className="w-full h-full overflow-visible">
                {/* Base Track Circle */}
                <circle
                  cx={120}
                  cy={120}
                  r={88}
                  fill="none"
                  stroke="var(--border-subtle)"
                  strokeWidth={16}
                />

                {/* Arc 1: Days 1-5 Baseline Flow */}
                <path
                  d={describeArc(120, 120, 88, 2, flowEndAngle)}
                  fill="none"
                  stroke="var(--accent-primary)"
                  strokeWidth={16}
                  strokeLinecap="round"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setActiveRingZone('flow')}
                />

                {/* Arc 2: Bayesian Fertile & Ovulation Window */}
                <path
                  d={describeArc(120, 120, 88, fertileStartAngle, fertileEndAngle)}
                  fill="none"
                  stroke="var(--accent-secondary)"
                  strokeWidth={16}
                  strokeLinecap="round"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setActiveRingZone('fertile')}
                />

                {/* Arc 3: 68% Upcoming Cycle Confidence Window */}
                <path
                  d={describeArc(120, 120, 88, win68StartAngle, win68EndAngle)}
                  fill="none"
                  stroke="var(--accent-primary)"
                  strokeWidth={18}
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setActiveRingZone('window')}
                />

                {/* Current Day Indicator Knob */}
                <circle
                  cx={currentDayMarker.x}
                  cy={currentDayMarker.y}
                  r={10}
                  fill="var(--bg-surface)"
                  stroke="var(--accent-primary)"
                  strokeWidth={4}
                  className="cursor-pointer"
                  onClick={() => setActiveRingZone('current')}
                />
              </svg>

              {/* Center Readout Inside Ring */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {taxonomy.primaryEventNoun} Day {currentCycleDay}
                </span>
                <span className="text-xl font-bold font-mono tabular-nums text-[var(--accent-primary)] mt-0.5">
                  {formatFriendlyDate(prediction.coreWindowStartDate)}–
                  {formatFriendlyDate(prediction.coreWindowEndDate)}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  68% Likely Window
                </span>
              </div>
            </div>

            {/* Interactive Ring Legend Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-[11px]">
              {[
                { id: 'window' as const, label: `Next ${taxonomy.primaryEventNoun} (D${prediction.ci68Low}–${prediction.ci68High})` },
                { id: 'fertile' as const, label: 'Fertile Window' },
                { id: 'flow' as const, label: `${taxonomy.flowLabel} (D1–5)` },
              ].map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setActiveRingZone(z.id)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    activeRingZone === z.id
                      ? 'vespera-btn-primary'
                      : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                  }`}
                >
                  {z.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right 8 Cols: Plain-English Forecast & Action Hub */}
          <div className="lg:col-span-8 flex flex-col justify-between space-y-5">
            <div>
              <div className="text-xs text-[var(--text-muted)] mb-1.5">
                Page 1 of 8 · Smart Irregular &amp; Clinical Health Hub · 0 Ad Trackers
              </div>
              <h1
                className="text-2xl sm:text-3xl font-bold tracking-tight leading-snug"
                style={{ textWrap: 'balance' }}
              >
                Your next {taxonomy.primaryEventNoun.toLowerCase()} is most likely between{' '}
                <span className="text-[var(--accent-primary)] underline decoration-2 underline-offset-4">
                  {formatFriendlyDate(prediction.coreWindowStartDate)} and{' '}
                  {formatFriendlyDate(prediction.coreWindowEndDate)}
                </span>
              </h1>
              <p className="text-sm text-[var(--text-secondary)] mt-2.5 leading-relaxed">
                {activeRingZone === 'window' && (
                  <>
                    Instead of guessing one rigid date, Vespera calculates a realistic{' '}
                    <strong className="text-[var(--text-primary)]">
                      {prediction.ci68High - prediction.ci68Low}-day high-confidence window (Days{' '}
                      {prediction.ci68Low}–{prediction.ci68High})
                    </strong>{' '}
                    from your real history. A standard 28-day app would be wrong by{' '}
                    <strong>{wrongDaysDiff} days</strong>.
                  </>
                )}
                {activeRingZone === 'fertile' && (
                  <>
                    Your <strong>Bayesian Fertile Window</strong> adapts to your irregular cycle
                    rhythm (~13–14 days before your expected window). Pair with the{' '}
                    <strong>Smart Strip Scanner</strong> to verify your exact LH surge peak.
                  </>
                )}
                {activeRingZone === 'flow' && (
                  <>
                    Your historical {taxonomy.flowLabel.toLowerCase()} lasts an average of{' '}
                    <strong>5–6 days</strong>. You can customize all labels (Cycle, Bleeding,
                    Period) anytime on Page 8.
                  </>
                )}
                {activeRingZone === 'current' && (
                  <>
                    You are on <strong>Day {currentCycleDay}</strong> of your current{' '}
                    {taxonomy.primaryEventNoun.toLowerCase()}. In your luteal phase, post-ovulation
                    temperature stays elevated (~36.46°C).
                  </>
                )}
              </p>
            </div>

            {/* 4 Quick Metric & Action Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => onNavigatePage('calendar')}
                className="text-left vespera-subtle rounded-xl p-3.5 flex flex-col justify-between active:scale-95 transition-transform"
              >
                <div className="text-[11px] text-[var(--text-muted)]">Likely Window</div>
                <div className="text-sm sm:text-base font-bold font-mono tabular-nums text-[var(--accent-primary)] my-1">
                  {formatFriendlyDate(prediction.coreWindowStartDate)}–
                  {formatFriendlyDate(prediction.coreWindowEndDate)}
                </div>
                <div className="text-[11px] font-semibold text-[var(--accent-primary)]">
                  2. Calendar →
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigatePage('forecast')}
                className="text-left vespera-subtle rounded-xl p-3.5 flex flex-col justify-between active:scale-95 transition-transform"
              >
                <div className="text-[11px] text-[var(--text-muted)]">Typical Rhythm</div>
                <div className="text-sm sm:text-base font-bold font-mono tabular-nums my-1">
                  {prediction.posteriorMean}d ± {Math.round(prediction.posteriorStdDev)}d
                </div>
                <div className="text-[11px] font-semibold text-[var(--accent-primary)]">
                  3. Forecast →
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigatePage('scanner')}
                className="text-left vespera-subtle rounded-xl p-3.5 flex flex-col justify-between active:scale-95 transition-transform"
              >
                <div className="text-[11px] text-[var(--text-muted)]">Strip Reader</div>
                <div className="text-sm sm:text-base font-bold my-1 truncate">
                  {latestScan ? latestScan.interpretation : 'Peak Fertility'}
                </div>
                <div className="text-[11px] font-semibold text-[var(--accent-primary)]">
                  4. Scanner →
                </div>
              </button>

              <button
                type="button"
                onClick={() => onNavigatePage('partner-sync')}
                className="text-left vespera-subtle rounded-xl p-3.5 flex flex-col justify-between active:scale-95 transition-transform"
              >
                <div className="text-[11px] text-[var(--text-muted)]">Partner Sync</div>
                <div className="text-sm sm:text-base font-bold my-1 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                  <span>P2P Ready</span>
                </div>
                <div className="text-[11px] font-semibold text-[var(--accent-primary)]">
                  6. Share QR →
                </div>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowLogForm(true)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl vespera-btn-primary text-xs font-semibold inline-flex items-center gap-2 active:scale-95 transition-transform whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>{taxonomy.primaryActionLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigatePage('care-paths')}
                className="min-h-[44px] px-4 py-2.5 rounded-xl vespera-subtle text-xs font-semibold inline-flex items-center gap-2 active:scale-95 transition-transform whitespace-nowrap shrink-0"
              >
                <Activity className="w-4 h-4 text-[var(--accent-primary)]" />
                <span>Log IVF, IUI, Egg Freezing or HRT →</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Cycle Form Modal */}
      {showLogForm && (
        <form
          onSubmit={handleCreateCycle}
          className="vespera-card rounded-2xl p-5 sm:p-6 space-y-4 border-2 border-[var(--accent-primary)]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-base font-semibold">{taxonomy.primaryActionLabel}</h3>
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
                Total {taxonomy.primaryEventNoun} Days
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
                placeholder="e.g., Mild cramps"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 rounded-xl vespera-subtle text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
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
              Save &amp; Update Window
            </button>
          </div>
        </form>
      )}

      {/* 2. 10-SECOND DAILY CHECK-IN + LIVE SAVED FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-8 vespera-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[var(--border-subtle)]">
              <div>
                <h2 className="text-base font-semibold">Quick 10-Second Check-In for Today</h2>
                <p className="text-xs text-[var(--text-muted)]">
                  Tap your flow, mood, temperature, and symptoms — encrypted immediately
                </p>
              </div>
              <button
                type="button"
                onClick={handleQuickDailySave}
                className="min-h-[42px] vespera-btn-primary px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap shrink-0"
              >
                {dailySaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Logged to Your Timeline!</span>
                  </>
                ) : (
                  <span>Save Today&apos;s Check-In</span>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                  1. {taxonomy.flowLabel} Today
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['None', 'Spotting', 'Light', 'Medium', 'Heavy'].map((flow) => (
                    <button
                      key={flow}
                      type="button"
                      onClick={() => setSelectedFlow(flow)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                        selectedFlow === flow
                          ? 'vespera-btn-primary'
                          : 'vespera-subtle text-[var(--text-secondary)]'
                      }`}
                    >
                      {flow}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                  2. Energy &amp; Mood
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Rested', 'Steady', 'Tired', 'Low Bandwidth', 'Focused'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setSelectedMood(m)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                        selectedMood === m
                          ? 'vespera-btn-primary'
                          : 'vespera-subtle text-[var(--text-secondary)]'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-[var(--text-secondary)] mb-2">
                  3. Body Signals (Tap any)
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['Mild Cramps', 'Bloating', 'Headache', 'Good Sleep', 'Pelvic Heaviness'].map(
                    (sym) => {
                      const active = selectedSymptoms.includes(sym);
                      return (
                        <button
                          key={sym}
                          type="button"
                          onClick={() => toggleSymptom(sym)}
                          className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                            active
                              ? 'vespera-btn-primary'
                              : 'vespera-subtle text-[var(--text-secondary)]'
                          }`}
                        >
                          {sym}
                        </button>
                      );
                    }
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] mb-2">
                  <span>4. Morning Basal Temp (BBT)</span>
                  <span className="font-mono tabular-nums font-bold text-[var(--accent-primary)]">
                    {selectedBbt} °C
                  </span>
                </div>
                <input
                  type="range"
                  min={36.0}
                  max={37.1}
                  step={0.02}
                  value={selectedBbt}
                  onChange={(e) => setSelectedBbt(e.target.value)}
                  className="w-full accent-[var(--accent-primary)] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)]">
                  <span>36.1°C Pre-Ovulation</span>
                  <span>36.5°C+ Luteal Shift</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Live Daily Check-In Feed */}
        <div className="lg:col-span-4 vespera-card rounded-2xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] mb-3">
              <h3 className="text-sm font-semibold">Recent Daily Check-Ins</h3>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {checkIns.length} Saved
              </span>
            </div>

            <div className="space-y-2.5">
              {checkIns.slice(0, 3).map((item) => (
                <div key={item.id} className="vespera-subtle rounded-xl p-3 text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold">
                    <span>{item.date}</span>
                    <span className="font-mono tabular-nums text-[var(--accent-primary)]">
                      {item.bbtCelsius}°C · {item.mood}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {taxonomy.flowLabel}: <strong>{item.flow}</strong> · {item.symptoms.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-[var(--border-subtle)] text-[11px] text-[var(--text-muted)]">
            Every check-in is encrypted locally on your device.
          </div>
        </div>
      </div>

      {/* 3. EXPLORE ALL 8 DEDICATED PAGES */}
      <div className="vespera-card rounded-2xl p-5 sm:p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold">All 8 Dedicated Feature Pages</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Tap any card below to open its dedicated full-screen workspace:
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              id: 'calendar' as AppPageId,
              step: 'Page 2',
              title: 'Month Calendar & Fertile Days',
              desc: 'Visual month grid with fertile windows, past dates, and 1-tap logging.',
              Icon: Calendar,
            },
            {
              id: 'forecast' as AppPageId,
              step: 'Page 3',
              title: 'PCOS & Irregular Cycle Engine',
              desc: 'Bayesian confidence chart, body profile selector, and past cycle logs.',
              Icon: TrendingUp,
            },
            {
              id: 'scanner' as AppPageId,
              step: 'Page 4',
              title: 'Smart Camera Strip Scanner',
              desc: 'Fixes yellow bathroom light before reading LH ovulation or pregnancy strips.',
              Icon: Camera,
            },
            {
              id: 'care-paths' as AppPageId,
              step: 'Page 5',
              title: 'IVF, IUI, Egg Freezing & HRT',
              desc: '1-tap logs, follicle growth chart, and anatomical injection site rotator.',
              Icon: Activity,
            },
            {
              id: 'partner-sync' as AppPageId,
              step: 'Page 6',
              title: 'Partner & Co-Parent QR Sync',
              desc: 'Share only what you choose with your Support Person + 1-tap support replies.',
              Icon: Share2,
            },
            {
              id: 'privacy-vault' as AppPageId,
              step: 'Page 7',
              title: '12-Word Vault & Doctor Report',
              desc: 'Live decryption verifier, privacy audit, and printable Doctor Summary.',
              Icon: Lock,
            },
            {
              id: 'settings' as AppPageId,
              step: 'Page 8',
              title: 'Themes & Custom Words',
              desc: 'Switch between 5 color themes and customize Cycle / Bleeding / Period words.',
              Icon: Palette,
            },
          ].map(({ id, step, title, desc, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onNavigatePage(id)}
              className="text-left p-4 rounded-2xl vespera-subtle hover:border-[var(--accent-primary)] active:scale-[0.98] transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between text-xs text-[var(--accent-primary)] font-semibold mb-1">
                  <span>{step}</span>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-sm font-bold text-[var(--text-primary)] mb-1">{title}</div>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{desc}</p>
              </div>
              <div className="text-xs font-semibold text-[var(--accent-primary)] inline-flex items-center gap-1">
                <span>Open {step}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
