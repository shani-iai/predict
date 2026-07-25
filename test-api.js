const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key exists:', !!apiKey);
console.log('Key starts with:', apiKey?.substring(0, 10));

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

model.generateContent('Say hello')
  .then(res => console.log('Success:', res.response.text()))
  .catch(err => console.error('Error:', err.message));
