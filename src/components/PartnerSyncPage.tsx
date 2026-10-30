import React, { useMemo, useState } from 'react';
import { Check, HeartHandshake, Share2 } from 'lucide-react';
import {
  BayesianPrediction,
  ClinicalLogEntry,
  P2PPermissions,
  SupportRoleTitle,
  TaxonomyDictionary,
} from '../types/health';
import { generateEphemeralP2PToken } from '../utils/cryptoEngine';

interface PartnerSyncPageProps {
  prediction: BayesianPrediction;
  clinicalLogs: ClinicalLogEntry[];
  taxonomy: TaxonomyDictionary;
}

const ROLE_OPTIONS: SupportRoleTitle[] = [
  'Support Person',
  'Co-Parent',
  'Partner',
  'Known Donor',
  'Clinical Advocate',
];

export const PartnerSyncPage: React.FC<PartnerSyncPageProps> = ({
  prediction,
  clinicalLogs,
  taxonomy,
}) => {
  const [copiedPacket, setCopiedPacket] = useState(false);
  const [supportRole, setSupportRole] = useState<SupportRoleTitle>('Support Person');
  const [customRoleName, setCustomRoleName] = useState<string>('Sam');
  const [partnerReply, setPartnerReply] = useState<string>(
    'Got it — I picked up your evening prescription and will keep tonight low-key!'
  );
  const [permissions, setPermissions] = useState<P2PPermissions>({
    shareConfidenceWindow: true,
    shareMoodAndEnergy: true,
    sharePhysicalSymptoms: false,
    shareClinicalMedSchedule: true,
    shareOvulationAndStripPeaks: true,
    ephemeralExpiryHours: 72,
  });

  const selectiveP2PPayload = useMemo(
    () => ({
      role: supportRole,
      name: customRoleName,
      sharedFields: permissions,
    }),
    [permissions, supportRole, customRoleName]
  );

  const p2pToken = useMemo(
    () => generateEphemeralP2PToken(selectiveP2PPayload),
    [selectiveP2PPayload]
  );

  const qrMatrix = useMemo(() => {
    const size = 15;
    const grid: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
    const str = p2pToken.encryptedPacketString;

    const drawFinder = (r0: number, c0: number) => {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          const isBorder = r === 0 || r === 4 || c === 0 || c === 4;
          const isCenter = r === 2 && c === 2;
          grid[r0 + r][c0 + c] = isBorder || isCenter;
        }
      }
    };
    drawFinder(0, 0);
    drawFinder(0, size - 5);
    drawFinder(size - 5, 0);

    let charIdx = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const inFinder =
          (r < 5 && c < 5) || (r < 5 && c >= size - 5) || (r >= size - 5 && c < 5);
        if (!inFinder) {
          const code = str.charCodeAt(charIdx % str.length);
          grid[r][c] = ((code + r * 7 + c * 13) & 1) === 1;
          charIdx++;
        }
      }
    }
    return grid;
  }, [p2pToken]);

  const handleCopyPacket = () => {
    navigator.clipboard?.writeText(p2pToken.encryptedPacketString);
    setCopiedPacket(true);
    setTimeout(() => setCopiedPacket(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="vespera-card rounded-2xl p-5 sm:p-6">
        <div className="pb-4 border-b border-[var(--border-subtle)]">
          <div className="text-xs text-[var(--text-muted)] mb-1">
            Page 6 of 8 · Direct Device-to-Device QR Sync · Free Forever
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            Share With Your Partner, Co-Parent, or Support Person
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Other apps lock partner sharing behind a monthly paywall or use outdated labels like
            &ldquo;Predad.&rdquo; Vespera lets you share privately via QR code with full control.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5 items-stretch">
          {/* Left 7 Cols: Easy Toggles */}
          <div className="lg:col-span-7 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  1. Choose Their Role Title
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSupportRole(role)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-medium transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                        supportRole === role
                          ? 'vespera-btn-primary'
                          : 'vespera-subtle text-[var(--text-secondary)]'
                      }`}
                    >
                      {role}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1.5">
                  2. Their Name or Nickname
                </label>
                <input
                  type="text"
                  value={customRoleName}
                  onChange={(e) => setCustomRoleName(e.target.value)}
                  className="w-full min-h-[40px] px-3 py-2 rounded-xl vespera-subtle text-xs text-[var(--text-primary)]"
                />
              </div>
            </div>

            <div className="vespera-subtle rounded-2xl p-4 space-y-2.5">
              <div className="text-xs font-semibold">
                3. Switch ON only what you want {customRoleName || 'them'} to see:
              </div>

              {[
                {
                  key: 'shareConfidenceWindow' as const,
                  label: `Next ${taxonomy.primaryEventNoun} Window`,
                  desc: 'Shows your expected date range without private medical notes',
                },
                {
                  key: 'shareMoodAndEnergy' as const,
                  label: 'Energy & How to Support Me Today',
                  desc: 'Shares helpful tips (e.g., "Low energy today — quiet evening appreciated")',
                },
                {
                  key: 'shareClinicalMedSchedule' as const,
                  label: 'Medication, IVF, or HRT Reminders',
                  desc: 'Helps your support person remind you or prep evening injections',
                },
                {
                  key: 'shareOvulationAndStripPeaks' as const,
                  label: 'Fertility & Ovulation Peak Window',
                  desc: 'Shares when your test strip hits peak fertility for IUI or trying to conceive',
                },
                {
                  key: 'sharePhysicalSymptoms' as const,
                  label: 'Detailed Physical Symptoms (Cramps, Bloating)',
                  desc: 'Turned OFF by default so your bodily details stay private unless you choose',
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between gap-3 py-2.5 border-b last:border-b-0 border-[var(--border-subtle)]"
                >
                  <div>
                    <div className="text-xs font-medium">{item.label}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{item.desc}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setPermissions((prev) => ({ ...prev, [item.key]: !prev[item.key] }))
                    }
                    className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                      permissions[item.key]
                        ? 'vespera-btn-primary'
                        : 'bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-muted)]'
                    }`}
                  >
                    {permissions[item.key] ? 'Shared' : 'Private'}
                  </button>
                </div>
              ))}
            </div>

            {/* Received Encrypted Note From Support Person */}
            <div className="vespera-subtle rounded-2xl p-4 space-y-2 border border-[var(--accent-primary)]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold flex items-center gap-1.5 text-[var(--accent-primary)]">
                  <HeartHandshake className="w-4 h-4" />
                  <span>Encrypted Check-In Note From {customRoleName} ({supportRole}):</span>
                </span>
                <span className="text-[11px] font-mono text-[var(--text-muted)]">Just now</span>
              </div>
              <p className="text-xs font-medium text-[var(--text-primary)]">
                &ldquo;{partnerReply}&rdquo;
              </p>
            </div>
          </div>

          {/* Right 5 Cols: Friendly Phone Preview of What Your Partner Sees */}
          <div className="lg:col-span-5 vespera-subtle rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4">
            <div className="bg-[var(--bg-surface)] rounded-2xl p-4 border border-[var(--border-subtle)] space-y-3">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                <div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Live Preview on {customRoleName}&apos;s Phone
                  </div>
                  <div className="text-sm font-bold">
                    {customRoleName} · {supportRole} View
                  </div>
                </div>
                <span className="text-[11px] font-mono text-[var(--accent-primary)] font-semibold">
                  End-to-End Encrypted
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {permissions.shareConfidenceWindow ? (
                  <div className="p-2.5 rounded-xl vespera-subtle">
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {taxonomy.windowLabel}
                    </div>
                    <div className="font-semibold">
                      Expected between {prediction.coreWindowStartDate} and{' '}
                      {prediction.coreWindowEndDate} (Days {prediction.ci68Low}–{prediction.ci68High})
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] text-[11px]">
                    {taxonomy.windowLabel}: Hidden for privacy
                  </div>
                )}

                {permissions.shareMoodAndEnergy ? (
                  <div className="p-2.5 rounded-xl vespera-subtle">
                    <div className="text-[11px] text-[var(--text-muted)]">
                      How to Support Today
                    </div>
                    <div className="font-medium">
                      Energy is steady · Appreciates a calm evening and hydration check-in
                    </div>
                  </div>
                ) : (
                  <div className="p-2 rounded-xl border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)] text-[11px]">
                    Mood &amp; Energy: Hidden for privacy
                  </div>
                )}

                {permissions.shareClinicalMedSchedule && (
                  <div className="p-2.5 rounded-xl vespera-subtle">
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Upcoming Care Reminder
                    </div>
                    <div className="font-medium">
                      {clinicalLogs[0]?.title || 'Scheduled evening dose'} (
                      {clinicalLogs[0]?.dosageOrValue || 'On schedule'})
                    </div>
                  </div>
                )}

                {permissions.shareOvulationAndStripPeaks && (
                  <div className="p-2.5 rounded-xl vespera-subtle">
                    <div className="text-[11px] text-[var(--text-muted)]">
                      Fertility / Strip Status
                    </div>
                    <div className="font-semibold text-[var(--accent-primary)]">
                      Peak Fertility Detected (Optimal 12–36 hr window)
                    </div>
                  </div>
                )}

                {permissions.sharePhysicalSymptoms && (
                  <div className="p-2.5 rounded-xl vespera-subtle">
                    <div className="text-[11px] text-[var(--text-muted)]">Body Symptoms</div>
                    <div className="font-medium">Mild cramps, pelvic heaviness</div>
                  </div>
                )}
              </div>

              {/* Interactive 1-Tap Support Reply Simulator on Partner's Screen */}
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-1.5">
                <div className="text-[11px] text-[var(--text-muted)]">
                  Test sending a 1-tap support reply from {customRoleName}&apos;s phone:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Bringing warm tea & heating pad!',
                    'Picked up evening prescription!',
                    'Ready for clinic appointment tomorrow!',
                  ].map((msg) => (
                    <button
                      key={msg}
                      type="button"
                      onClick={() => setPartnerReply(msg)}
                      className="px-2.5 py-1 rounded-lg vespera-subtle text-[11px] font-medium hover:border-[var(--accent-primary)] active:scale-95 transition-transform"
                    >
                      {msg}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 bg-[var(--bg-surface)] p-3.5 rounded-2xl border border-[var(--border-subtle)]">
              <div className="bg-white p-2 rounded-xl border border-[var(--border-subtle)] shrink-0">
                <svg width="78" height="78" viewBox="0 0 15 15" shapeRendering="crispEdges">
                  {qrMatrix.map((row, rIdx) =>
                    row.map((cell, cIdx) =>
                      cell ? (
                        <rect
                          key={`${rIdx}-${cIdx}`}
                          x={cIdx}
                          y={rIdx}
                          width={1}
                          height={1}
                          fill="#0F172A"
                        />
                      ) : null
                    )
                  )}
                </svg>
              </div>
              <div className="space-y-2 flex-1 min-w-0">
                <div className="text-xs font-semibold">
                  Scan QR or Send Link to {customRoleName}
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  Connects directly between your two phones with zero server storage.
                </p>
                <button
                  type="button"
                  onClick={handleCopyPacket}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl vespera-btn-primary text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  {copiedPacket ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedPacket ? 'Invite Link Copied!' : 'Copy Private Invite Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
