import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Calendar,
  Camera,
  Home,
  Lock,
  Palette,
  Share2,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { BayesianCalendar } from './components/BayesianCalendar';
import { BayesianDashboardView } from './components/BayesianDashboardView';
import { AppPageId, HomeCheckInPage } from './components/HomeCheckInPage';
import { MultiPathClinicalView } from './components/MultiPathClinicalView';
import { PartnerSyncPage } from './components/PartnerSyncPage';
import { ThemeAndTaxonomyView } from './components/ThemeAndTaxonomyView';
import { VaultAndP2PView } from './components/VaultAndP2PView';
import { VisionStripCalibrator } from './components/VisionStripCalibrator';
import {
  ETHICAL_FREEMIUM_MODULES,
  INITIAL_CLINICAL_LOGS,
  INITIAL_CYCLE_RECORDS,
  INITIAL_STRIP_SCANS,
  TAXONOMY_PRESETS,
} from './data/initialData';
import {
  ClinicalLogEntry,
  ClinicalPathwayType,
  CycleRecord,
  EncryptedVaultEnvelope,
  MicroModule,
  PhenotypeProfile,
  StripScanResult,
  TaxonomyDictionary,
  ThemeMode,
} from './types/health';
import { computeBayesianCyclePrediction } from './utils/bayesianEngine';
import { encryptVaultData, generateRecoverySeedPhrase } from './utils/cryptoEngine';

const PAGES_LIST: {
  id: AppPageId;
  num: number;
  shortTitle: string;
  fullTitle: string;
}[] = [
  { id: 'home', num: 1, shortTitle: '1. Home', fullTitle: 'Home & Daily Check-In' },
  { id: 'calendar', num: 2, shortTitle: '2. Calendar', fullTitle: 'Month Calendar & Fertile Days' },
  { id: 'forecast', num: 3, shortTitle: '3. Forecast', fullTitle: 'PCOS & Irregular Cycle Engine' },
  { id: 'scanner', num: 4, shortTitle: '4. Strip Scanner', fullTitle: 'Smart Camera Strip Scanner' },
  { id: 'care-paths', num: 5, shortTitle: '5. IVF & HRT', fullTitle: 'IVF, IUI, Egg Freezing & HRT' },
  { id: 'partner-sync', num: 6, shortTitle: '6. Partner Sync', fullTitle: 'Partner & Co-Parent QR Sync' },
  { id: 'privacy-vault', num: 7, shortTitle: '7. Vault & Doctor', fullTitle: '12-Word Vault & Doctor Summary' },
  { id: 'settings', num: 8, shortTitle: '8. Themes & Words', fullTitle: 'Themes & Custom Words' },
];

