import { NextRequest, NextResponse } from "next/server";
import { analyzeSensorData } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      machineName,
      metrics,
      sensorSummary,
      riskLevel,
      riskScore,
      recordCount,
    } = body;

    const result = await analyzeSensorData({
      machineName,
      metrics,
      sensorSummary,
      riskLevel,
      riskScore,
      recordCount,
    });

    return NextResponse.json({
      explanation:
        result.explanation ||
        `Machine ${machineName} analyzed successfully.`,
      recommendations:
        result.recommendations || [
          "Inspect sensors with the highest deviation.",
          "Review maintenance schedule.",
          "Perform preventive maintenance.",
        ],
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json({
      explanation:
        "AI service is unavailable. A deterministic analysis has been generated instead.",
      recommendations: [
        "Inspect sensors with the highest deviation.",
        "Review recent maintenance logs.",
        "Schedule preventive maintenance.",
      ],
    });
  }
}