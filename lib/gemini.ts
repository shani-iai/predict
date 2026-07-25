import { GoogleGenerativeAI } from '@google/generative-ai';

export async function analyzeSensorData(sensorData: any) {
  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.error('No API key found');
      throw new Error('Missing API key');
    }

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const message = `Equipment sensor analysis. Average readings: ${sensorData.avgSensor1}, ${sensorData.avgSensor2}, ${sensorData.avgSensor3}. 
    Respond ONLY with valid JSON: {"assessment":"brief analysis","estimatedRUL":2000,"riskLevel":"Low"}`;

    const result = await model.generateContent(message);
    const responseText = result.response.text();
    
    // Extract JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      analysis: parsed.assessment || 'Analysis complete',
      healthScore: parsed.riskLevel === 'Low' ? 85 : parsed.riskLevel === 'Medium' ? 60 : 30,
      rul: parsed.estimatedRUL || 1000,
      riskLevel: parsed.riskLevel || 'Low',
    };
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
