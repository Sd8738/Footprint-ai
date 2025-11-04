import React, { useState } from 'react';

function ScanForm() {
  const [target, setTarget] = useState('');
  const [permission, setPermission] = useState(false);
  const [reportUrl, setReportUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    if (!permission) {
      alert('You must confirm legal permission to proceed.');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/scan', {
        method: 'POST',
        body: JSON.stringify({ target, permission }),
        headers: { 'Content-Type': 'application/json' }
      });
      if (response.ok) {
        const blob = await response.blob();
        setReportUrl(URL.createObjectURL(blob));
      } else {
        alert('Scan failed. Check permissions or target.');
      }
    } catch (error) {
      alert('Error: ' + error.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <input
        type="text"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        placeholder="Enter target domain/IP (e.g., example.com)"
      />
      <label>
        <input
          type="checkbox"
          checked={permission}
          onChange={(e) => setPermission(e.target.checked)}
        />
        I confirm I have legal permission to perform this footprinting.
      </label>
      <button onClick={handleScan} disabled={loading}>
        {loading ? 'Scanning...' : 'Scan & Generate Report'}
      </button>
      {reportUrl && (
        <a href={reportUrl} download="footrecon-report.docx">
          Download .docx Report
        </a>
      )}
    </div>
  );
}

export default ScanForm;