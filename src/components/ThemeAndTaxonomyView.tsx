import React, { useState } from 'react';
import { Check, Palette, Sliders, Type } from 'lucide-react';
import { TAXONOMY_PRESETS } from '../data/initialData';
import { TaxonomyDictionary, TaxonomyPreset, ThemeMode } from '../types/health';

interface ThemeAndTaxonomyViewProps {
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
  taxonomy: TaxonomyDictionary;
  onChangeTaxonomy: (tax: TaxonomyDictionary) => void;
}

const THEME_OPTIONS: {
  id: ThemeMode;
  name: string;
  subtitle: string;
  canvasHex: string;
  surfaceHex: string;
  accentHex: string;
  textHex: string;
}[] = [
  {
    id: 'minimal-light',
    name: 'Minimal Light',
    subtitle: 'Crisp clinical alabaster canvas with deep teal precision accents',
    canvasHex: '#F8FAFC',
    surfaceHex: '#FFFFFF',
    accentHex: '#0F766E',
    textHex: '#0F172A',
  },
  {
    id: 'deep-dark',
    name: 'Deep Dark',
    subtitle: 'Low-luminance obsidian slate for nocturnal BBT & low-sensory logging',
    canvasHex: '#090D16',
    surfaceHex: '#111827',
    accentHex: '#14B8A6',
    textHex: '#F1F5F9',
  },
  {
    id: 'high-contrast',
    name: 'High-Contrast Accessible',
    subtitle: 'WCAG AAA pure black canvas, 2px borders, and high-visibility amber/cyan',
    canvasHex: '#000000',
    surfaceHex: '#0A0A0A',
    accentHex: '#FACC15',
    textHex: '#FFFFFF',
  },
  {
    id: 'deep-sage',
    name: 'Deep Sage',
    subtitle: 'Calm botanical mineral neutrals without hyper-feminized floral clichés',
    canvasHex: '#F2F5F3',
    surfaceHex: '#FAFCFA',
    accentHex: '#2D6A4F',
    textHex: '#14241B',
  },
  {
    id: 'calming-blue',
    name: 'Calming Blue',
    subtitle: 'Nordic mist slate with serene cerulean clinical clarity',
    canvasHex: '#F0F4F8',
    surfaceHex: '#FFFFFF',
    accentHex: '#0284C7',
    textHex: '#0F2942',
  },
];

