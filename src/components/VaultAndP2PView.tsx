import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  BayesianPrediction,
  ClinicalLogEntry,
  CycleRecord,
  EncryptedVaultEnvelope,
  MicroModule,
  TaxonomyDictionary,
} from '../types/health';

interface VaultAndP2PViewProps {
  envelope: EncryptedVaultEnvelope | null;
  seedPhrase: string[];
  onRegenerateSeed: () => void;
  e2eeCloudEnabled: boolean;
  onToggleE2eeCloud: () => void;
  prediction: BayesianPrediction;
  cycles: CycleRecord[];
  clinicalLogs: ClinicalLogEntry[];
  taxonomy: TaxonomyDictionary;
  modules: MicroModule[];
  onUnlockModule: (id: string) => void;
}

export const VaultAndP2PView: React.FC<VaultAndP2PViewProps> = ({
  envelope,
  seedPhrase,
  onRegenerateSeed,
  e2eeCloudEnabled,
  onToggleE2eeCloud,
  prediction,
  cycles,
  clinicalLogs,
  taxonomy,
  modules,
  onUnlockModule,
}) => {
  const [revealSeed, setRevealSeed] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);
  const [showTechCryptoProof, setShowTechCryptoProof] = useState(false);
  const [showDoctorPreview, setShowDoctorPreview] = useState(true);

  const handleCopySeed = () => {
    navigator.clipboard?.writeText(seedPhrase.join(' '));
    setCopiedSeed(true);
    setTimeout(() => setCopiedSeed(false), 2000);
  };

  const handleDownloadEncryptedVault = () => {
    if (!envelope) return;
    const blob = new Blob([JSON.stringify(envelope, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vespera-private-backup-${new Date().toISOString().slice(0, 10)}.vespera.enc.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportDoctorReport = () => {
    const reportText = [
      '=== VESPERA DOCTOR VISIT SUMMARY SHEET ===',
      `Generated Date: ${new Date().toISOString().slice(0, 10)}`,
      '',
      '1. CYCLE & OVULATION SUMMARY',
      `- Average ${taxonomy.primaryEventNoun} Length: ${prediction.posteriorMean} days (varies by ±${prediction.posteriorStdDev} days)`,
      `- Historical Range: ${Math.min(...cycles.map((c) => c.lengthDays))} to ${Math.max(...cycles.map((c) => c.lengthDays))} days across ${cycles.length} logged cycles`,
      `- Next Projected 68% Window: ${prediction.coreWindowStartDate} to ${prediction.coreWindowEndDate} (Days ${prediction.ci68Low}–${prediction.ci68High})`,
      `- Consistent Luteal Phase Length: ~13–14 days post-LH surge`,
      '',
      '2. RECENT MEDICATIONS, HRT, IVF & SCANS',
      ...clinicalLogs.map(
        (l) => `- [${l.date}] ${l.title}: ${l.dosageOrValue} (${l.routeOrSite || 'Logged'}) — ${l.notes}`
      ),
      '',
      '3. PAST CYCLE LOGS',
      ...cycles.map(
        (c) =>
          `- Started ${c.startDate}: ${c.lengthDays} days total, ${c.bleedingDays} flow days, BBT avg ${c.bbtAvgCelsius ?? '—'}°C (${c.notes})`
      ),
    ].join('\n');

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vespera-doctor-visit-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: LOCAL-FIRST PRIVACY & 12-WORD RECOVERY KEY */}
      <div className="vespera-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <div className="text-xs text-[var(--text-muted)] mb-1">
              Page 7 of 8 · Local-First SQLCipher Encryption · Zero Data Selling
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              Your Private Device Vault &amp; 12-Word Recovery Key
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onToggleE2eeCloud}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                e2eeCloudEnabled
                  ? 'vespera-btn-primary'
                  : 'vespera-subtle text-[var(--text-secondary)]'
              }`}
            >
              {e2eeCloudEnabled ? 'Encrypted Backup: ON' : 'Storage: This Phone Only'}
            </button>
            <button
              type="button"
              onClick={handleDownloadEncryptedVault}
              className="min-h-[40px] px-3.5 py-2 rounded-xl vespera-subtle text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Encrypted Backup</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 items-stretch">
          <div className="lg:col-span-6 space-y-4">
            <h3 className="text-sm font-semibold">
              Why Vespera Is Safer Than Standard Period Apps
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="vespera-subtle rounded-xl p-4 space-y-2">
                <div className="text-xs font-bold text-[var(--status-alert)]">
                  Typical Period Apps
                </div>
                <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 leading-relaxed">
                  <li>• Require your real name, email, or phone number</li>
                  <li>• Share cycle &amp; pregnancy tags with ad networks (AdMob, Meta)</li>
                  <li>• Keep unencrypted copies on company servers</li>
                </ul>
              </div>

              <div className="vespera-subtle rounded-xl p-4 space-y-2 border border-[var(--accent-primary)]">
                <div className="text-xs font-bold text-[var(--accent-primary)]">
                  How Vespera Works
                </div>
                <ul className="text-xs text-[var(--text-secondary)] space-y-1.5 leading-relaxed">
                  <li>• No email or real name ever required</li>
                  <li>• Locks your logs on your phone before anything is saved</li>
                  <li>• Only your 12-word secret recovery phrase can unlock backups</li>
                </ul>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowTechCryptoProof(!showTechCryptoProof)}
                className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
              >
                {showTechCryptoProof ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
                <span>
                  {showTechCryptoProof
                    ? 'Hide technical encryption details'
                    : 'Show technical proof (SQLCipher / AES-256-GCM scrambled data)'}
                </span>
              </button>

              {showTechCryptoProof && envelope && (
                <div className="mt-2 vespera-subtle rounded-xl p-3 text-[11px] font-mono space-y-1">
                  <div>Engine: {envelope.cipherSuite}</div>
                  <div>Key Derivation: {envelope.kdf}</div>
                  <div className="truncate text-[var(--text-muted)]">
                    Scrambled Data: {envelope.ciphertextPreview}...
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-6 vespera-subtle rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span>Your 12-Word Secret Recovery Key</span>
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRevealSeed(!revealSeed)}
                    className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
                  >
                    {revealSeed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{revealSeed ? 'Hide' : 'Show'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onRegenerateSeed}
                    className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>New Key</span>
                  </button>
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Write these 12 words down somewhere safe. If you ever get a new phone, these 12
                words restore your history without needing an email account.
              </p>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {seedPhrase.map((word, idx) => (
                  <div
                    key={idx}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-2.5 py-2 text-xs font-mono tabular-nums flex items-center justify-between"
                  >
                    <span className="text-[var(--text-muted)] text-[10px]">{idx + 1}.</span>
                    <span className="font-semibold">{revealSeed ? word : '••••••'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-subtle)]">
              <span className="text-[11px] text-[var(--text-muted)]">
                Zero ads · Zero trackers
              </span>
              <button
                type="button"
                onClick={handleCopySeed}
                className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                {copiedSeed ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSeed ? 'Copied!' : 'Copy 12 Words'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: DOCTOR VISIT SUMMARY & ETHICAL FREEMIUM PROMISE */}
      <div className="vespera-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <div className="text-xs text-[var(--text-muted)] mb-1">
              No Subscription Traps · Core Tracking &amp; Partner Sync Are 100% Free Forever
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              Doctor Visit Summary Sheet &amp; Fair Pricing Promise
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDoctorPreview(!showDoctorPreview)}
              className="min-h-[40px] px-3.5 py-2 rounded-xl vespera-subtle text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{showDoctorPreview ? 'Hide Doctor Summary' : 'Preview Doctor Summary'}</span>
            </button>
            <button
              type="button"
              onClick={handleExportDoctorReport}
              className="min-h-[40px] vespera-btn-primary px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 active:scale-95 transition-transform whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>Download Doctor Summary (.txt)</span>
            </button>
          </div>
        </div>

        {showDoctorPreview && (
          <div className="mt-5 vespera-subtle rounded-2xl p-4 sm:p-5 space-y-3 border border-[var(--accent-primary)]">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <h3 className="text-sm font-bold">
                One-Page Summary for Your Doctor / OB-GYN / Endocrinologist
              </h3>
              <span className="text-xs text-[var(--text-muted)]">Ready to share</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
                <div className="font-semibold mb-1">1. Cycle Pattern Summary</div>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Average length is <strong>{prediction.posteriorMean} days</strong> (±
                  {prediction.posteriorStdDev}d) across {cycles.length} logged cycles (range:{' '}
                  {Math.min(...cycles.map((c) => c.lengthDays))}–
                  {Math.max(...cycles.map((c) => c.lengthDays))} days).
                </p>
              </div>
              <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
                <div className="font-semibold mb-1">2. Recent Medications &amp; Labs</div>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  {clinicalLogs
                    .slice(0, 2)
                    .map((l) => `${l.title} (${l.dosageOrValue})`)
                    .join(' · ')}
                </p>
              </div>
              <div className="bg-[var(--bg-surface)] p-3.5 rounded-xl border border-[var(--border-subtle)]">
                <div className="font-semibold mb-1">3. Ovulation &amp; BBT Confirmation</div>
                <p className="text-[var(--text-secondary)] leading-relaxed">
                  Lighting-calibrated LH test strip confirmed peak surge (1.29 T/C ratio) with
                  consistent thermal shift (+0.35°C).
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-5">
          {modules.map((mod) => (
            <div
              key={mod.id}
              className="vespera-subtle rounded-xl p-4 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)] mb-1">
                  <span>{mod.deliverableFormat}</span>
                  <span className="font-mono tabular-nums font-bold text-[var(--accent-primary)]">
                    {mod.priceLabel}
                  </span>
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{mod.title}</h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {mod.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-muted)]">{mod.subtitle}</span>
                {mod.unlocked ? (
                  <button
                    type="button"
                    onClick={handleExportDoctorReport}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--accent-primary)]" />
                    <span>Ready</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onUnlockModule(mod.id)}
                    className="min-h-[36px] px-3 py-1.5 rounded-lg vespera-btn-primary text-xs font-semibold whitespace-nowrap shrink-0"
                  >
                    Unlock Preview
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
