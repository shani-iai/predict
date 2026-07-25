# Predict AI - Industrial Predictive Maintenance Platform

## Overview

Predict AI is an intelligent predictive maintenance system that analyzes industrial machine sensor data in real-time and provides automated health assessments and maintenance recommendations.

The application helps factories prevent equipment failures, reduce unplanned downtime, and optimize maintenance scheduling through AI-powered insights.

## What It Does

1. Accepts CSV sensor data - Upload machine sensor readings (temperature, vibration, pressure, motor current)
2. Analyzes equipment health - AI processes sensor data to evaluate machine condition
3. Generates predictions - Calculates health scores, remaining useful life (RUL), and risk levels
4. Detects anomalies - Identifies abnormal sensor readings automatically
5. Displays insights - Shows comprehensive dashboard with visualizations and recommendations

## Key Features

- CSV Upload - Simple file-based data input
- Real-time Analysis - Instant health assessment
- Health Score Dashboard - Visual health metrics (0-100 percent)
- Remaining Useful Life Prediction - Estimated cycles before maintenance needed
- Risk Level Classification - Low/Medium/High risk status
- Anomaly Detection - Identifies unusual sensor readings
- Sensor Visualization - Charts showing sensor trends
- Maintenance Recommendations - AI-generated action items
- Responsive Design - Works on desktop and mobile

## Live Demo

Access the live application:
https://predict-ai-zeta.vercel.app/

How to test:
1. Download the sample CSV from the project
2. Go to the live app
3. Click "Upload CSV"
4. Select the CSV file
5. View the analysis results instantly 
OR
You can also load Sample Data

## CSV Format

The application expects CSV files with the following structure:

```
cycle,sensor1,sensor2,sensor3,sensor4,sensor5
1,518.67,641.82,1589.70,1400.60,14.62
2,518.77,641.91,1589.68,1400.72,14.65
3,518.85,641.99,1589.66,1400.85,14.68
```

Required Columns:
- cycle - Machine cycle/time sequence number
- sensor1 - Temperature or first sensor reading
- sensor2 - Vibration or second sensor reading
- sensor3 - Pressure or third sensor reading
- sensor4 - Motor current or fourth sensor reading
- sensor5 - Additional sensor reading

## Technology Stack

### Frontend
- Next.js 14 - React framework for production
- TypeScript - Type-safe JavaScript
- Tailwind CSS - Utility-first CSS framework
- Recharts - Data visualization library

### Backend
- Next.js API Routes - Serverless backend
- Node.js - Runtime environment

### Data Processing
- PapaParse - CSV parsing library
- Statistical Analysis - Anomaly detection algorithms

### Deployment
- Vercel - Hosting and deployment platform

## Project Structure

```
predict-ai/
├── app/
│   ├── page.tsx              # Landing page (upload interface)
│   ├── dashboard/
│   │   └── page.tsx          # Results dashboard
│   ├── api/
│   │   └── analyze/
│   │       └── route.ts      # CSV upload and analysis API
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── lib/
│   ├── analyzer.ts           # Sensor data analysis logic
│   └── gemini.ts             # AI integration (optional)
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
├── tailwind.config.js        # Tailwind CSS config
├── next.config.js            # Next.js config
└── sample-data.csv           # Test data file
```

## How It Works

### Step 1: Data Upload
- User uploads CSV file via web interface
- File is validated for correct format
- Data is parsed into structured format

### Step 2: Analysis
- Sensor readings are extracted
- Average values calculated for each sensor
- Anomalies detected using statistical methods
- Health evaluation performed

### Step 3: Results Display
- Dashboard shows key metrics:
  - Health Score (0-100 percent)
  - Risk Level (Low/Medium/High)
  - Remaining Useful Life (cycles)
  - Anomalies (if detected)
- Visualization chart displays sensor trends
- AI-generated analysis and recommendations shown

## Use Cases

- Manufacturing Plants - Monitor CNC machines, pumps, compressors
- Food Processing - Detect temperature anomalies
- Power Plants - Turbine and generator health monitoring
- HVAC Systems - Heating/cooling failure detection
- Mining Operations - Equipment health surveillance
- Textile Mills - Loom and motor monitoring

## Benefits

- Prevent Breakdowns - Fix issues before they become critical
- Reduce Downtime - Less unplanned production interruptions
- Cost Savings - Avoid expensive emergency repairs
- Safety - Detect dangerous equipment conditions early
- Efficiency - Plan maintenance strategically
- Scalability - Analyze unlimited machines
- 24/7 Monitoring - Automated analysis anytime

## Local Development

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Setup Instructions

1. Clone the repository
   git clone https://github.com/your-username/predict-ai.git
   cd predict-ai

2. Install dependencies
   npm install

3. Configure environment (optional)
   Create .env.local file if using Gemini API:
   GEMINI_API_KEY=your_api_key_here

4. Run development server
   npm run dev

5. Open in browser
   http://localhost:3000

6. Test with sample data
   Use included sample-data.csv
   Upload to see analysis results

### Build for Production

npm run build
npm start

## API Endpoints

### POST /api/analyze
Uploads and analyzes CSV sensor data.

Request:
Content-Type: multipart/form-data
Body: {
  "file": <CSV file>
}

Response:
{
  "success": true,
  "data": {
    "avgSensor1": 518.9,
    "avgSensor2": 642.1,
    "avgSensor3": 1589.5,
    "avgSensor4": 1401.0,
    "avgSensor5": 14.8,
    "cycles": 20,
    "anomalies": [],
    "analysis": "Equipment operating normally...",
    "healthScore": 85,
    "rul": 3000,
    "riskLevel": "Low"
  }
}

## Learning Outcomes

This project demonstrates:
- Full-stack web application development
- CSV file parsing and data processing
- Statistical analysis and anomaly detection
- Real-time data visualization
- Responsive UI/UX design
- API development with Next.js
- Deployment and DevOps practices
- Production-grade code structure

## Security

- Server-side file processing (secure)
- No data stored permanently
- HTTPS on production (Vercel)
- Input validation on all endpoints
- Environment variables for sensitive data

## License

This project is open source and available for educational and commercial use.

## Creator

Shahan - AI and Automation Enthusiast
Education: ACT AI (Pakistan's National AI Initiative)

## Acknowledgments

- Next.js - React framework
- Vercel - Hosting platform
- Tailwind CSS - Styling framework
- Recharts - Data visualization
- PapaParse - CSV parsing

## Support

For issues, questions, or suggestions:
1. Check the documentation
2. Review sample-data.csv for correct format
3. Open an issue on GitHub
4. Contact the developer

## Future Enhancements

- Real-time sensor integration (IoT)
- Multi-machine dashboard
- Historical trend analysis
- Predictive alerts via email/SMS
- Custom anomaly thresholds
- Export reports as PDF
- User authentication
- Database integration
- Advanced AI models
- Mobile app

## Project Timeline

- Conception - July 2026
- Development - July 2026
- Deployment - July 2026
- Status - Active and Production Ready

---

Built for ACT AI Final Course Project
Version: 1.0.0
Last Updated: July 2026