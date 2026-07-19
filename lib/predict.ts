import type { ParsedCsv } from './csv';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface SensorStat {
  name: string;
  avg: number;
  min: number;
  max: number;
  latest: number;
  unit?: string;
  trend: 'up' | 'down' | 'stable';
  deviation: number;
  series: { index: number; value: number }[];
}

export interface HealthMetrics {
  overallHealth: number;
  anomalyCount: number;
  criticalSensors: number;
  avgDeviation: number;
  trendStability: number;
}

export interface PredictionResult {
  riskLevel: RiskLevel;
  riskScore: number;
  metrics: HealthMetrics;
  sensorSummary: SensorStat[];
  recordCount: number;
}

// Plausible baseline ranges for common industrial sensor names.
// If a sensor name matches a known type, use that baseline; otherwise derive
// from the data itself (mean ± tolerance).
const KNOWN_BASELINES: Record<
  string,
  { min: number; max: number; unit?: string }
> = {
  temperature: { min: 20, max: 75, unit: '°C' },
  temp: { min: 20, max: 75, unit: '°C' },
  vibration: { min: 0, max: 10, unit: 'mm/s' },
  pressure: { min: 80, max: 120, unit: 'kPa' },
  rpm: { min: 1400, max: 1800, unit: 'rpm' },
  humidity: { min: 30, max: 70, unit: '%' },
  load: { min: 40, max: 90, unit: '%' },
  current: { min: 5, max: 25, unit: 'A' },
  voltage: { min: 210, max: 240, unit: 'V' },
  flow: { min: 50, max: 150, unit: 'L/min' },
  speed: { min: 1400, max: 1800, unit: 'rpm' },
  noise: { min: 40, max: 85, unit: 'dB' },
};

function findBaseline(name: string) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(KNOWN_BASELINES)) {
    if (lower.includes(key)) return KNOWN_BASELINES[key];
  }
  return null;
}

export function analyzeSensorData(
  parsed: ParsedCsv,
  machineName: string
): PredictionResult {
  const { rows, numericColumns, rowCount } = parsed;

  const sensorSummary: SensorStat[] = numericColumns.map((col) => {
    const series = rows.map((r, idx) => ({
      index: idx,
      value: Number(r[col]),
    }));
    const values = series.map((s) => s.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = values[values.length - 1];

    // Trend: compare last 20% avg vs first 20% avg
    const segmentSize = Math.max(1, Math.floor(values.length * 0.2));
    const firstAvg =
      values.slice(0, segmentSize).reduce((a, b) => a + b, 0) / segmentSize;
    const lastAvg =
      values
        .slice(-segmentSize)
        .reduce((a, b) => a + b, 0) / segmentSize;
    const delta = lastAvg - firstAvg;
    const range = max - min || 1;
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (delta > range * 0.08) trend = 'up';
    else if (delta < -range * 0.08) trend = 'down';

    // Deviation from baseline
    const baseline = findBaseline(col);
    let deviation: number;
    if (baseline) {
      const mid = (baseline.min + baseline.max) / 2;
      const tol = (baseline.max - baseline.min) / 2 || 1;
      deviation = Math.max(0, (Math.abs(avg - mid) - tol) / tol);
    } else {
      // use standard deviation as a proxy
      const std = Math.sqrt(
        values.reduce((a, b) => a + (b - avg) ** 2, 0) / values.length
      );
      deviation = range > 0 ? std / range : 0;
    }

    return {
      name: col,
      avg,
      min,
      max,
      latest,
      unit: baseline?.unit,
      trend,
      deviation,
      series,
    };
  });

  // Anomaly detection: count readings outside baseline (or >2 std from mean)
  let anomalyCount = 0;
  let criticalSensors = 0;

  for (const s of sensorSummary) {
    const baseline = findBaseline(s.name);
    let sensorAnomalies = 0;
    for (const point of s.series) {
      if (baseline) {
        if (point.value < baseline.min || point.value > baseline.max) {
          sensorAnomalies++;
        }
      } else {
        const std = Math.sqrt(
          s.series.reduce((a, b) => a + (b.value - s.avg) ** 2, 0) /
            s.series.length
        );
        if (std > 0 && Math.abs(point.value - s.avg) > 2 * std) {
          sensorAnomalies++;
        }
      }
    }
    anomalyCount += sensorAnomalies;
    const sensorAnomalyRate = sensorAnomalies / s.series.length;
    if (sensorAnomalyRate > 0.15 || s.deviation > 0.5) criticalSensors++;
  }

  const avgDeviation =
    sensorSummary.reduce((a, s) => a + s.deviation, 0) /
    (sensorSummary.length || 1);

  // Trend stability: fraction of sensors that are stable
  const trendStability =
    sensorSummary.filter((s) => s.trend === 'stable').length /
    (sensorSummary.length || 1);

  // Risk score (0-100): weighted combination
  const anomalyRate = anomalyCount / (rowCount * numericColumns.length || 1);
  const criticalRatio = criticalSensors / (numericColumns.length || 1);

  const riskScore = Math.min(
    100,
    Math.round(
      anomalyRate * 45 +
        avgDeviation * 30 +
        criticalRatio * 20 +
        (1 - trendStability) * 5
    )
  );

  let riskLevel: RiskLevel = 'Low';
  if (riskScore >= 65) riskLevel = 'High';
  else if (riskScore >= 35) riskLevel = 'Medium';

  const overallHealth = Math.max(0, 100 - riskScore);

  return {
    riskLevel,
    riskScore,
    metrics: {
      overallHealth,
      anomalyCount,
      criticalSensors,
      avgDeviation,
      trendStability,
    },
    sensorSummary,
    recordCount: rowCount,
  };
}

export function riskColor(level: RiskLevel) {
  switch (level) {
    case 'Low':
      return 'success';
    case 'Medium':
      return 'warning';
    case 'High':
      return 'destructive';
  }
}
