import React, { useState } from 'react';
import { Check, Plus, RefreshCw } from 'lucide-react';
import { ClinicalLogEntry, ClinicalPathwayType, TaxonomyDictionary } from '../types/health';

interface MultiPathClinicalViewProps {
  logs: ClinicalLogEntry[];
  activePathways: ClinicalPathwayType[];
  onTogglePathway: (pathway: ClinicalPathwayType) => void;
  onAddLog: (entry: ClinicalLogEntry) => void;
  taxonomy: TaxonomyDictionary;
}

const ANATOMICAL_SITES = [
  { id: 'Lower-Left Abdomen', short: 'Lower-L Abdomen', zone: 'SubQ (IVF / Peptides)' },
  { id: 'Lower-Right Abdomen', short: 'Lower-R Abdomen', zone: 'SubQ (IVF / Peptides)' },
  { id: 'Left Outer Thigh', short: 'Left Thigh (Vastus)', zone: 'IM / Patch (HRT)' },
  { id: 'Right Outer Thigh', short: 'Right Thigh (Vastus)', zone: 'IM / Patch (HRT)' },
  { id: 'Upper-Left Hip/Glute', short: 'Left Ventrogluteal', zone: 'Progesterone in Oil / HRT' },
  { id: 'Upper-Right Hip/Glute', short: 'Right Ventrogluteal', zone: 'Progesterone in Oil / HRT' },
];

const CARE_PATHS: Record<
  ClinicalPathwayType,
  {
    title: string;
    shortName: string;
    whoItHelps: string;
    whatYouCanTrack: string;
    quickPresets: {
      label: string;
      category: ClinicalLogEntry['category'];
      title: string;
      dosageOrValue: string;
      routeOrSite: string;
      notes: string;
    }[];
  }
