'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  ChartLine,
  Download,
  FileUp,
  Gauge,
  History,
  Loader2,
  Moon,
  Sun,
  TrendingDown,
  TrendingUp,
  Minus,
  ShieldCheck,
  Trash2,
  Cpu,
  Wrench,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { parseCsv, type ParsedCsv } from '@/lib/csv';
import {
  analyzeSensorData,
  riskColor,
  type PredictionResult,
  type SensorStat,
} from '@/lib/predict';
import { generateReportText, downloadFile } from '@/lib/report';
import { fetchHistory, insertAnalysis, deleteAnalysis, type AnalysisRow } from '@/lib/db';
import { SAMPLE_CSV } from '@/lib/sample-data';
import { toast } from 'sonner';

type HistoryItem = AnalysisRow;

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [machineName, setMachineName] = useState('Turbine-01');
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<string>('');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setMounted(true), []);

  const loadHistory = useCallback(async () => {
    try {
      const data = await fetchHistory();
      setHistory(data);
    } catch {
      // ignore — history is non-critical
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setAiExplanation('');
      setRecommendations([]);
      try {
        const text = await file.text();
        const result = parseCsv(text);
        setParsed(result);
        setFileName(file.name);
        const pred = analyzeSensorData(result, machineName);
        setPrediction(pred);
        setSelectedSensor(result.numericColumns[0] ?? '');
        toast.success('Sensor data analyzed', {
          description: `${result.rowCount} readings across ${result.numericColumns.length} sensors.`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to parse CSV.';
        setError(msg);
        setParsed(null);
        setPrediction(null);
        toast.error('Analysis failed', { description: msg });
      }
    },
    [machineName]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const loadSample = () => {
    setError(null);
    setAiExplanation('');
    setRecommendations([]);
    const result = parseCsv(SAMPLE_CSV);
    setParsed(result);
    setFileName('sample-sensor-data.csv');
    const pred = analyzeSensorData(result, machineName);
    setPrediction(pred);
    setSelectedSensor(result.numericColumns[0] ?? '');
    toast.success('Sample data loaded', {
      description: '20 readings across 6 sensors.',
    });
  };

  const runAiAnalysis = async () => {
    if (!prediction) return;
    setAiLoading(true);
    setAiExplanation('');
    setRecommendations([]);
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      // If Supabase URL / ANON key are not configured (local/dev), show a deterministic fallback
      if (!supabaseUrl || !supabaseKey) {
        const fallback = `AI analysis is unavailable because the Supabase URL or ANON key is not configured. Showing a deterministic fallback explanation for ${machineName}.`;
        setAiExplanation(
          `Fallback: ${fallback}\nMachine ${machineName} evaluated as ${prediction.riskLevel} (score ${prediction.riskScore}/100). Review sensors with the highest deviation and recent anomalous readings.`
        );
        setRecommendations([
          'Inspect sensors with the highest deviation from baseline values.',
          'Schedule a routine inspection for any machine flagged Medium or High risk.',
          'Review recent maintenance logs for recurring issues.',
        ]);
        toast('AI analysis unavailable; showing fallback explanation.');
        return;
      }

      const apiUrl = `${supabaseUrl}/functions/v1/predict-ai`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          machineName,
          metrics: prediction.metrics,
          sensorSummary: prediction.sensorSummary.map((s) => ({
            name: s.name,
            avg: s.avg,
            min: s.min,
            max: s.max,
            latest: s.latest,
            unit: s.unit,
            trend: s.trend,
            deviation: s.deviation,
          })),
          riskLevel: prediction.riskLevel,
          riskScore: prediction.riskScore,
          recordCount: prediction.recordCount,
        }),
      });
      if (!res.ok) throw new Error(`AI service error (${res.status})`);
      const data = await res.json();
      if (data.error && !data.explanation) throw new Error(data.error);
      setAiExplanation(data.explanation || 'No explanation returned.');
      setRecommendations(
        Array.isArray(data.recommendations) ? data.recommendations : []
      );
      toast.success('AI analysis complete', {
        description: 'Explanation and recommendations generated.',
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'AI analysis failed.';
      toast.error('AI analysis failed', { description: msg });
      setAiExplanation('');
    } finally {
      setAiLoading(false);
    }
  };

  const saveAnalysis = async () => {
    if (!prediction) return;
    try {
      const ok = await insertAnalysis({
        machine_name: machineName,
        risk_level: prediction.riskLevel,
        risk_score: prediction.riskScore,
        metrics: prediction.metrics as unknown as Record<string, number>,
        sensor_summary: prediction.sensorSummary,
        ai_explanation: aiExplanation,
        recommendations: recommendations,
        record_count: prediction.recordCount,
      });
      if (!ok) throw new Error('Insert failed');
      toast.success('Analysis saved to history');
      loadHistory();
    } catch (e) {
      toast.error('Failed to save analysis', {
        description: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  };

  const downloadReport = () => {
    if (!prediction) return;
    const text = generateReportText(
      prediction,
      machineName,
      aiExplanation,
      recommendations
    );
    downloadFile(
      `PredictAI-${machineName}-${new Date().toISOString().slice(0, 10)}.txt`,
      text
    );
    toast.success('Report downloaded');
  };

  const clearHistoryItem = async (id: string) => {
    const ok = await deleteAnalysis(id);
    if (ok) loadHistory();
  };

  const riskBadgeClass = (level: string) => {
    if (level === 'Low')
      return 'bg-success/15 text-success border-success/30';
    if (level === 'Medium')
      return 'bg-warning/15 text-warning border-warning/30';
    return 'bg-destructive/15 text-destructive border-destructive/30';
  };

  const chartData =
    parsed && selectedSensor
      ? parsed.rows.map((r, i) => ({
          idx: i,
          [selectedSensor]: Number(r[selectedSensor]),
        }))
      : [];

  return (
    <div className="min-h-screen bg-background bg-grid">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30">
              <Cpu className="h-5 w-5 text-primary-foreground" />
              <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-success" />
              </span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">
                Predict<span className="text-primary">AI</span>
              </h1>
              <p className="hidden text-xs text-muted-foreground sm:block">
                Industrial Predictive Maintenance
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              {mounted && theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadReport}
              disabled={!prediction}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Report</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="mb-8 animate-fade-in">
          <div className="flex flex-col gap-2">
            <Badge
              variant="outline"
              className="w-fit gap-1.5 border-primary/30 bg-primary/5 text-primary"
            >
              <Sparkles className="h-3 w-3" />
              Gemini AI-Powered Failure Prediction
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Predict machine failures before they happen.
            </h2>
            <p className="max-w-2xl text-muted-foreground">
              Upload sensor CSV data to assess machine health, visualize trends,
              and receive AI-driven maintenance recommendations.
            </p>
          </div>
        </section>

        {/* Upload + config */}
        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileUp className="h-4 w-4 text-primary" />
                Upload Sensor Data
              </CardTitle>
              <CardDescription>
                CSV with a header row and numeric sensor columns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <FileUp className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium">
                  Drag & drop a CSV file here
                </p>
                <p className="text-xs text-muted-foreground">
                  or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={onFileChange}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Choose File
                </Button>
              </div>
              {fileName && (
                <p className="text-xs text-muted-foreground">
                  Loaded: <span className="font-medium text-foreground">{fileName}</span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuration</CardTitle>
              <CardDescription>Identify the machine being analyzed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="machine">Machine Name</Label>
                <Input
                  id="machine"
                  value={machineName}
                  onChange={(e) => setMachineName(e.target.value)}
                  placeholder="e.g. Turbine-01"
                />
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="w-full gap-2"
                onClick={loadSample}
              >
                <Activity className="h-4 w-4" />
                Load Sample Data
              </Button>
            </CardContent>
          </Card>
        </section>

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {prediction && (
          <div className="animate-fade-in space-y-6">
            {/* Metrics row */}
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={<Gauge className="h-5 w-5" />}
                label="Risk Level"
                value={prediction.riskLevel}
                sub={`Score ${prediction.riskScore}/100`}
                tone={prediction.riskLevel}
              />
              <MetricCard
                icon={<ShieldCheck className="h-5 w-5" />}
                label="Overall Health"
                value={`${prediction.metrics.overallHealth}%`}
                sub="Composite index"
                tone={
                  prediction.metrics.overallHealth >= 65
                    ? 'Low'
                    : prediction.metrics.overallHealth >= 35
                      ? 'Medium'
                      : 'High'
                }
              />
              <MetricCard
                icon={<AlertTriangle className="h-5 w-5" />}
                label="Anomalies"
                value={String(prediction.metrics.anomalyCount)}
                sub="Out-of-range readings"
                tone={prediction.metrics.anomalyCount > 0 ? 'High' : 'Low'}
              />
              <MetricCard
                icon={<Activity className="h-5 w-5" />}
                label="Critical Sensors"
                value={`${prediction.metrics.criticalSensors}/${prediction.sensorSummary.length}`}
                sub="Need attention"
                tone={prediction.metrics.criticalSensors > 0 ? 'High' : 'Low'}
              />
            </section>

            {/* Risk gauge + AI panel */}
            <section className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gauge className="h-4 w-4 text-primary" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                  <RiskGauge score={prediction.riskScore} level={prediction.riskLevel} />
                  <div className="w-full space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Health</span>
                      <span>{prediction.metrics.overallHealth}%</span>
                    </div>
                    <Progress value={prediction.metrics.overallHealth} className="h-2" />
                  </div>
                  <Button
                    size="sm"
                    className="w-full gap-2"
                    onClick={runAiAnalysis}
                    disabled={aiLoading}
                  >
                    {aiLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BrainCircuit className="h-4 w-4" />
                    )}
                    {aiLoading ? 'Analyzing with AI...' : 'Run AI Analysis'}
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                    AI Explanation & Recommendations
                  </CardTitle>
                  <CardDescription>
                    Powered by Gemini AI for actionable maintenance insight.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {aiLoading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <p className="text-sm">Generating AI analysis...</p>
                    </div>
                  ) : aiExplanation ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <p className="text-sm leading-relaxed">{aiExplanation}</p>
                      </div>
                      <div>
                        <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                          <Wrench className="h-4 w-4 text-primary" />
                          Maintenance Recommendations
                        </h4>
                        <ol className="space-y-2">
                          {recommendations.map((r, i) => (
                            <li
                              key={i}
                              className="flex gap-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                                {i + 1}
                              </span>
                              {r}
                            </li>
                          ))}
                        </ol>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={saveAnalysis} className="gap-2">
                          <History className="h-4 w-4" />
                          Save to History
                        </Button>
                        <Button size="sm" variant="outline" onClick={downloadReport} className="gap-2">
                          <Download className="h-4 w-4" />
                          Download Report
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                      <BrainCircuit className="h-10 w-10 text-muted-foreground/50" />
                      <p className="max-w-sm text-sm text-muted-foreground">
                        Click <span className="font-medium text-foreground">Run AI Analysis</span> to generate a
                        detailed explanation and maintenance recommendations.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Charts */}
            <section className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <ChartLine className="h-4 w-4 text-primary" />
                        Sensor Trends
                      </CardTitle>
                      <CardDescription>Time-series of selected sensor.</CardDescription>
                    </div>
                    <Select
                      value={selectedSensor}
                      onValueChange={setSelectedSensor}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select sensor" />
                      </SelectTrigger>
                      <SelectContent>
                        {parsed?.numericColumns.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="sensorGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                        <XAxis dataKey="idx" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                            fontSize: '12px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey={selectedSensor}
                          stroke="hsl(var(--chart-1))"
                          strokeWidth={2}
                          fill="url(#sensorGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4 text-primary" />
                    Sensor Deviation
                  </CardTitle>
                  <CardDescription>Normalized deviation from baseline.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart
                        data={prediction.sensorSummary.map((s) => ({
                          sensor: s.name.slice(0, 8),
                          deviation: Math.min(100, s.deviation * 100),
                        }))}
                      >
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="sensor" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                        <PolarRadiusAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} angle={30} />
                        <Radar
                          name="Deviation"
                          dataKey="deviation"
                          stroke="hsl(var(--chart-2))"
                          fill="hsl(var(--chart-2))"
                          fillOpacity={0.4}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                            color: 'hsl(var(--foreground))',
                            fontSize: '12px',
                          }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Sensor table */}
            <section>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Gauge className="h-4 w-4 text-primary" />
                    Sensor Health Breakdown
                  </CardTitle>
                  <CardDescription>Per-sensor statistics and trends.</CardDescription>
                </CardHeader>
                <CardContent>
                  <SensorTable sensors={prediction.sensorSummary} />
                </CardContent>
              </Card>
            </section>
          </div>
        )}

        {/* History */}
        <section className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4 text-primary" />
                Analysis History
              </CardTitle>
              <CardDescription>Recently saved analyses (persisted in Supabase).</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No saved analyses yet. Run an analysis and save it to history.
                </p>
              ) : (
                <ScrollArea className="h-64">
                  <div className="space-y-2 pr-2">
                    {history.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                            <Cpu className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{h.machine_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(h.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className={cn('gap-1', riskBadgeClass(h.risk_level))}>
                            {h.risk_level}
                          </Badge>
                          <span className="text-sm font-semibold tabular-nums">
                            {Number(h.risk_score).toFixed(0)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => clearHistoryItem(h.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
          PredictAI · Industrial Predictive Maintenance · Powered by Gemini AI & Supabase
        </div>
      </footer>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: 'Low' | 'Medium' | 'High';
}) {
  const toneClass =
    tone === 'Low'
      ? 'text-success bg-success/10'
      : tone === 'Medium'
        ? 'text-warning bg-warning/10'
        : 'text-destructive bg-destructive/10';
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
          </div>
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', toneClass)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RiskGauge({ score, level }: { score: number; level: string }) {
  const color =
    level === 'Low'
      ? 'hsl(var(--success))'
      : level === 'Medium'
        ? 'hsl(var(--warning))'
        : 'hsl(var(--destructive))';
  const radius = 70;
  const circumference = Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="relative flex h-40 w-40 items-center justify-center">
      <svg className="h-40 w-40 -rotate-90" viewBox="0 0 160 80">
        <path
          d="M 10 75 A 70 70 0 0 1 150 75"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 10 75 A 70 70 0 0 1 150 75"
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums" style={{ color }}>
          {score}
        </span>
        <span className="text-xs font-medium text-muted-foreground">{level} Risk</span>
      </div>
    </div>
  );
}

function SensorTable({ sensors }: { sensors: SensorStat[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Sensor</th>
            <th className="pb-2 pr-4 font-medium">Avg</th>
            <th className="pb-2 pr-4 font-medium">Min</th>
            <th className="pb-2 pr-4 font-medium">Max</th>
            <th className="pb-2 pr-4 font-medium">Latest</th>
            <th className="pb-2 pr-4 font-medium">Trend</th>
            <th className="pb-2 pr-4 font-medium">Deviation</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {sensors.map((s) => (
            <tr key={s.name} className="border-b border-border/40 transition-colors hover:bg-muted/20">
              <td className="py-2.5 pr-4 font-medium">{s.name}</td>
              <td className="py-2.5 pr-4 tabular-nums">
                {s.avg.toFixed(2)}{s.unit ? ` ${s.unit}` : ''}
              </td>
              <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">{s.min.toFixed(2)}</td>
              <td className="py-2.5 pr-4 tabular-nums text-muted-foreground">{s.max.toFixed(2)}</td>
              <td className="py-2.5 pr-4 tabular-nums">{s.latest.toFixed(2)}</td>
              <td className="py-2.5 pr-4">
                <span className="inline-flex items-center gap-1">
                  {s.trend === 'up' && <TrendingUp className="h-3.5 w-3.5 text-warning" />}
                  {s.trend === 'down' && <TrendingDown className="h-3.5 w-3.5 text-accent" />}
                  {s.trend === 'stable' && <Minus className="h-3.5 w-3.5 text-muted-foreground" />}
                  <span className="text-xs capitalize">{s.trend}</span>
                </span>
              </td>
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <Progress
                    value={Math.min(100, s.deviation * 100)}
                    className="h-1.5 w-16"
                  />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {(s.deviation * 100).toFixed(0)}%
                  </span>
                </div>
              </td>
              <td className="py-2.5">
                <Badge
                  variant="outline"
                  className={cn(
                    'gap-1',
                    s.deviation > 0.5
                      ? 'bg-destructive/10 text-destructive border-destructive/30'
                      : s.deviation > 0.2
                        ? 'bg-warning/10 text-warning border-warning/30'
                        : 'bg-success/10 text-success border-success/30'
                  )}
                >
                  {s.deviation > 0.5 ? 'Critical' : s.deviation > 0.2 ? 'Watch' : 'OK'}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