export default function App() {
  const [activePage, setActivePage] = useState<AppPageId>('home');

  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem('vespera_theme') as ThemeMode | null;
      return saved || 'minimal-light';
    } catch {
      return 'minimal-light';
    }
  });

  const [taxonomy, setTaxonomy] = useState<TaxonomyDictionary>(() => {
    try {
      const saved = localStorage.getItem('vespera_taxonomy');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return TAXONOMY_PRESETS.cycle;
  });

  const [phenotype, setPhenotype] = useState<PhenotypeProfile>('irregular-pcos');
  const [cycles, setCycles] = useState<CycleRecord[]>(INITIAL_CYCLE_RECORDS);
  const [clinicalLogs, setClinicalLogs] = useState<ClinicalLogEntry[]>(INITIAL_CLINICAL_LOGS);
  const [activePathways, setActivePathways] = useState<ClinicalPathwayType[]>([
    'natural-irregular',
    'ivf',
    'iui-ici',
    'egg-freezing',
    'hrt-gaht',
  ]);
  const [stripScans, setStripScans] = useState<StripScanResult[]>(INITIAL_STRIP_SCANS);
  const [modules, setModules] = useState<MicroModule[]>(ETHICAL_FREEMIUM_MODULES);

  const [seedPhrase, setSeedPhrase] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('vespera_seed');
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return generateRecoverySeedPhrase();
  });

  const [e2eeCloudEnabled, setE2eeCloudEnabled] = useState<boolean>(true);
  const [vaultEnvelope, setVaultEnvelope] = useState<EncryptedVaultEnvelope | null>(null);
  const [isVaultLockedModal, setIsVaultLockedModal] = useState<boolean>(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'deep-dark' || theme === 'high-contrast') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('vespera_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('vespera_taxonomy', JSON.stringify(taxonomy));
    } catch {
      // ignore
    }
  }, [taxonomy]);

  useEffect(() => {
    try {
      localStorage.setItem('vespera_seed', JSON.stringify(seedPhrase));
    } catch {
      // ignore
    }
  }, [seedPhrase]);

  useEffect(() => {
    let active = true;
    const payload = {
      cycles,
      clinicalLogs,
      stripScans,
      phenotype,
      taxonomyPreset: taxonomy.preset,
    };
    encryptVaultData(payload, seedPhrase, e2eeCloudEnabled)
      .then((env) => {
        if (active) {
          setVaultEnvelope(env);
          try {
            localStorage.setItem('vespera_encrypted_sqlcipher_vault', JSON.stringify(env));
          } catch {
            // ignore
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [cycles, clinicalLogs, stripScans, phenotype, taxonomy, seedPhrase, e2eeCloudEnabled]);

  const bayesianPrediction = useMemo(
    () => computeBayesianCyclePrediction(cycles, phenotype),
    [cycles, phenotype]
  );

  const navigateToPage = (page: AppPageId) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleTogglePathway = (pathway: ClinicalPathwayType) => {
    setActivePathways((prev) =>
      prev.includes(pathway) ? prev.filter((p) => p !== pathway) : [...prev, pathway]
    );
  };

  const handleUnlockModule = (id: string) => {
    setModules((prev) => prev.map((m) => (m.id === id ? { ...m, unlocked: true } : m)));
  };

  const handleQuickLogFromCalendar = (dateStr: string) => {
    const estLen = Math.round(bayesianPrediction.posteriorMean) || 35;
    const newRec: CycleRecord = {
      id: `cyc-${Date.now()}`,
      startDate: dateStr,
      lengthDays: estLen,
      bleedingDays: 5,
      ovulationDayEst: Math.max(10, estLen - 13),
      lutealLengthEst: 13,
      notes: `Logged ${taxonomy.primaryEventNoun.toLowerCase()} start from Month Calendar.`,
      symptoms: [],
      bbtAvgCelsius: 36.45,
    };
    setCycles((prev) => [...prev, newRec]);
  };

  const currentPageIndex = PAGES_LIST.findIndex((p) => p.id === activePage);
  const prevPage = currentPageIndex > 0 ? PAGES_LIST[currentPageIndex - 1] : null;
  const nextPage =
    currentPageIndex < PAGES_LIST.length - 1 ? PAGES_LIST[currentPageIndex + 1] : null;

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)] pb-20 md:pb-0">
      {/* Top Bar Contract: 3 Zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-4 sm:px-6 h-14 sm:h-16 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => navigateToPage('home')}
          className="text-lg font-bold tracking-tight font-display text-[var(--text-primary)] whitespace-nowrap shrink-0 cursor-pointer"
        >
          Vespera
        </button>

        {/* Zone 2: 5 concise single-line text navigation links (Desktop) */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[var(--text-secondary)]">
          <button
            type="button"
            onClick={() => navigateToPage('home')}
            className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activePage === 'home'
                ? 'border-[var(--accent-primary)] text-[var(--text-primary)] font-semibold'
                : 'border-transparent'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => navigateToPage('calendar')}
            className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activePage === 'calendar'
                ? 'border-[var(--accent-primary)] text-[var(--text-primary)] font-semibold'
                : 'border-transparent'
            }`}
          >
            Calendar
          </button>
          <button
            type="button"
            onClick={() => navigateToPage('scanner')}
            className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activePage === 'scanner'
                ? 'border-[var(--accent-primary)] text-[var(--text-primary)] font-semibold'
                : 'border-transparent'
            }`}
          >
            Strip Scanner
          </button>
          <button
            type="button"
            onClick={() => navigateToPage('care-paths')}
            className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activePage === 'care-paths'
                ? 'border-[var(--accent-primary)] text-[var(--text-primary)] font-semibold'
                : 'border-transparent'
            }`}
          >
            IVF &amp; HRT
          </button>
          <button
            type="button"
            onClick={() => navigateToPage('partner-sync')}
            className={`hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
              activePage === 'partner-sync'
                ? 'border-[var(--accent-primary)] text-[var(--text-primary)] font-semibold'
                : 'border-transparent'
            }`}
          >
            Partner Sync
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setIsVaultLockedModal(true)}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl vespera-btn-primary active:scale-95 transition-transform whitespace-nowrap shrink-0"
          >
            Lock Private App
          </button>
        </div>
      </header>

      {/* 8-Page Switcher Bar + Instant Theme & Word Bar */}
      <div className="bg-[var(--bg-subtle)] border-b border-[var(--border-subtle)] px-3.5 sm:px-6 py-2.5">
        <div className="max-w-[1380px] mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* All 8 Separate Pages Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {PAGES_LIST.map((p) => {
              const active = activePage === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => navigateToPage(p.id)}
                  className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                    active
                      ? 'vespera-btn-primary'
                      : 'bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {p.shortTitle}
                </button>
              );
            })}
          </div>

          {/* Quick Word & Theme Bar */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-subtle)] shrink-0">
              {(['cycle', 'bleeding', 'menstruation'] as const).map((presetKey) => (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => setTaxonomy(TAXONOMY_PRESETS[presetKey])}
                  className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                    taxonomy.preset === presetKey
                      ? 'vespera-btn-primary'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {TAXONOMY_PRESETS[presetKey].primaryEventNoun}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border border-[var(--border-subtle)] shrink-0">
              {(
                [
                  ['minimal-light', 'Light'],
                  ['deep-dark', 'Dark'],
                  ['high-contrast', 'High-Contrast'],
                  ['deep-sage', 'Sage'],
                  ['calming-blue', 'Blue'],
                ] as const
              ).map(([tId, tLabel]) => (
                <button
                  key={tId}
                  type="button"
                  onClick={() => setTheme(tId)}
                  className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                    theme === tId
                      ? 'vespera-btn-primary'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {tLabel}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Zero-Knowledge Lock Screen Overlay */}
      {isVaultLockedModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="vespera-card max-w-md w-full rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-base font-semibold">
              <Lock className="w-5 h-5 text-[var(--accent-primary)]" />
              <span>Your Vespera App Is Locked</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Everything on screen is hidden and encrypted on your device. No one can read your
              logs while locked.
            </p>
            <button
              type="button"
              onClick={() => setIsVaultLockedModal(false)}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl vespera-btn-primary text-xs font-semibold active:scale-95 transition-transform"
            >
              Unlock My App
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container: Renders ONLY the Active Dedicated Page */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-6">
        {activePage === 'home' && (
          <HomeCheckInPage
            cycles={cycles}
            prediction={bayesianPrediction}
            phenotype={phenotype}
            taxonomy={taxonomy}
            latestScan={stripScans[stripScans.length - 1]}
            onAddCycle={(newCycle) => setCycles((prev) => [...prev, newCycle])}
            onNavigatePage={navigateToPage}
          />
        )}

        {activePage === 'calendar' && (
          <BayesianCalendar
            cycles={cycles}
            prediction={bayesianPrediction}
            taxonomy={taxonomy}
            onQuickLogDate={handleQuickLogFromCalendar}
          />
        )}

        {activePage === 'forecast' && (
          <BayesianDashboardView
            cycles={cycles}
            prediction={bayesianPrediction}
            phenotype={phenotype}
            onChangePhenotype={setPhenotype}
            onAddCycle={(newCycle) => setCycles((prev) => [...prev, newCycle])}
            taxonomy={taxonomy}
          />
        )}

        {activePage === 'scanner' && (
          <VisionStripCalibrator
            scans={stripScans}
            onSaveScan={(newScan) => setStripScans((prev) => [newScan, ...prev])}
          />
        )}

        {activePage === 'care-paths' && (
          <MultiPathClinicalView
            logs={clinicalLogs}
            activePathways={activePathways}
            onTogglePathway={handleTogglePathway}
            onAddLog={(newEntry) => setClinicalLogs((prev) => [newEntry, ...prev])}
            taxonomy={taxonomy}
          />
        )}

        {activePage === 'partner-sync' && (
          <PartnerSyncPage
            prediction={bayesianPrediction}
            clinicalLogs={clinicalLogs}
            taxonomy={taxonomy}
          />
        )}

        {activePage === 'privacy-vault' && (
          <VaultAndP2PView
            envelope={vaultEnvelope}
            seedPhrase={seedPhrase}
            onRegenerateSeed={() => setSeedPhrase(generateRecoverySeedPhrase())}
            e2eeCloudEnabled={e2eeCloudEnabled}
            onToggleE2eeCloud={() => setE2eeCloudEnabled((prev) => !prev)}
            prediction={bayesianPrediction}
            cycles={cycles}
            clinicalLogs={clinicalLogs}
            taxonomy={taxonomy}
            modules={modules}
            onUnlockModule={handleUnlockModule}
          />
        )}

        {activePage === 'settings' && (
          <ThemeAndTaxonomyView
            theme={theme}
            onChangeTheme={setTheme}
            taxonomy={taxonomy}
            onChangeTaxonomy={setTaxonomy}
          />
        )}

        {/* Bottom Previous / Next Page Navigation Bar */}
        <div className="vespera-card rounded-2xl p-4 flex items-center justify-between gap-4">
          {prevPage ? (
            <button
              type="button"
              onClick={() => navigateToPage(prevPage.id)}
              className="min-h-[44px] px-4 py-2 rounded-xl vespera-subtle text-xs font-semibold inline-flex items-center gap-2 active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span className="truncate">Prev: {prevPage.shortTitle}</span>
            </button>
          ) : (
            <div />
          )}

          <span className="text-xs font-mono tabular-nums text-[var(--text-muted)] hidden sm:inline">
            Page {currentPageIndex + 1} of {PAGES_LIST.length} ·{' '}
            {PAGES_LIST[currentPageIndex]?.fullTitle}
          </span>

          {nextPage ? (
            <button
              type="button"
              onClick={() => navigateToPage(nextPage.id)}
              className="min-h-[44px] px-4 py-2 rounded-xl vespera-btn-primary text-xs font-semibold inline-flex items-center gap-2 active:scale-95 transition-transform"
            >
              <span className="truncate">Next: {nextPage.shortTitle}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigateToPage('home')}
              className="min-h-[44px] px-4 py-2 rounded-xl vespera-btn-primary text-xs font-semibold inline-flex items-center gap-2 active:scale-95 transition-transform"
            >
              <span>Back to 1. Home</span>
            </button>
          )}
        </div>
      </main>

      {/* Fixed Bottom Tab Bar for Mobile Thumb Navigation (md:hidden) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] grid grid-cols-5 items-center px-1"
      >
        {(
          [
            { id: 'home', label: 'Home', Icon: Home },
            { id: 'calendar', label: 'Calendar', Icon: Calendar },
            { id: 'forecast', label: 'Forecast', Icon: TrendingUp },
            { id: 'scanner', label: 'Scanner', Icon: Camera },
            { id: 'care-paths', label: 'IVF & HRT', Icon: Activity },
          ] as const
        ).map(({ id, label, Icon }) => {
          const isActive = activePage === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => navigateToPage(id)}
              className={`min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-transform active:scale-95 ${
                isActive
                  ? 'text-[var(--accent-primary)] font-bold'
                  : 'text-[var(--text-muted)] font-medium'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] tracking-tight mt-0.5 whitespace-nowrap truncate max-w-[64px]">
                {label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Quiet Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-4 mt-4">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
          <span>
            Vespera · 100% Private on Your Device · Zero Ads or Data Selling
          </span>
          <span>
            Core Irregular Cycle, IVF/HRT &amp; Partner Sharing Are Free Forever
          </span>
        </div>
      </footer>
    </div>
  );
}
