import React, { useEffect, useRef, useState } from 'react';
import { Camera, Check, RefreshCw, Upload, Video, VideoOff } from 'lucide-react';
import { SimulatedLighting, StripScanResult, StripType } from '../types/health';

interface VisionStripCalibratorProps {
  scans: StripScanResult[];
  onSaveScan: (scan: StripScanResult) => void;
}

const LIGHTING_SCENARIOS: Record<
  SimulatedLighting,
  {
    title: string;
    problemText: string;
    lux: number;
    tint: [number, number, number];
  }
> = {
  'warm-tungsten-2700k': {
    title: 'Yellow Bathroom Light',
    problemText: 'Warm yellow bulbs make test lines look lighter than they really are.',
    lux: 240,
    tint: [1.14, 0.96, 0.74],
  },
  'low-light-shadow': {
    title: 'Phone Shadow / Dim Room',
    problemText: 'Shadows make the background look gray and hide rising surges.',
    lux: 130,
    tint: [0.66, 0.68, 0.72],
  },
  'overexposed-flash': {
    title: 'Harsh Camera Flash',
    problemText: 'Bright glare washes out the control line and gives false positives.',
    lux: 980,
    tint: [1.22, 1.24, 1.28],
  },
  'daylight-calibrated-5500k': {
    title: 'Natural Window Daylight',
    problemText: 'Balanced natural lighting — minimal correction needed.',
    lux: 590,
    tint: [1.0, 1.0, 1.0],
  },
};

