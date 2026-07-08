import React, { useState, useEffect } from "react";
import axios from "axios";

export function LogViewer() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await axios.get("/api/logs");
        setLogs(res.data);
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      }
    };
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="border rounded p-4 h-64 overflow-y-auto bg-gray-50 text-sm font-mono" id="log-viewer">
      <h2 className="font-bold mb-2">Server Activity Logs</h2>
      {logs.length === 0 ? (
        <p>No logs found.</p>
      ) : (
        logs.map((log) => (
          <div key={log.id} className="mb-1 border-b pb-1">
            <span className="text-gray-500">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
            <span className={`ml-2 font-bold ${log.level === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>
              [{log.level.toUpperCase()}]
            </span>
            <span className="ml-2">{log.message}</span>
          </div>
        ))
      )}
    </div>
  );
}
