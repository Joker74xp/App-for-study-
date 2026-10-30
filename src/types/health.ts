export type ThemeMode =
  | 'minimal-light'
  | 'deep-dark'
  | 'high-contrast'
  | 'deep-sage'
  | 'calming-blue';

export type TaxonomyPreset = 'cycle' | 'bleeding' | 'menstruation' | 'custom';

export interface TaxonomyDictionary {
  preset: TaxonomyPreset;
  primaryEventNoun: string; // e.g., "Cycle", "Bleeding", "Period", or custom
  primaryActionLabel: string; // e.g., "Log Cycle Start", "Log Bleeding", "Log Period"
  flowLabel: string; // e.g., "Baseline Flow", "Bleeding Intensity", "Menstrual Flow"
  windowLabel: string; // e.g., "Next Cycle Window", "Next Bleeding Window", "Next Period Window"
  userGroupPhrase: string; // e.g., "People who menstruate", "Individuals tracking cycles"
  supportRoleDefault: string; // e.g., "Support Person", "Co-Parent", "Partner"
}

export type PhenotypeProfile =
  | 'irregular-pcos'
  | 'endometriosis'
  | 'perimenopause'
  | 'standard-ovulatory'
  | 'postpartum-transition';

export interface CycleRecord {
  id: string;
  startDate: string; // YYYY-MM-DD
  lengthDays: number;
  bleedingDays: number;
  ovulationDayEst?: number;
  lutealLengthEst?: number;
  notes: string;
  symptoms: string[];
  bbtAvgCelsius?: number;
  isAnovulatorySuspected?: boolean;
}

export interface BayesianPrediction {
  posteriorMean: number;
  posteriorStdDev: number;
  ci68Low: number;
  ci68High: number;
  ci90Low: number;
  ci90High: number;
  nextWindowStartDate: string;
  nextWindowEndDate: string;
  coreWindowStartDate: string;
  coreWindowEndDate: string;
  coefficientOfVariation: number;
  modelConfidenceLabel: string;
  densityCurve: { day: number; probability: number; in68: boolean; in90: boolean }[];
}

export type ClinicalPathwayType =
  | 'natural-irregular'
  | 'ivf'
  | 'iui-ici'
  | 'egg-freezing'
  | 'hrt-gaht';

export interface ClinicalLogEntry {
  id: string;
  date: string;
  pathway: ClinicalPathwayType;
  category: 'medication' | 'ultrasound-lab' | 'insemination' | 'hormone-dose' | 'symptom';
  title: string;
  dosageOrValue: string;
  unit: string;
  routeOrSite?: string;
  estradiolPgMl?: number;
  lhMiuMl?: number;
  progesteroneNgMl?: number;
  follicleCount?: number;
  leadFollicleMm?: number;
  notes: string;
}

export type StripType = 'LH-Ovulation' | 'hCG-Pregnancy' | 'PdG-Progesterone';

export type SimulatedLighting =
  | 'warm-tungsten-2700k'
  | 'low-light-shadow'
  | 'overexposed-flash'
  | 'daylight-calibrated-5500k';

export interface StripScanResult {
  id: string;
  timestamp: string;
  stripType: StripType;
  lightingCondition: string;
  ambientLuxEstimate: number;
  whiteBalanceGainRGB: [number, number, number];
  controlLineIntensity: number;
  testLineIntensity: number;
  backgroundNoise: number;
  tcRatioRaw: number;
  tcRatioCalibrated: number;
  interpretation: 'Baseline / Low' | 'Rising Surge' | 'Peak Detected' | 'Positive';
  confidencePercent: number;
}

export type SupportRoleTitle =
  | 'Support Person'
  | 'Co-Parent'
  | 'Partner'
  | 'Known Donor'
  | 'Clinical Advocate';

export interface P2PPermissions {
  shareConfidenceWindow: boolean;
  shareMoodAndEnergy: boolean;
  sharePhysicalSymptoms: boolean;
  shareClinicalMedSchedule: boolean;
  shareOvulationAndStripPeaks: boolean;
  ephemeralExpiryHours: number;
}

export interface EncryptedVaultEnvelope {
  cipherSuite: string;
  kdf: string;
  saltHex: string;
  ivHex: string;
  ciphertextPreview: string;
  fullCiphertextBase64: string;
  byteSize: number;
  lastEncryptedAt: string;
  e2eeCloudSyncEnabled: boolean;
}

export interface MicroModule {
  id: string;
  title: string;
  subtitle: string;
  priceLabel: string;
  type: 'free-core' | 'micro-purchase' | 'compute-pass';
  unlocked: boolean;
  description: string;
  deliverableFormat: string;
}