> = {
  ivf: {
    title: 'IVF Treatment Cycle',
    shortName: 'IVF',
    whoItHelps: 'For anyone going through ovarian stimulation, egg retrieval, or embryo transfer.',
    whatYouCanTrack: 'Daily injections · Follicle scan sizes · Estrogen lab levels · Trigger shot',
    quickPresets: [
      {
        label: '+ Evening Stimulation Injection',
        category: 'medication',
        title: 'Gonal-F / Menopur Evening Dose',
        dosageOrValue: '225 IU',
        routeOrSite: 'Lower-Left Abdomen',
        notes: 'Taken on time at 8:00 PM.',
      },
      {
        label: '+ Follicle Ultrasound Scan',
        category: 'ultrasound-lab',
        title: 'Clinic Ultrasound & Bloodwork',
        dosageOrValue: '16 Follicles (19.2mm lead)',
        routeOrSite: 'Fertility Clinic',
        notes: 'Lining trilaminar 9.4mm; ready for trigger.',
      },
    ],
  },
  'iui-ici': {
    title: 'IUI & Donor / Home Insemination',
    shortName: 'IUI / Insemination',
    whoItHelps:
      'Built for LGBTQ+ couples, solo parents by choice, and anyone using donor sperm or IUI.',
    whatYouCanTrack: 'LH peak timing · Donor vial motility · Insemination time · 2-week wait',
    quickPresets: [
      {
        label: '+ Log IUI or Home Insemination',
        category: 'insemination',
        title: 'Timed Insemination (IUI / ICI)',
        dosageOrValue: '24 hrs after LH Peak',
        routeOrSite: 'Clinic / Home',
        notes: 'Timed with lighting-calibrated ovulation strip peak.',
      },
      {
        label: '+ Progesterone Support Dose',
        category: 'medication',
        title: 'Progesterone Luteal Support',
        dosageOrValue: '200 mg',
        routeOrSite: 'Evening dose',
        notes: 'Supporting the two-week wait.',
      },
    ],
  },
  'egg-freezing': {
    title: 'Egg Freezing (Fertility Preservation)',
    shortName: 'Egg Freezing',
    whoItHelps: 'Track your egg freezing cycle from baseline scans to mature eggs frozen.',
    whatYouCanTrack: 'Stimulation days · Follicle count · Trigger shot · Eggs retrieved & frozen',
    quickPresets: [
      {
        label: '+ Egg Freezing Monitoring Scan',
        category: 'ultrasound-lab',
        title: 'Follicle Cohort Check',
        dosageOrValue: '16 Follicles Growing',
        routeOrSite: 'Clinic',
        notes: 'Estrogen rising steadily; retrieval expected in 3 days.',
      },
    ],
  },
  'hrt-gaht': {
    title: 'Hormone Therapy (HRT / Gender-Affirming / Menopause)',
    shortName: 'HRT / Hormones',
    whoItHelps:
      'Track Estrogen, Testosterone, or Progesterone shots, patches, and gels — even if you do not have a period.',
    whatYouCanTrack: 'Injection / Patch reminders · Body site rotation · Blood hormone levels',
    quickPresets: [
      {
        label: '+ Log Estrogen / Testosterone Dose',
        category: 'hormone-dose',
        title: 'Scheduled Hormone Dose (Shot / Patch / Gel)',
        dosageOrValue: '4.0 mg / Weekly',
        routeOrSite: 'Left Outer Thigh',
        notes: 'Rotated site from last dose; steady energy.',
      },
      {
        label: '+ Log Hormone Blood Test Result',
        category: 'ultrasound-lab',
        title: 'Routine Hormone Blood Panel',
        dosageOrValue: 'E2: 185 pg/mL',
        routeOrSite: 'Lab Draw (Trough level)',
        notes: 'Levels right in target range.',
      },
    ],
  },
  'natural-irregular': {
    title: 'Cycle & Ovulation Tracking (Regular or Irregular)',
    shortName: 'Cycle & Ovulation',
    whoItHelps: 'Track body temperature, ovulation signs, and symptoms without rigid assumptions.',
    whatYouCanTrack: 'Morning temperature (BBT) · Cervical fluid · Supplements (Inositol, Vit D)',
    quickPresets: [
      {
        label: '+ Morning Body Temperature (BBT)',
        category: 'symptom',
        title: 'Waking Basal Body Temperature',
        dosageOrValue: '36.50 °C (97.7 °F)',
        routeOrSite: 'Oral Thermometer',
        notes: 'Slept well; measured right upon waking.',
      },
    ],
  },
};

