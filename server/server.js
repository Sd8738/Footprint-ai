const express = require('express');
const cors = require('cors');
const nmap = require('node-nmap');
const shodan = require('shodan-client');
const { spawn } = require('child_process');
const { Document, Packer, Paragraph, Table, TableRow, TableCell } = require('docx');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// AI Prediction via Python script
function predictRisk(scanData) {
  return new Promise((resolve) => {
    const python = spawn('python', [path.join(__dirname, 'ai_predictor.py'), JSON.stringify(scanData)]);
    let result = '';
    python.stdout.on('data', (data) => { result += data.toString(); });
    python.on('close', () => {
      try {
        resolve(JSON.parse(result));
      } catch {
        resolve({ risk: 'Unknown', insights: 'AI analysis failed' });
      }
    });
  });
}

// Generate .docx Report
async function generateDocx(nmapData, shodanData, aiInsights) {
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: 'FootRecon AI Footprinting Report', heading: 'Heading1' }),
        new Paragraph(`Target: ${nmapData.target || 'N/A'}`),
        new Paragraph('Nmap Results:'),
        new Table({
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph('Port')] }),
                new TableCell({ children: [new Paragraph('Service')] }),
                new TableCell({ children: [new Paragraph('Version')] })
              ]
            }),
            ...nmapData.map(row => new TableRow({
              children: [
                new TableCell({ children: [new Paragraph(row.port)] }),
                new TableCell({ children: [new Paragraph(row.service)] }),
                new TableCell({ children: [new Paragraph(row.version)] })
              ]
            }))
          ]
        }),
        new Paragraph('Shodan Data: ' + JSON.stringify(shodanData, null, 2)),
        new Paragraph(`AI Insights: Risk Level - ${aiInsights.risk}. ${aiInsights.insights}`)
      ]
    }]
  });
  const buffer = await Packer.toBuffer(doc);
  const filePath = path.join(__dirname, 'report.docx');
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

// Footprinting Endpoint
app.post('/scan', async (req, res) => {
  const { target, permission } = req.body;
  if (!permission) return res.status(403).send('Legal permission required');

  try {
    // Passive: Shodan
    const shodanData = await shodan.host(target, process.env.SHODAN_API_KEY);

    // Active: Nmap
    const nmapScan = new nmap.NmapScan(target, '-sV -O');
    nmapScan.on('complete', async (nmapData) => {
      const aiInsights = await predictRisk(nmapData);
      const reportPath = await generateDocx(nmapData, shodanData, aiInsights);
      res.download(reportPath);
    });
    nmapScan.on('error', (error) => res.status(500).send('Nmap error: ' + error));
    nmapScan.startScan();
  } catch (error) {
    res.status(500).send('Error: ' + error.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));