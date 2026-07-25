import { GoogleGenerativeAI } from "@google/generative-ai";

export async function analyzeSensorData(data: any) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return {
      explanation: "Gemini API key is not configured.",
      recommendations: [
        "Inspect sensors with the highest deviation.",
        "Review maintenance schedule.",
        "Perform preventive maintenance."
      ],
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const prompt = `
You are an industrial predictive maintenance engineer.

Machine Name: ${data.machineName}

Risk Level: ${data.riskLevel}

Risk Score: ${data.riskScore}

Metrics:
${JSON.stringify(data.metrics, null, 2)}

Sensor Summary:
${JSON.stringify(data.sensorSummary, null, 2)}

Return ONLY valid JSON in this format:

{
  "explanation":"3-5 sentence explanation",
  "recommendations":[
    "Recommendation 1",
    "Recommendation 2",
    "Recommendation 3"
  ]
}
`;

    const result = await model.generateContent(prompt);

    const text = result.response.text();

    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return parsed;
  } catch (error) {
    console.error(error);

    return {
      explanation:
        "Machine shows abnormal sensor behaviour. Preventive maintenance is recommended.",
      recommendations: [
        "Inspect sensors with the highest deviation.",
        "Check bearings and lubrication.",
        "Review maintenance history.",
      ],
    };
  }
}