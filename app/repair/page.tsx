'use client';

import { useState, useEffect } from 'react';

export default function RepairPage() {
  const [status, setStatus] = useState('idle');
  const [results, setResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  async function startRepairProcess(resetCounts = false) {
    setStatus('running');
    setResults([]);
    setCurrentPage(1);
    setProgress(0);
    setError(null);
    
    try {
      await processNextBatch(1, resetCounts);
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  }
  
  async function processNextBatch(page, reset = false) {
    try {
      setCurrentPage(page);
      
      const response = await fetch(`/api/repair-all-comments?page=${page}&reset=${reset}`);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setResults(prev => [...prev, data.batchResults]);
      
      if (data.progress) {
        setProgress(data.progress.percentComplete);
      }
      
      // Continue to next batch if needed
      if (data.nextBatch && !data.complete) {
        // Add a small delay to avoid hammering the server
        await new Promise(resolve => setTimeout(resolve, 500));
        await processNextBatch(page + 1, false);
      } else {
        setStatus('complete');
      }
    } catch (err) {
      console.error('Error processing batch:', err);
      setError(err.message);
      setStatus('error');
    }
  }
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Comment Repair Tool</h1>
      
      <div className="mb-6">
        <button
          onClick={() => startRepairProcess(true)}
          disabled={status === 'running'}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-4 disabled:opacity-50"
        >
          Start Full Repair (Reset Counts)
        </button>
        
        <button
          onClick={() => startRepairProcess(false)}
          disabled={status === 'running'}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
        >
          Continue Repair (Keep Counts)
        </button>
      </div>
      
      {status === 'running' && (
        <div className="mb-6">
          <h2 className="text-xl mb-2">Repair in Progress</h2>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-blue-600 h-4 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="mt-2">Processing batch {currentPage} - {progress}% complete</p>
        </div>
      )}
      
      {status === 'complete' && (
        <div className="p-4 bg-green-100 text-green-800 rounded mb-6">
          Repair process completed successfully!
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-100 text-red-800 rounded mb-6">
          Error: {error}
        </div>
      )}
      
      {results.length > 0 && (
        <div>
          <h2 className="text-xl mb-4">Batch Results</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr>
                  <th className="py-2 px-4 border-b">Batch</th>
                  <th className="py-2 px-4 border-b">Processed</th>
                  <th className="py-2 px-4 border-b">With Parents</th>
                  <th className="py-2 px-4 border-b">Without Parents</th>
                  <th className="py-2 px-4 border-b">Parents Updated</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : ''}>
                    <td className="py-2 px-4 border-b">{result.batchNumber}</td>
                    <td className="py-2 px-4 border-b">{result.repliesProcessed}</td>
                    <td className="py-2 px-4 border-b">{result.repliesWithParents}</td>
                    <td className="py-2 px-4 border-b">{result.repliesWithoutParents}</td>
                    <td className="py-2 px-4 border-b">{result.parentsUpdated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 