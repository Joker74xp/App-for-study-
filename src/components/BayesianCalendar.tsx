import React, { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { BayesianPrediction, CycleRecord, TaxonomyDictionary } from '../types/health';

interface BayesianCalendarProps {
  cycles: CycleRecord[];
  prediction: BayesianPrediction;
  taxonomy: TaxonomyDictionary;
  onQuickLogDate: (dateStr: string) => void;
}

interface DayStatus {
  dateStr: string;
  dayNumber: number;
  weekdayShort: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPastCycleStart: boolean;
  isPastFlowDay: boolean;
  isPastOvulationWindow: boolean;
  isPastOvulationPeak: boolean;
  isProjectedFertileWindow: boolean;
  isProjectedOvulationPeak: boolean;
  isCore68Window: boolean;
  isBroad90Window: boolean;
  isNaive28DayGuess: boolean;
  cycleNote?: string;
}

const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateStr(year: number, monthZeroIndexed: number, day: number): string {
  const d = new Date(Date.UTC(year, monthZeroIndexed, day, 12, 0, 0));
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  if (isNaN(d.getTime())) return dateStr;
  d.setUTCDate(d.getUTCDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

function isBetween(target: string, start: string, end: string): boolean {
  return target >= start && target <= end;
}

export const BayesianCalendar: React.FC<BayesianCalendarProps> = ({
  cycles,
  prediction,
  taxonomy,
  onQuickLogDate,
}) => {
  const [viewYear, setViewYear] = useState<number>(2026);
  const [viewMonth, setViewMonth] = useState<number>(9); // 9 = October
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-30');
  const [loggedFeedbackDate, setLoggedFeedbackDate] = useState<string | null>(null);

  const todayStr = '2026-10-30';

  const sortedCycles = useMemo(
    () => [...cycles].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [cycles]
  );

  const latestCycle = sortedCycles[sortedCycles.length - 1];

  const calendarRanges = useMemo(() => {
    const latestStart = latestCycle?.startDate || todayStr;
    const estOvulationMeanDay = Math.max(10, Math.round(prediction.posteriorMean - 13));
    const fertileLowDay = Math.max(8, prediction.ci68Low - 16);
    const fertileHighDay = Math.max(fertileLowDay + 3, prediction.ci68High - 12);

    const projectedFertileStart = addDays(latestStart, fertileLowDay);
    const projectedFertileEnd = addDays(latestStart, fertileHighDay);
    const projectedOvulationPeak = addDays(latestStart, estOvulationMeanDay);

    const nextCycleMeanStart = addDays(latestStart, Math.round(prediction.posteriorMean));
    const nextFertileStart = addDays(nextCycleMeanStart, fertileLowDay);
    const nextFertileEnd = addDays(nextCycleMeanStart, fertileHighDay);
    const nextOvulationPeak = addDays(nextCycleMeanStart, estOvulationMeanDay);

    const naive28Date = addDays(latestStart, 28);

    return {
      projectedFertileStart,
      projectedFertileEnd,
      projectedOvulationPeak,
      nextFertileStart,
      nextFertileEnd,
      nextOvulationPeak,
      naive28Date,
    };
  }, [latestCycle, prediction]);

  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(Date.UTC(viewYear, viewMonth, 1, 12, 0, 0));
    const startWeekday = firstDayOfMonth.getUTCDay();
    const daysInMonth = new Date(Date.UTC(viewYear, viewMonth + 1, 0, 12, 0, 0)).getUTCDate();
    const daysInPrevMonth = new Date(Date.UTC(viewYear, viewMonth, 0, 12, 0, 0)).getUTCDate();

    const cells: DayStatus[] = [];

    for (let i = 0; i < 42; i++) {
      let cellYear = viewYear;
      let cellMonth = viewMonth;
      let dayNum = 1;
      let isCurrentMonth = true;

      if (i < startWeekday) {
        isCurrentMonth = false;
        dayNum = daysInPrevMonth - startWeekday + 1 + i;
        if (viewMonth === 0) {
          cellMonth = 11;
          cellYear = viewYear - 1;
        } else {
          cellMonth = viewMonth - 1;
        }
      } else if (i >= startWeekday + daysInMonth) {
        isCurrentMonth = false;
        dayNum = i - (startWeekday + daysInMonth) + 1;
        if (viewMonth === 11) {
          cellMonth = 0;
          cellYear = viewYear + 1;
        } else {
          cellMonth = viewMonth + 1;
        }
      } else {
        dayNum = i - startWeekday + 1;
      }

      const dateStr = toDateStr(cellYear, cellMonth, dayNum);
      const weekdayShort = WEEKDAYS_SHORT[i % 7];

      let isPastCycleStart = false;
      let isPastFlowDay = false;
      let isPastOvulationWindow = false;
      let isPastOvulationPeak = false;
      let cycleNote: string | undefined;

      for (const c of sortedCycles) {
        if (c.startDate === dateStr) {
          isPastCycleStart = true;
          cycleNote = c.notes;
        }
        const flowEnd = addDays(c.startDate, Math.max(1, c.bleedingDays) - 1);
        if (isBetween(dateStr, c.startDate, flowEnd)) {
          isPastFlowDay = true;
          if (!cycleNote) cycleNote = c.notes;
        }
        if (c.ovulationDayEst) {
          const ovDate = addDays(c.startDate, c.ovulationDayEst - 1);
          const ovWinStart = addDays(ovDate, -3);
          const ovWinEnd = addDays(ovDate, 1);
          if (dateStr === ovDate) isPastOvulationPeak = true;
          if (isBetween(dateStr, ovWinStart, ovWinEnd)) isPastOvulationWindow = true;
        }
      }

      const isProjectedFertileWindow =
        isBetween(
          dateStr,
          calendarRanges.projectedFertileStart,
          calendarRanges.projectedFertileEnd
        ) ||
        isBetween(dateStr, calendarRanges.nextFertileStart, calendarRanges.nextFertileEnd);

      const isProjectedOvulationPeak =
        dateStr === calendarRanges.projectedOvulationPeak ||
        dateStr === calendarRanges.nextOvulationPeak;

      const isCore68Window = isBetween(
        dateStr,
        prediction.coreWindowStartDate,
        prediction.coreWindowEndDate
      );

      const isBroad90Window =
        !isCore68Window &&
        isBetween(dateStr, prediction.nextWindowStartDate, prediction.nextWindowEndDate);

      const isNaive28DayGuess = dateStr === calendarRanges.naive28Date;

      cells.push({
        dateStr,
        dayNumber: dayNum,
        weekdayShort,
        isCurrentMonth,
        isToday: dateStr === todayStr,
        isPastCycleStart,
        isPastFlowDay,
        isPastOvulationWindow,
        isPastOvulationPeak,
        isProjectedFertileWindow,
        isProjectedOvulationPeak,
        isCore68Window,
        isBroad90Window,
        isNaive28DayGuess,
        cycleNote,
      });
    }

    return cells;
  }, [viewYear, viewMonth, sortedCycles, calendarRanges, prediction]);

  const selectedCell = useMemo(
    () => calendarCells.find((c) => c.dateStr === selectedDate) || calendarCells[0],
    [calendarCells, selectedDate]
  );

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const monthLabel = new Date(Date.UTC(viewYear, viewMonth, 15)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const handleLogSelectedDate = () => {
    if (!selectedCell) return;
    onQuickLogDate(selectedCell.dateStr);
    setLoggedFeedbackDate(selectedCell.dateStr);
    setTimeout(() => setLoggedFeedbackDate(null), 2500);
  };

  return (
    <div className="vespera-card rounded-2xl p-4 sm:p-6 space-y-4">
      {/* Header & Month Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <div className="text-xs text-[var(--text-muted)] mb-0.5">
            Interactive Month Calendar · Using &ldquo;{taxonomy.primaryEventNoun}&rdquo; Labels
          </div>
          <h2 className="text-base sm:text-lg font-semibold tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[var(--accent-primary)] shrink-0" />
            <span>
              {taxonomy.primaryEventNoun} Calendar &amp; Fertile Windows
            </span>
          </h2>
        </div>

        {/* Touch-Friendly Month Switcher */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2">
          <div className="flex items-center gap-1 p-1 rounded-xl vespera-subtle">
            {[
              { label: 'Sep', y: 2026, m: 8 },
              { label: 'Oct', y: 2026, m: 9 },
              { label: 'Nov', y: 2026, m: 10 },
            ].map((QuickM) => (
              <button
                key={QuickM.label}
                type="button"
                onClick={() => {
                  setViewYear(QuickM.y);
                  setViewMonth(QuickM.m);
                }}
                className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-semibold transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                  viewYear === QuickM.y && viewMonth === QuickM.m
                    ? 'vespera-btn-primary'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {QuickM.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              aria-label="Previous month"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl vespera-subtle active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs sm:text-sm font-semibold font-mono tabular-nums min-w-[115px] text-center">
              {monthLabel}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              aria-label="Next month"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl vespera-subtle active:scale-95 transition-transform"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Visual Color Legend */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs text-[var(--text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-3.5 h-3.5 rounded-sm inline-block shrink-0"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          />
          <span>Past {taxonomy.flowLabel}</span>
        </span>

        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-3.5 h-3.5 rounded-sm inline-block border-2 shrink-0"
            style={{
              borderColor: 'var(--accent-secondary)',
              backgroundColor: 'var(--bg-subtle)',
            }}
          />
          <span>Bayesian Fertile Window</span>
        </span>

        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-3.5 h-3.5 rounded-sm inline-block border-2 border-dashed shrink-0"
            style={{
              borderColor: 'var(--accent-primary)',
              backgroundColor: 'var(--accent-soft)',
            }}
          />
          <span>68% Likely {taxonomy.primaryEventNoun}</span>
        </span>

        <span className="inline-flex items-center gap-1.5">
          <span
            className="w-3.5 h-3.5 rounded-sm inline-block border border-dotted shrink-0"
            style={{
              borderColor: 'var(--border-strong)',
              backgroundColor: 'var(--accent-band)',
            }}
          />
          <span>90% Outer Window</span>
        </span>
      </div>

      {/* Main Layout: 7-Column Calendar Grid + Selected Day Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left 8 Cols: 7-Column Month Grid (Optimized for both 375px Mobile & 1440px Desktop) */}
        <div className="lg:col-span-8">
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-[11px] sm:text-xs font-semibold text-[var(--text-muted)] mb-1.5">
            {WEEKDAYS_SHORT.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {calendarCells.map((cell) => {
              const isSelected = cell.dateStr === selectedDate;

              let cellBg = 'bg-[var(--bg-surface)]';
              let cellBorder = 'border border-[var(--border-subtle)]';
              let badgeText = '';
              let mobileShortTag = '';

              if (cell.isPastFlowDay) {
                cellBg = 'bg-[var(--accent-primary)] text-[var(--accent-fg)]';
                cellBorder = 'border border-[var(--accent-primary)]';
                badgeText = cell.isPastCycleStart
                  ? `${taxonomy.primaryEventNoun} D1`
                  : taxonomy.flowLabel.split(' ')[0];
                mobileShortTag = cell.isPastCycleStart ? 'D1' : 'Flow';
              } else if (cell.isCore68Window) {
                cellBg = 'bg-[var(--accent-soft)]';
                cellBorder = 'border-2 border-dashed border-[var(--accent-primary)]';
                badgeText = '68% Likely';
                mobileShortTag = '68%';
              } else if (cell.isBroad90Window) {
                cellBg = 'bg-[var(--bg-subtle)]';
                cellBorder = 'border border-dashed border-[var(--border-strong)]';
                badgeText = '90% Range';
                mobileShortTag = '90%';
              } else if (cell.isProjectedFertileWindow || cell.isPastOvulationWindow) {
                cellBg = 'bg-[var(--bg-subtle)]';
                cellBorder = 'border-2 border-[var(--accent-secondary)]';
                badgeText =
                  cell.isProjectedOvulationPeak || cell.isPastOvulationPeak
                    ? 'Ovulation Est'
                    : 'Fertile Win';
                mobileShortTag =
                  cell.isProjectedOvulationPeak || cell.isPastOvulationPeak ? 'Peak' : 'Fert';
              } else if (cell.isNaive28DayGuess) {
                cellBorder = 'border border-[var(--status-alert)]';
                badgeText = '28d App Err';
                mobileShortTag = '28d';
              }

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`min-h-[48px] sm:min-h-[68px] p-1.5 sm:p-2 rounded-xl text-left flex flex-col justify-between transition-transform active:scale-95 cursor-pointer ${cellBg} ${cellBorder} ${
                    !cell.isCurrentMonth ? 'opacity-35' : ''
                  } ${
                    isSelected ? 'ring-2 ring-[var(--accent-primary)] ring-offset-1' : ''
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-xs font-mono tabular-nums font-semibold ${
                        cell.isPastFlowDay
                          ? 'text-[var(--accent-fg)]'
                          : 'text-[var(--text-primary)]'
                      }`}
                    >
                      {cell.dayNumber}
                    </span>
                    {cell.isToday && (
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold ${
                          cell.isPastFlowDay
                            ? 'text-[var(--accent-fg)]'
                            : 'text-[var(--accent-primary)]'
                        }`}
                      >
                        •
                      </span>
                    )}
                  </div>

                  {badgeText && (
                    <>
                      {/* Mobile compact label */}
                      <div
                        className={`sm:hidden text-[9px] font-semibold truncate leading-tight ${
                          cell.isPastFlowDay
                            ? 'text-[var(--accent-fg)]'
                            : cell.isNaive28DayGuess
                            ? 'text-[var(--status-alert)]'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {mobileShortTag}
                      </div>
                      {/* Desktop full label */}
                      <div
                        className={`hidden sm:block text-[10px] font-medium truncate leading-tight mt-1 ${
                          cell.isPastFlowDay
                            ? 'text-[var(--accent-fg)]'
                            : cell.isNaive28DayGuess
                            ? 'text-[var(--status-alert)]'
                            : 'text-[var(--text-secondary)]'
                        }`}
                      >
                        {badgeText}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 4 Cols: Selected Date Detail & 1-Tap Action Panel */}
        <div className="lg:col-span-4 vespera-subtle rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
              <div>
                <div className="text-xs text-[var(--text-muted)]">Selected Date</div>
                <div className="text-base font-bold font-mono tabular-nums">
                  {selectedCell?.dateStr} ({selectedCell?.weekdayShort})
                </div>
              </div>
              {selectedCell?.isToday && (
                <span className="text-xs font-semibold text-[var(--accent-primary)]">
                  Today
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              {selectedCell?.isPastFlowDay && (
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--accent-primary)]">
                  <div className="font-semibold text-[var(--accent-primary)] mb-0.5">
                    Logged {taxonomy.primaryEventNoun} ({taxonomy.flowLabel})
                  </div>
                  <p className="text-[var(--text-secondary)]">
                    {selectedCell.cycleNote ||
                      `Recorded ${taxonomy.flowLabel.toLowerCase()} in your private local vault.`}
                  </p>
                </div>
              )}

              {(selectedCell?.isProjectedFertileWindow || selectedCell?.isPastOvulationWindow) && (
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--accent-secondary)]">
                  <div className="font-semibold text-[var(--text-primary)] mb-0.5">
                    {selectedCell.isProjectedOvulationPeak || selectedCell.isPastOvulationPeak
                      ? 'Estimated Ovulation Peak Day'
                      : 'Bayesian Predicted Fertile Window'}
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    Predicted ~13–14 days before your expected{' '}
                    {taxonomy.primaryEventNoun.toLowerCase()} window.
                  </p>
                </div>
              )}

              {selectedCell?.isCore68Window && (
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--accent-primary)]">
                  <div className="font-semibold text-[var(--accent-primary)] mb-0.5">
                    High-Likelihood {taxonomy.windowLabel} (68% Core Range)
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    Your next {taxonomy.primaryEventNoun.toLowerCase()} is most likely to start
                    between {prediction.coreWindowStartDate} and {prediction.coreWindowEndDate}.
                  </p>
                </div>
              )}

              {selectedCell?.isBroad90Window && (
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="font-semibold text-[var(--text-primary)] mb-0.5">
                    Outer Possible {taxonomy.windowLabel} (90% Range)
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    Covers natural cycle variation in PCOS or perimenopause so you never get false
                    late alarms.
                  </p>
                </div>
              )}

              {selectedCell?.isNaive28DayGuess && (
                <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--status-alert)]">
                  <div className="font-semibold text-[var(--status-alert)] mb-0.5">
                    Where a Standard 28-Day App Guesses Wrong
                  </div>
                  <p className="text-[var(--text-secondary)] leading-relaxed">
                    A fixed 28-day app would falsely claim you are &ldquo;late&rdquo; after this
                    date, ignoring your real {prediction.posteriorMean}-day rhythm.
                  </p>
                </div>
              )}

              {!selectedCell?.isPastFlowDay &&
                !selectedCell?.isProjectedFertileWindow &&
                !selectedCell?.isPastOvulationWindow &&
                !selectedCell?.isCore68Window &&
                !selectedCell?.isBroad90Window &&
                !selectedCell?.isNaive28DayGuess && (
                  <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                    <div className="font-semibold text-[var(--text-primary)] mb-0.5">
                      Regular {taxonomy.primaryEventNoun} Day
                    </div>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                      Tap the button below to log a new {taxonomy.primaryEventNoun.toLowerCase()}{' '}
                      start on this date.
                    </p>
                  </div>
                )}
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={handleLogSelectedDate}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl vespera-btn-primary text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform whitespace-nowrap"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">
                {loggedFeedbackDate === selectedCell?.dateStr
                  ? `Logged ${taxonomy.primaryEventNoun} on ${selectedCell?.dateStr}!`
                  : `${taxonomy.primaryActionLabel} (${selectedCell?.dateStr})`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