export const ThemeAndTaxonomyView: React.FC<ThemeAndTaxonomyViewProps> = ({
  theme,
  onChangeTheme,
  taxonomy,
  onChangeTaxonomy,
}) => {
  const [customNoun, setCustomNoun] = useState(taxonomy.primaryEventNoun);
  const [customAction, setCustomAction] = useState(taxonomy.primaryActionLabel);
  const [customFlow, setCustomFlow] = useState(taxonomy.flowLabel);
  const [customWindow, setCustomWindow] = useState(taxonomy.windowLabel);
  const [customGroup, setCustomGroup] = useState(taxonomy.userGroupPhrase);
  const [customRole, setCustomRole] = useState(taxonomy.supportRoleDefault);

  const handleSelectPreset = (preset: Exclude<TaxonomyPreset, 'custom'>) => {
    const next = TAXONOMY_PRESETS[preset];
    onChangeTaxonomy(next);
    setCustomNoun(next.primaryEventNoun);
    setCustomAction(next.primaryActionLabel);
    setCustomFlow(next.flowLabel);
    setCustomWindow(next.windowLabel);
    setCustomGroup(next.userGroupPhrase);
    setCustomRole(next.supportRoleDefault);
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeTaxonomy({
      preset: 'custom',
      primaryEventNoun: customNoun.trim() || 'Cycle',
      primaryActionLabel: customAction.trim() || 'Log Start',
      flowLabel: customFlow.trim() || 'Flow Intensity',
      windowLabel: customWindow.trim() || 'Projected Window',
      userGroupPhrase: customGroup.trim() || 'People who menstruate',
      supportRoleDefault: customRole.trim() || 'Support Person',
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Customizable Theme Engine */}
      <div className="vespera-card rounded-xl p-6">
        <div className="pb-5 border-b border-[var(--border-subtle)]">
          <div className="text-xs text-[var(--text-muted)] mb-1">
            Zero Pink/Floral Stereotypes · Modular Architectural Color Systems · WCAG AA/AAA Contrast
          </div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Palette className="w-5 h-5 text-[var(--accent-primary)]" />
            <span>Customizable Theme Engine</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-6">
          {THEME_OPTIONS.map((opt) => {
            const active = theme === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeTheme(opt.id)}
                className={`text-left rounded-xl p-4 border transition-all flex flex-col justify-between space-y-4 ${
                  active
                    ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] bg-[var(--bg-subtle)]'
                    : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                }`}
              >
                <div>
                  {/* Color Swatch Bar */}
                  <div className="flex items-center gap-1.5 mb-3">
                    <span
                      className="w-6 h-6 rounded border border-neutral-400/40"
                      style={{ backgroundColor: opt.canvasHex }}
                      title="Canvas"
                    />
                    <span
                      className="w-6 h-6 rounded border border-neutral-400/40"
                      style={{ backgroundColor: opt.surfaceHex }}
                      title="Surface"
                    />
                    <span
                      className="w-6 h-6 rounded border border-neutral-400/40"
                      style={{ backgroundColor: opt.accentHex }}
                      title="Accent"
                    />
                    <span
                      className="w-6 h-6 rounded border border-neutral-400/40"
                      style={{ backgroundColor: opt.textHex }}
                      title="Typography"
                    />
                  </div>
                  <div className="text-sm font-semibold mb-1">{opt.name}</div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {opt.subtitle}
                  </p>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs font-medium">
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">
                    {opt.accentHex}
                  </span>
                  {active ? (
                    <span className="text-[var(--accent-primary)] font-semibold inline-flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="text-[var(--text-muted)]">Apply</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Configurable Taxonomy & Language Toggle */}
      <div className="vespera-card rounded-xl p-6">
        <div className="pb-5 border-b border-[var(--border-subtle)]">
          <div className="text-xs text-[var(--text-muted)] mb-1">
            Gender-Neutral Defaults · Non-Binary & Trans-Inclusive Language · Custom User Vocabulary
          </div>
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Type className="w-5 h-5 text-[var(--accent-primary)]" />
            <span>Configurable Taxonomy & Language Engine</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          {/* Preset Selector */}
          <div className="lg:col-span-5 space-y-3">
            <div className="text-xs font-semibold text-[var(--text-secondary)]">
              One-Click Terminology Presets
            </div>
            {(
              [
                {
                  id: 'cycle',
                  title: '"Cycle" (Neutral Default)',
                  desc: 'Uses "Cycle", "Baseline Flow", "Projected Cycle Window", and "Support Person".',
                },
                {
                  id: 'bleeding',
                  title: '"Bleeding" (Clinical & Direct)',
                  desc: 'Uses "Bleeding", "Bleeding Intensity", and "Projected Bleeding Window". Ideal for HRT, endometriosis, or breakthrough tracking.',
                },
                {
                  id: 'menstruation',
                  title: '"Menstruation / Period"',
                  desc: 'Uses "Period", "Menstrual Flow", "Projected Period Window", and "People who menstruate".',
                },
              ] as const
            ).map((p) => {
              const active = taxonomy.preset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className={`w-full text-left p-4 rounded-lg border transition-colors ${
                    active
                      ? 'vespera-subtle border-[var(--accent-primary)]'
                      : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:bg-[var(--bg-subtle)]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{p.title}</span>
                    {active && (
                      <span className="text-xs font-semibold text-[var(--accent-primary)]">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)]">{p.desc}</p>
                </button>
              );
            })}
          </div>

          {/* Custom User-Defined Vocabulary Form */}
          <form
            onSubmit={handleApplyCustom}
            className="lg:col-span-7 vespera-subtle rounded-lg p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>Custom User-Defined Taxonomy Dictionary</span>
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Every button, chart heading, and P2P sync packet dynamically reflects these terms
                </p>
              </div>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                Mode: {taxonomy.preset.toUpperCase()}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Primary Event Noun
                </label>
                <input
                  type="text"
                  value={customNoun}
                  onChange={(e) => setCustomNoun(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Primary Logging Button Label
                </label>
                <input
                  type="text"
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Flow / Intensity Label
                </label>
                <input
                  type="text"
                  value={customFlow}
                  onChange={(e) => setCustomFlow(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Bayesian Window Heading
                </label>
                <input
                  type="text"
                  value={customWindow}
                  onChange={(e) => setCustomWindow(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Inclusive Descriptor Phrase
                </label>
                <input
                  type="text"
                  value={customGroup}
                  onChange={(e) => setCustomGroup(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                  Default Relational Sync Title
                </label>
                <input
                  type="text"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg vespera-btn-primary text-xs font-semibold"
              >
                Apply Custom Terminology Across App
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