export const MultiPathClinicalView: React.FC<MultiPathClinicalViewProps> = ({
  logs,
  activePathways,
  onTogglePathway,
  onAddLog,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<ClinicalPathwayType | 'all'>('all');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [justAddedToast, setJustAddedToast] = useState<string | null>(null);
  const [currentSiteIdx, setCurrentSiteIdx] = useState<number>(1); // Lower-Right Abdomen recommended next

  const [pathway, setPathway] = useState<ClinicalPathwayType>('ivf');
  const [category, setCategory] = useState<ClinicalLogEntry['category']>('medication');
  const [date, setDate] = useState<string>('2026-10-30');
  const [title, setTitle] = useState<string>('');
  const [dosageOrValue, setDosageOrValue] = useState<string>('');
  const [routeOrSite, setRouteOrSite] = useState<string>(ANATOMICAL_SITES[1].id);
  const [notes, setNotes] = useState<string>('');

  const filteredLogs = logs.filter((l) =>
    selectedFilter === 'all' ? true : l.pathway === selectedFilter
  );

  const handleQuickPresetAdd = (
    pathKey: ClinicalPathwayType,
    preset: (typeof CARE_PATHS)[ClinicalPathwayType]['quickPresets'][0]
  ) => {
    const recommendedSite = ANATOMICAL_SITES[currentSiteIdx].id;
    const isInjectableOrPatch =
      preset.category === 'medication' || preset.category === 'hormone-dose';

    const newEntry: ClinicalLogEntry = {
      id: `clin-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      pathway: pathKey,
      category: preset.category,
      title: preset.title,
      dosageOrValue: preset.dosageOrValue,
      unit: '',
      routeOrSite: isInjectableOrPatch ? recommendedSite : preset.routeOrSite,
      notes: preset.notes,
    };
    onAddLog(newEntry);
    if (isInjectableOrPatch) {
      setCurrentSiteIdx((prev) => (prev + 1) % ANATOMICAL_SITES.length);
    }
    setJustAddedToast(`Logged "${preset.title}" (${newEntry.routeOrSite})`);
    setTimeout(() => setJustAddedToast(null), 2500);
  };

  const handleLogWithSelectedSite = (siteIndex: number) => {
    const site = ANATOMICAL_SITES[siteIndex];
    const newEntry: ClinicalLogEntry = {
      id: `clin-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      pathway: 'hrt-gaht',
      category: 'hormone-dose',
      title: 'Rotated Injection / Patch Site Dose',
      dosageOrValue: 'Scheduled Dose',
      unit: '',
      routeOrSite: site.id,
      notes: `Applied at ${site.id}; next site rotated automatically.`,
    };
    onAddLog(newEntry);
    setCurrentSiteIdx((siteIndex + 1) % ANATOMICAL_SITES.length);
    setJustAddedToast(`Logged dose at ${site.short} — rotated to next site!`);
    setTimeout(() => setJustAddedToast(null), 2500);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dosageOrValue.trim()) return;

    const newEntry: ClinicalLogEntry = {
      id: `clin-${Date.now()}`,
      date,
      pathway,
      category,
      title: title.trim(),
      dosageOrValue: dosageOrValue.trim(),
      unit: '',
      routeOrSite: routeOrSite.trim() || 'Logged on device',
      notes: notes.trim() || 'Added to private care log.',
    };
    onAddLog(newEntry);
    setTitle('');
    setDosageOrValue('');
    setNotes('');
    setShowCustomForm(false);
  };

  return (
    <div className="space-y-6">
      {/* 1. Inclusive Care Paths Overview */}
      <div className="vespera-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <div className="text-xs text-[var(--text-muted)] mb-1">
              Page 5 of 8 · Works With or Without a Period · Inclusive of Every Family &amp; Gender Identity
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              Personal Care Paths: IVF, IUI, Egg Freezing &amp; HRT
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {justAddedToast && (
              <span className="text-xs font-semibold text-[var(--accent-primary)] inline-flex items-center gap-1">
                <Check className="w-4 h-4" />
                <span>{justAddedToast}</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowCustomForm(!showCustomForm)}
              className="min-h-[42px] vespera-btn-primary px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add Custom Medication or Lab</span>
            </button>
          </div>
        </div>

        {/* Interactive Injection & Patch Site Rotator + Follicle Progress Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-5 pb-6 border-b border-[var(--border-subtle)]">
          {/* Left 7 Cols: Anatomical Site Rotator */}
          <div className="lg:col-span-7 vespera-subtle rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>Smart Injection &amp; Patch Site Rotator (IVF &amp; HRT)</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Prevents bruising and scar tissue by automatically rotating your next body site
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-[var(--accent-primary)] shrink-0">
                Next: {ANATOMICAL_SITES[currentSiteIdx].short}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ANATOMICAL_SITES.map((site, idx) => {
                const isNext = idx === currentSiteIdx;
                const isLastUsed =
                  idx === (currentSiteIdx - 1 + ANATOMICAL_SITES.length) % ANATOMICAL_SITES.length;
                return (
                  <button
                    key={site.id}
                    type="button"
                    onClick={() => handleLogWithSelectedSite(idx)}
                    className={`text-left p-3 rounded-xl border transition-transform active:scale-95 ${
                      isNext
                        ? 'bg-[var(--bg-surface)] border-2 border-[var(--accent-primary)]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] opacity-85'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono mb-0.5">
                      <span
                        className={
                          isNext
                            ? 'font-bold text-[var(--accent-primary)]'
                            : 'text-[var(--text-muted)]'
                        }
                      >
                        {isNext ? 'RECOMMENDED NEXT' : isLastUsed ? 'USED LAST' : `SITE 0${idx + 1}`}
                      </span>
                    </div>
                    <div className="text-xs font-semibold truncate">{site.short}</div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">{site.zone}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 5 Cols: Visual Follicle & Hormone Milestone Card */}
          <div className="lg:col-span-5 vespera-subtle rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-sm font-bold">IVF / Egg Freezing Follicle &amp; HRT Tracker</h3>
              <p className="text-xs text-[var(--text-muted)]">
                Visualizing lead follicle growth toward 18–20mm trigger target &amp; serum Estradiol
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                { day: 'Stim Day 4', mm: 11.5, e2: '480 pg/mL', pct: 55 },
                { day: 'Stim Day 7', mm: 16.5, e2: '1,140 pg/mL', pct: 80 },
                { day: 'Stim Day 10 (Ready)', mm: 19.2, e2: '2,480 pg/mL', pct: 96 },
              ].map((step) => (
                <div
                  key={step.day}
                  className="bg-[var(--bg-surface)] rounded-xl p-2.5 border border-[var(--border-subtle)]"
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold">{step.day}</span>
                    <span className="font-mono tabular-nums text-[var(--accent-primary)] font-bold">
                      {step.mm} mm · E2: {step.e2}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full vespera-subtle overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${step.pct}%`,
                        backgroundColor: 'var(--accent-primary)',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 5 Friendly Care Path Cards with 1-Click Quick Log Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-6">
          {(Object.keys(CARE_PATHS) as ClinicalPathwayType[]).map((key) => {
            const isActive = activePathways.includes(key);
            const info = CARE_PATHS[key];
            return (
              <div
                key={key}
                className={`rounded-2xl p-5 border transition-colors flex flex-col justify-between space-y-4 ${
                  isActive
                    ? 'vespera-subtle border-[var(--accent-primary)]'
                    : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                      {info.title}
                    </h3>
                    <button
                      type="button"
                      onClick={() => onTogglePathway(key)}
                      className={`min-h-[32px] px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                        isActive
                          ? 'vespera-btn-primary'
                          : 'border border-[var(--border-strong)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {isActive ? 'Active' : 'Turn On'}
                    </button>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-2">
                    {info.whoItHelps}
                  </p>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Tracks: {info.whatYouCanTrack}
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-subtle)] space-y-1.5">
                  <div className="text-[11px] font-medium text-[var(--text-muted)]">
                    1-Tap Quick Log for Today:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {info.quickPresets.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleQuickPresetAdd(key, preset)}
                        className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)] text-xs font-medium text-[var(--text-primary)] active:scale-95 transition-transform"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Custom Entry Form */}
      {showCustomForm && (
        <form
          onSubmit={handleCustomSubmit}
          className="vespera-card rounded-2xl p-5 sm:p-6 space-y-4 border-2 border-[var(--accent-primary)]"
        >
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
            <h3 className="text-base font-semibold">
              Log a Medication, Hormone Dose, Ultrasound Scan, or Insemination
            </h3>
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              className="text-xs text-[var(--text-muted)]"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Which Care Path?
              </label>
              <select
                value={pathway}
                onChange={(e) => setPathway(e.target.value as ClinicalPathwayType)}
                className="w-full px-3 py-2 rounded-xl vespera-subtle text-xs text-[var(--text-primary)]"
              >
                <option value="ivf">IVF Treatment</option>
                <option value="iui-ici">IUI / Donor or Home Insemination</option>
                <option value="egg-freezing">Egg Freezing</option>
                <option value="hrt-gaht">Hormone Therapy (HRT)</option>
                <option value="natural-irregular">Cycle &amp; Ovulation</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                What Are You Logging?
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ClinicalLogEntry['category'])}
                className="w-full px-3 py-2 rounded-xl vespera-subtle text-xs text-[var(--text-primary)]"
              >
                <option value="medication">Fertility Medication / Injection</option>
                <option value="hormone-dose">HRT Patch, Shot, Gel, or Pill</option>
                <option value="ultrasound-lab">Ultrasound Scan or Blood Test</option>
                <option value="insemination">IUI or Home Insemination</option>
                <option value="symptom">Body Temperature or Symptom</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl vespera-subtle text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Name of Medication, Scan, or Event
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Estradiol Patch, Gonal-F, IUI #2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl vespera-subtle text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Dose or Result
              </label>
              <input
                type="text"
                required
                placeholder="e.g., 200 mg, 150 IU, or 14 Follicles"
                value={dosageOrValue}
                onChange={(e) => setDosageOrValue(e.target.value)}
                className="w-full px-3 py-2 rounded-xl vespera-subtle text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Body Area or Clinic Name
              </label>
              <input
                type="text"
                placeholder="e.g., Left thigh, Right abdomen, Clinic"
                value={routeOrSite}
                onChange={(e) => setRouteOrSite(e.target.value)}
                className="w-full px-3 py-2 rounded-xl vespera-subtle text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Notes (optional)
            </label>
            <input
              type="text"
              placeholder="How did you feel, or what did your doctor recommend next?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-xl vespera-subtle text-xs"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCustomForm(false)}
              className="min-h-[40px] px-4 py-2 rounded-xl vespera-subtle text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 rounded-xl vespera-btn-primary text-xs font-semibold"
            >
              Save to Private Care Log
            </button>
          </div>
        </form>
      )}

      {/* 2. Clean, Easy-to-Filter Timeline of Your Care Logs */}
      <div className="vespera-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-semibold">Your Medications, Scans &amp; Hormone History</h3>
            <p className="text-xs text-[var(--text-muted)]">
              Filter by care path to review your doses, injection site rotation, or ultrasound results
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl vespera-subtle">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedFilter === 'all'
                  ? 'vespera-btn-primary'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Show All ({logs.length})
            </button>
            {(Object.keys(CARE_PATHS) as ClinicalPathwayType[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedFilter(key)}
                className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedFilter === key
                    ? 'vespera-btn-primary'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {CARE_PATHS[key].shortName}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile Touch Cards (md:hidden) */}
        <div className="md:hidden space-y-2.5">
          {filteredLogs.map((entry) => (
            <div key={entry.id} className="vespera-subtle rounded-xl p-3.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                  {entry.title}
                </span>
                <span className="text-xs font-mono tabular-nums font-bold text-[var(--accent-primary)] shrink-0">
                  {entry.dosageOrValue}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                {entry.date} · {CARE_PATHS[entry.pathway].shortName} · {entry.routeOrSite || 'Logged'}
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{entry.notes}</p>
            </div>
          ))}
        </div>

        {/* Desktop Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                <th className="py-2.5 pr-4 font-medium">Date</th>
                <th className="py-2.5 px-4 font-medium">Care Path</th>
                <th className="py-2.5 px-4 font-medium">Medication / Scan / Event</th>
                <th className="py-2.5 px-4 font-medium">Dose or Result</th>
                <th className="py-2.5 px-4 font-medium">Body Site / Location</th>
                <th className="py-2.5 pl-4 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredLogs.map((entry) => (
                <tr key={entry.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="py-3 pr-4 font-mono tabular-nums whitespace-nowrap">
                    {entry.date}
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)] whitespace-nowrap">
                    {CARE_PATHS[entry.pathway].shortName}
                  </td>
                  <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                    {entry.title}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums font-semibold text-[var(--accent-primary)] whitespace-nowrap">
                    {entry.dosageOrValue}
                  </td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">
                    {entry.routeOrSite || '—'}
                  </td>
                  <td className="py-3 pl-4 text-[var(--text-secondary)] max-w-sm">
                    {entry.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
