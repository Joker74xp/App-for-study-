import { BayesianPrediction, CycleRecord, PhenotypeProfile } from '../types/health';

interface PriorParameters {
  mu0: number;     // Prior mean cycle length
  kappa0: number;  // Prior pseudo-observations for mean
  alpha0: number;  // Prior shape for variance
  beta0: number;   // Prior scale for variance
  label: string;
}

const PHENOTYPE_PRIORS: Record<PhenotypeProfile, PriorParameters> = {
  'irregular-pcos': {
    mu0: 36.5,
    kappa0: 1.5,
    alpha0: 2.2,
    beta0: 48.0,
    label: 'PCOS / Oligomenorrheic Heavy-Tail Prior',
  },
  endometriosis: {
    mu0: 27.5,
    kappa0: 2.0,
    alpha0: 2.5,
    beta0: 26.0,
    label: 'Endometriosis Inflammatory Luteal-Shift Prior',
  },
  perimenopause: {
    mu0: 33.0,
    kappa0: 1.2,
    alpha0: 2.0,
    beta0: 65.0,
    label: 'Perimenopausal High-Variance Transition Prior',
  },
  'postpartum-transition': {
    mu0: 38.0,
    kappa0: 1.4,
    alpha0: 2.0,
    beta0: 55.0,
    label: 'Post-Partum / Lactational Return Prior',
  },
  'standard-ovulatory': {
    mu0: 29.0,
    kappa0: 3.0,
    alpha0: 3.5,
    beta0: 14.0,
    label: 'Baseline Ovulatory Conjugate Prior',
  },
};

function addDaysToDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
}

export function computeBayesianCyclePrediction(
  records: CycleRecord[],
  phenotype: PhenotypeProfile
): BayesianPrediction {
  const prior = PHENOTYPE_PRIORS[phenotype];
  const sorted = [...records].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const lengths = sorted.map((r) => r.lengthDays).filter((L) => L >= 14 && L <= 120);

  const n = lengths.length;
  if (n === 0) {
    const std = Math.sqrt(prior.beta0 / (prior.alpha0 - 1));
    return buildPredictionResult(prior.mu0, std, new Date().toISOString().slice(0, 10), prior.label);
  }

  // Recency-weighted sample mean and variance (time-series exponential decay)
  let weightSum = 0;
  let weightedSum = 0;
  lengths.forEach((len, idx) => {
    const recencyWeight = Math.pow(1.18, idx); // More recent cycles carry higher weight
    weightSum += recencyWeight;
    weightedSum += len * recencyWeight;
  });
  const sampleMean = weightedSum / weightSum;

  let weightedSqDiff = 0;
  lengths.forEach((len, idx) => {
    const recencyWeight = Math.pow(1.18, idx);
    weightedSqDiff += recencyWeight * Math.pow(len - sampleMean, 2);
  });
  const sampleVar = n > 1 ? weightedSqDiff / weightSum : prior.beta0 / prior.alpha0;

  // Normal-Gamma Conjugate Posterior Update
  const kappaN = prior.kappa0 + n;
  const muN = (prior.kappa0 * prior.mu0 + n * sampleMean) / kappaN;
  const alphaN = prior.alpha0 + n / 2;
  const sumSqDiff = n * sampleVar;
  const betaN =
    prior.beta0 +
    0.5 * sumSqDiff +
    (prior.kappa0 * n * Math.pow(sampleMean - prior.mu0, 2)) / (2 * kappaN);

  // Posterior predictive scale (Student-t / Gaussian approximation with finite-sample inflation)
  const predictiveVariance = (betaN * (kappaN + 1)) / (alphaN * kappaN);
  const posteriorStdDev = Math.max(1.6, Math.sqrt(predictiveVariance));

  const latestStartDate = sorted[sorted.length - 1].startDate;
  return buildPredictionResult(muN, posteriorStdDev, latestStartDate, prior.label);
}

function buildPredictionResult(
  mean: number,
  stdDev: number,
  latestStartDate: string,
  modelLabel: string
): BayesianPrediction {
  const ci68Low = Math.max(16, Math.round(mean - 1.0 * stdDev));
  const ci68High = Math.min(95, Math.round(mean + 1.0 * stdDev));
  const ci90Low = Math.max(15, Math.round(mean - 1.645 * stdDev));
  const ci90High = Math.min(100, Math.round(mean + 1.645 * stdDev));

  const minDay = Math.max(14, Math.floor(mean - 3.0 * stdDev));
  const maxDay = Math.min(90, Math.ceil(mean + 3.0 * stdDev));

  const densityCurve: { day: number; probability: number; in68: boolean; in90: boolean }[] = [];
  for (let day = minDay; day <= maxDay; day++) {
    const z = (day - mean) / stdDev;
    const pdf = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
    densityCurve.push({
      day,
      probability: Number((pdf * 100).toFixed(2)),
      in68: day >= ci68Low && day <= ci68High,
      in90: day >= ci90Low && day <= ci90High,
    });
  }

  const cv = (stdDev / mean) * 100;

  return {
    posteriorMean: Number(mean.toFixed(1)),
    posteriorStdDev: Number(stdDev.toFixed(1)),
    ci68Low,
    ci68High,
    ci90Low,
    ci90High,
    coreWindowStartDate: addDaysToDate(latestStartDate, ci68Low),
    coreWindowEndDate: addDaysToDate(latestStartDate, ci68High),
    nextWindowStartDate: addDaysToDate(latestStartDate, ci90Low),
    nextWindowEndDate: addDaysToDate(latestStartDate, ci90High),
    coefficientOfVariation: Number(cv.toFixed(1)),
    modelConfidenceLabel: modelLabel,
    densityCurve,
  };
}