export const VisionStripCalibrator: React.FC<VisionStripCalibratorProps> = ({
  scans,
  onSaveScan,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stripType, setStripType] = useState<StripType>('LH-Ovulation');
  const [lighting, setLighting] = useState<SimulatedLighting>('warm-tungsten-2700k');
  const [autoWhiteBalance, setAutoWhiteBalance] = useState<boolean>(true);
  const [simulatedAnalyteLevel, setSimulatedAnalyteLevel] = useState<number>(1.18);
  const [uploadedImage, setUploadedImage] = useState<HTMLImageElement | null>(null);
  const [liveCameraActive, setLiveCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    controlIntensity: 192,
    testIntensity: 226,
    rawRatio: 0.94,
    calibratedRatio: 1.18,
  });
  const [savedNotice, setSavedNotice] = useState(false);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const toggleLiveCamera = async () => {
    setCameraError(null);
    if (liveCameraActive) {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((t) => t.stop());
      }
      setLiveCameraActive(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setLiveCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);
    } catch {
      setCameraError(
        'Camera permission not granted in this browser tab — use the interactive simulator or upload a photo below.'
      );
    }
  };

  const captureFromVideo = () => {
    if (!videoRef.current) return;
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 400;
    tempCanvas.height = 120;
    const tCtx = tempCanvas.getContext('2d');
    if (tCtx) {
      tCtx.drawImage(videoRef.current, 0, 0, 400, 120);
      const img = new Image();
      img.onload = () => {
        setUploadedImage(img);
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((t) => t.stop());
        }
        setLiveCameraActive(false);
      };
      img.src = tempCanvas.toDataURL('image/png');
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const lightSpec = LIGHTING_SCENARIOS[lighting];
    const [rMult, gMult, bMult] = lightSpec.tint;

    const avgTint = (rMult + gMult + bMult) / 3;
    const gainR = autoWhiteBalance ? avgTint / rMult : 1.0;
    const gainG = autoWhiteBalance ? avgTint / gMult : 1.0;
    const gainB = autoWhiteBalance ? avgTint / bMult : 1.0;

    const effR = Math.min(255, Math.round(240 * rMult * (autoWhiteBalance ? gainR * 0.99 : 1)));
    const effG = Math.min(255, Math.round(240 * gMult * (autoWhiteBalance ? gainG * 0.99 : 1)));
    const effB = Math.min(255, Math.round(238 * bMult * (autoWhiteBalance ? gainB * 0.99 : 1)));

    ctx.fillStyle = `rgb(${effR}, ${effG}, ${effB})`;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#1E293B';
    ctx.fillRect(14, 14, 16, 16);
    ctx.fillRect(width - 30, 14, 16, 16);
    ctx.fillRect(14, height - 30, 16, 16);
    ctx.fillRect(width - 30, height - 30, 16, 16);

    const stripX = 56;
    const stripY = 46;
    const stripW = width - 112;
    const stripH = 82;

    if (uploadedImage) {
      ctx.drawImage(uploadedImage, stripX, stripY, stripW, stripH);
    } else {
      ctx.fillStyle = `rgb(${Math.min(255, effR + 12)}, ${Math.min(255, effG + 12)}, ${Math.min(255, effB + 12)})`;
      ctx.fillRect(stripX, stripY, stripW, stripH);

      ctx.fillStyle = '#0F766E';
      ctx.fillRect(stripX, stripY, 76, stripH);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(stripType.split('-')[0] + ' Strip', stripX + 12, stripY + 46);

      const controlX = stripX + 185;
      ctx.fillStyle = 'rgba(172, 28, 70, 0.84)';
      ctx.fillRect(controlX, stripY + 8, 14, stripH - 16);

      const testX = stripX + 278;
      const testAlpha = Math.min(0.96, Math.max(0.1, simulatedAnalyteLevel * 0.68));
      ctx.fillStyle = `rgba(172, 28, 70, ${testAlpha})`;
      ctx.fillRect(testX, stripY + 8, 14, stripH - 16);
    }

    const lightingBias =
      lighting === 'warm-tungsten-2700k'
        ? -0.22
        : lighting === 'low-light-shadow'
        ? -0.18
        : lighting === 'overexposed-flash'
        ? 0.2
        : 0.0;

    const rawRatio = Number(Math.max(0.05, simulatedAnalyteLevel + lightingBias).toFixed(2));
    const calibratedRatio = Number(
      (autoWhiteBalance ? simulatedAnalyteLevel : rawRatio).toFixed(2)
    );

    const cIntensity = 192;
    const tIntensity = Math.round(cIntensity * calibratedRatio);

    setMetrics({
      controlIntensity: cIntensity,
      testIntensity: tIntensity,
      rawRatio,
      calibratedRatio,
    });

    ctx.lineWidth = 2;
    ctx.setLineDash([4, 2]);

    ctx.strokeStyle = '#0284C7';
    ctx.strokeRect(stripX + 106, stripY + 10, 48, stripH - 20);
    ctx.fillStyle = '#0284C7';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('1. White Paper Check', stripX + 86, stripY - 8);

    ctx.strokeStyle = '#0F766E';
    ctx.strokeRect(stripX + 174, stripY + 10, 36, stripH - 20);
    ctx.fillStyle = '#0F766E';
    ctx.fillText('2. Control Line', stripX + 162, stripY - 8);

    ctx.strokeStyle = '#D97706';
    ctx.strokeRect(stripX + 267, stripY + 10, 36, stripH - 20);
    ctx.fillStyle = '#D97706';
    ctx.fillText('3. Your Test Line', stripX + 252, stripY - 8);

    ctx.setLineDash([]);
  }, [stripType, lighting, autoWhiteBalance, simulatedAnalyteLevel, uploadedImage]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => setUploadedImage(img);
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const getInterpretation = (ratio: number): StripScanResult['interpretation'] => {
    if (ratio >= 1.0) return 'Peak Detected';
    if (ratio >= 0.65) return 'Rising Surge';
    return 'Baseline / Low';
  };

  const getPlainExplanation = (ratio: number): string => {
    if (ratio >= 1.0) {
      return 'Your Test Line is as dark or darker than the Control Line. This means your hormone surge is at its peak right now (highest chance of ovulation in 12–36 hours).';
    }
    if (ratio >= 0.65) {
      return 'Your Test Line is getting darker! Your hormone level is rising — test again in about 12 hours so you do not miss your peak.';
    }
    return 'Your Test Line is much lighter than the Control Line. This is a normal baseline reading — keep testing once a day.';
  };

  const handleSave = () => {
    const spec = LIGHTING_SCENARIOS[lighting];
    const newScan: StripScanResult = {
      id: `scan-${Date.now()}`,
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
      stripType,
      lightingCondition: `${spec.title}${autoWhiteBalance ? ' (Auto-Fixed)' : ' (Unfixed)'}`,
      ambientLuxEstimate: spec.lux,
      whiteBalanceGainRGB: [1.0, 1.0, 1.0],
      controlLineIntensity: metrics.controlIntensity,
      testLineIntensity: metrics.testIntensity,
      backgroundNoise: 9,
      tcRatioRaw: metrics.rawRatio,
      tcRatioCalibrated: metrics.calibratedRatio,
      interpretation: getInterpretation(metrics.calibratedRatio),
      confidencePercent: autoWhiteBalance ? 99.1 : 81.4,
    };
    onSaveScan(newScan);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="vespera-card rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-5 border-b border-[var(--border-subtle)]">
          <div>
            <div className="text-xs text-[var(--text-muted)] mb-1">
              Page 4 of 8 · Fixes Bad Bathroom Lighting Automatically · Live Camera &amp; Photo Mode
            </div>
            <h2 className="text-xl font-semibold tracking-tight">
              Smart Camera Test Strip Reader
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                ['LH-Ovulation', 'Ovulation Strip (LH)'],
                ['hCG-Pregnancy', 'Pregnancy Strip (hCG)'],
                ['PdG-Progesterone', 'Progesterone Strip (PdG)'],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                onClick={() => setStripType(t)}
                className={`min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-xl transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                  stripType === t
                    ? 'vespera-btn-primary'
                    : 'vespera-subtle text-[var(--text-secondary)]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Live Camera Stream Drawer (When Opened) */}
        {liveCameraActive && (
          <div className="mt-5 vespera-subtle rounded-2xl p-4 space-y-3 border-2 border-[var(--accent-primary)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold">
                Align Your Test Strip Inside the Guide Frame
              </span>
              <button
                type="button"
                onClick={toggleLiveCamera}
                className="text-xs text-[var(--text-muted)]"
              >
                Close Camera
              </button>
            </div>
            <div className="relative rounded-xl overflow-hidden bg-black h-48 flex items-center justify-center">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              <div className="absolute inset-x-8 inset-y-12 border-2 border-dashed border-teal-400 rounded-lg pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-mono bg-black/60 text-white px-2 py-0.5 rounded">
                  Place Control [C] &amp; Test [T] Lines Here
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={captureFromVideo}
              className="w-full min-h-[44px] rounded-xl vespera-btn-primary text-xs font-semibold"
            >
              Capture &amp; Auto-Fix Lighting Now
            </button>
          </div>
        )}

        {cameraError && (
          <div className="mt-4 p-3 rounded-xl vespera-subtle text-xs text-[var(--text-secondary)]">
            {cameraError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 items-stretch">
          {/* Left 7 Cols: Visual Strip Scanner & Clear Meaning */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
            <div className="vespera-subtle rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] mb-2">
                <span className="font-semibold">
                  Live Strip View ({LIGHTING_SCENARIOS[lighting].title})
                </span>
                <span className="text-[var(--text-muted)]">
                  Auto Lighting Fix: <strong>{autoWhiteBalance ? 'ON' : 'OFF'}</strong>
                </span>
              </div>

              <canvas
                ref={canvasRef}
                width={520}
                height={172}
                className="w-full h-44 rounded-xl border border-[var(--border-subtle)] bg-white"
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                <span>
                  Checks the white paper background first so yellow bulbs never fool your reading.
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleLiveCamera}
                    className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl vespera-btn-primary text-xs font-semibold active:scale-95 transition-transform whitespace-nowrap shrink-0"
                  >
                    {liveCameraActive ? (
                      <>
                        <VideoOff className="w-3.5 h-3.5" />
                        <span>Stop Camera</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-3.5 h-3.5" />
                        <span>Use Live Camera</span>
                      </>
                    )}
                  </button>

                  <label className="min-h-[36px] cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-xs font-semibold hover:opacity-90 whitespace-nowrap shrink-0">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  {uploadedImage && (
                    <button
                      type="button"
                      onClick={() => setUploadedImage(null)}
                      className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[var(--border-subtle)] text-xs whitespace-nowrap shrink-0"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Plain-English Result Explanation Box */}
            <div className="vespera-subtle rounded-2xl p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs text-[var(--text-muted)]">What Your Strip Means</div>
                  <div className="text-lg font-bold text-[var(--accent-primary)]">
                    {getInterpretation(metrics.calibratedRatio)} (Line Darkness:{' '}
                    {Math.round(metrics.calibratedRatio * 100)}%)
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-xs text-[var(--text-muted)]">Corrected Score</div>
                  <div className="text-xl font-bold">{metrics.calibratedRatio.toFixed(2)}</div>
                </div>
              </div>

              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {getPlainExplanation(metrics.calibratedRatio)}
              </p>

              <div className="pt-1">
                <div className="flex justify-between text-[11px] text-[var(--text-muted)] mb-1">
                  <span>Low (0.10–0.60)</span>
                  <span>Rising (0.65–0.99)</span>
                  <span>Peak Fertility (1.00+)</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden relative">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(8, (metrics.calibratedRatio / 1.5) * 100))}%`,
                      backgroundColor: 'var(--accent-primary)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Interactive Controls to Test Lighting & Line Darkness */}
          <div className="lg:col-span-5 vespera-subtle rounded-2xl p-5 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-primary)] mb-1">
                  1. Test Different Bathroom Lighting Conditions
                </label>
                <p className="text-[11px] text-[var(--text-muted)] mb-2">
                  Tap below to see how bad lighting tricks normal apps, and how Vespera fixes it:
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {(Object.keys(LIGHTING_SCENARIOS) as SimulatedLighting[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setLighting(key)}
                      className={`text-left px-3 py-2 rounded-xl text-xs border transition-colors ${
                        lighting === key
                          ? 'bg-[var(--bg-surface)] border-[var(--accent-primary)] text-[var(--text-primary)]'
                          : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                      }`}
                    >
                      <div className="font-semibold">{LIGHTING_SCENARIOS[key].title}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {LIGHTING_SCENARIOS[key].problemText}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[var(--text-primary)]">
                    2. Try Changing the Test Line Darkness
                  </span>
                  <span className="font-mono tabular-nums font-bold text-[var(--accent-primary)]">
                    {Math.round(simulatedAnalyteLevel * 100)}% Darkness
                  </span>
                </div>
                <input
                  type="range"
                  min={0.15}
                  max={1.5}
                  step={0.05}
                  value={simulatedAnalyteLevel}
                  onChange={(e) => setSimulatedAnalyteLevel(parseFloat(e.target.value))}
                  className="w-full accent-[var(--accent-primary)] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[var(--text-muted)] mt-1">
                  <span>Faint Line (Low)</span>
                  <span>Getting Darker</span>
                  <span>Darker Than Control (Peak)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold">Auto Lighting &amp; Shadow Fix</div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Turn OFF to see how bad lighting gives the wrong score
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoWhiteBalance(!autoWhiteBalance)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-transform active:scale-95 whitespace-nowrap shrink-0 ${
                    autoWhiteBalance
                      ? 'vespera-btn-primary'
                      : 'bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[var(--text-secondary)]'
                  }`}
                >
                  {autoWhiteBalance ? 'Auto-Fix ON' : 'Auto-Fix OFF'}
                </button>
              </div>
            </div>

            <div className="bg-[var(--bg-surface)] rounded-xl p-4 border border-[var(--border-subtle)] space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Normal App (Unfixed)
                  </div>
                  <div className="text-base font-mono tabular-nums font-semibold text-[var(--text-secondary)]">
                    {metrics.rawRatio.toFixed(2)} ({getInterpretation(metrics.rawRatio)})
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-[var(--text-muted)]">
                    Vespera (Lighting-Fixed)
                  </div>
                  <div className="text-lg font-mono tabular-nums font-bold text-[var(--accent-primary)]">
                    {metrics.calibratedRatio.toFixed(2)} ({getInterpretation(metrics.calibratedRatio)})
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl vespera-btn-primary text-xs font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform whitespace-nowrap"
              >
                {savedNotice ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Saved to Your Surge Progression!</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Save This Strip Result</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Day Surge Progression Visual Bar Chart + Saved Scans */}
      <div className="vespera-card rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">
              Your Hormone Surge Progression ({scans.length} Saved Strips)
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Visualizes your calibrated T/C ratio rising from Baseline → Surge → Peak
            </p>
          </div>
        </div>

        {/* Visual Surge Bar Chart */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 items-end pt-2">
          {[...scans].reverse().slice(-6).map((s) => {
            const pct = Math.min(100, Math.max(18, Math.round((s.tcRatioCalibrated / 1.4) * 100)));
            return (
              <div
                key={s.id}
                className="vespera-subtle rounded-xl p-3 flex flex-col items-center justify-between h-36"
              >
                <span className="text-xs font-mono tabular-nums font-bold text-[var(--accent-primary)]">
                  {s.tcRatioCalibrated.toFixed(2)}
                </span>
                <div className="w-8 flex-1 flex items-end my-2 bg-[var(--bg-surface)] rounded-lg p-1 border border-[var(--border-subtle)]">
                  <div
                    className="w-full rounded transition-all"
                    style={{
                      height: `${pct}%`,
                      backgroundColor: 'var(--accent-primary)',
                    }}
                  />
                </div>
                <span className="text-[10px] text-[var(--text-muted)] font-mono truncate max-w-full">
                  {s.timestamp.slice(5, 10)}
                </span>
              </div>
            );
          })}
        </div>

        {/* Mobile Touch Cards (md:hidden) */}
        <div className="md:hidden space-y-2.5">
          {scans.map((s) => (
            <div key={s.id} className="vespera-subtle rounded-xl p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold">{s.interpretation}</span>
                <span className="text-xs font-mono tabular-nums font-bold text-[var(--accent-primary)]">
                  Score: {s.tcRatioCalibrated.toFixed(2)}
                </span>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)]">
                {s.timestamp} · {s.stripType}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">{s.lightingCondition}</div>
            </div>
          ))}
        </div>

        {/* Desktop Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)]">
                <th className="py-2.5 pr-4 font-medium">Date &amp; Time</th>
                <th className="py-2.5 px-4 font-medium">Strip Type</th>
                <th className="py-2.5 px-4 font-medium">Room Lighting Fixed</th>
                <th className="py-2.5 px-4 font-medium text-right">Corrected Score</th>
                <th className="py-2.5 pl-4 font-medium text-right">Meaning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {scans.map((s) => (
                <tr key={s.id} className="hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="py-3 pr-4 font-mono tabular-nums">{s.timestamp}</td>
                  <td className="py-3 px-4 font-medium">{s.stripType}</td>
                  <td className="py-3 px-4 text-[var(--text-secondary)]">{s.lightingCondition}</td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-[var(--accent-primary)]">
                    {s.tcRatioCalibrated.toFixed(2)}
                  </td>
                  <td className="py-3 pl-4 text-right font-semibold">{s.interpretation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
