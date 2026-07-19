import type { PredictionResult } from './predict';

export interface AnalysisRecord {
  id?: string;
  machine_name: string;
  risk_level: string;
  risk_score: number;
  metrics: Record<string, number>;
  sensor_summary: any[];
  ai_explanation: string;
  recommendations: string[];
  record_count: number;
  created_at?: string;
}

export function generateReportText(
  prediction: PredictionResult,
  machineName: string,
  aiExplanation: string,
  recommendations: string[]
): string {
  const date = new Date().toLocaleString();
  const lines: string[] = [];

  lines.push('================================================');
  lines.push('  PredictAI — Predictive Maintenance Report');
  lines.push('================================================');
  lines.push('');
  lines.push(`Machine:            ${machineName}`);
  lines.push(`Report generated:   ${date}`);
  lines.push(`Sensor readings:    ${prediction.recordCount}`);
  lines.push(`Sensors analyzed:   ${prediction.sensorSummary.length}`);
  lines.push('');
  lines.push('--- Risk Assessment ---');
  lines.push(`Risk level:         ${prediction.riskLevel}`);
  lines.push(`Risk score:         ${prediction.riskScore} / 100`);
  lines.push(`Overall health:     ${prediction.metrics.overallHealth} / 100`);
  lines.push('');
  lines.push('--- Health Metrics ---');
  lines.push(`Anomalies detected:      ${prediction.metrics.anomalyCount}`);
  lines.push(`Critical sensors:         ${prediction.metrics.criticalSensors}`);
  lines.push(
    `Average deviation:        ${(prediction.metrics.avgDeviation * 100).toFixed(1)}%`
  );
  lines.push(
    `Trend stability:          ${(prediction.metrics.trendStability * 100).toFixed(1)}%`
  );
  lines.push('');
  lines.push('--- Sensor Summary ---');
  for (const s of prediction.sensorSummary) {
    lines.push(
      `${s.name}: avg ${s.avg.toFixed(2)}${s.unit ? ' ' + s.unit : ''}, min ${s.min.toFixed(2)}, max ${s.max.toFixed(2)}, latest ${s.latest.toFixed(2)}, trend ${s.trend}, deviation ${(s.deviation * 100).toFixed(1)}%`
    );
  }
  lines.push('');
  lines.push('--- AI Explanation ---');
  lines.push(aiExplanation || 'No AI explanation available.');
  lines.push('');
  lines.push('--- Maintenance Recommendations ---');
  recommendations.forEach((r, i) => {
    lines.push(`${i + 1}. ${r}`);
  });
  lines.push('');
  lines.push('================================================');
  lines.push('  End of report — PredictAI');
  lines.push('================================================');

  return lines.join('\n');
}

export function downloadFile(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
