import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SensorStat {
  name: string;
  avg: number;
  min: number;
  max: number;
  latest: number;
  unit?: string;
  trend: "up" | "down" | "stable";
  deviation: number;
}

interface AnalysisRequest {
  machineName: string;
  metrics: Record<string, number>;
  sensorSummary: SensorStat[];
  riskLevel: string;
  riskScore: number;
  recordCount: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body: AnalysisRequest = await req.json();
    const {
      machineName,
      metrics,
      sensorSummary,
      riskLevel,
      riskScore,
      recordCount,
    } = body;

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Gemini API key not configured.",
          explanation:
            "AI analysis is unavailable because the Gemini API key is not set. A deterministic fallback explanation is shown instead.",
          recommendations: [
            "Inspect sensors with the highest deviation from baseline values.",
            "Schedule a routine inspection for any machine flagged Medium or High risk.",
            "Review recent maintenance logs for recurring issues.",
          ],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sensorLines = sensorSummary
      .map(
        (s) =>
          `- ${s.name}: avg ${s.avg.toFixed(2)}${s.unit ? " " + s.unit : ""}, min ${s.min.toFixed(2)}, max ${s.max.toFixed(2)}, latest ${s.latest.toFixed(2)}, trend ${s.trend}, deviation ${s.deviation.toFixed(2)}`
      )
      .join("\n");

    const metricsLines = Object.entries(metrics)
      .map(([k, v]) => `- ${k}: ${typeof v === "number" ? v.toFixed(2) : v}`)
      .join("\n");

    const prompt = `You are a senior industrial predictive maintenance engineer. Analyze the following sensor data for a machine named "${machineName}".

Overall risk assessment: ${riskLevel} (risk score ${riskScore}/100) based on ${recordCount} sensor readings.

Aggregated health metrics:
${metricsLines}

Per-sensor statistics:
${sensorLines}

Provide a concise professional response in STRICT JSON format with exactly these fields:
{
  "explanation": "3-5 sentence explanation of why the machine is at this risk level, referencing specific sensor patterns, trends, or deviations.",
  "recommendations": ["3-5 actionable maintenance recommendations as short strings, ordered by priority"]
}

Return ONLY the JSON object, no markdown, no code fences.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 800,
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return new Response(
        JSON.stringify({
          error: `Gemini API error (${geminiRes.status})`,
          explanation: `The AI service returned an error while analyzing ${machineName}. The deterministic risk level is ${riskLevel} (score ${riskScore}/100). Inspect sensors showing high deviation or unfavorable trends.`,
          recommendations: [
            "Inspect sensors with the highest deviation from baseline values.",
            "Schedule a routine inspection for any machine flagged Medium or High risk.",
            "Review recent maintenance logs for recurring issues.",
          ],
          rawError: errText,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiRes.json();
    const text: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed: { explanation?: string; recommendations?: string[] } = {};
    const cleaned = text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = { explanation: cleaned, recommendations: [] };
    }

    const fallbackRecs = [
      "Inspect sensors with the highest deviation from baseline values.",
      "Schedule a routine inspection for any machine flagged Medium or High risk.",
      "Review recent maintenance logs for recurring issues.",
    ];

    return new Response(
      JSON.stringify({
        explanation:
          parsed.explanation ||
          `Machine ${machineName} analyzed with risk level ${riskLevel} (score ${riskScore}/100).`,
        recommendations:
          Array.isArray(parsed.recommendations) &&
          parsed.recommendations.length > 0
            ? parsed.recommendations
            : fallbackRecs,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
        explanation:
          "An unexpected error occurred during AI analysis. Review the sensor metrics manually.",
        recommendations: [
          "Inspect sensors with the highest deviation from baseline values.",
          "Schedule a routine inspection for any machine flagged Medium or High risk.",
        ],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
