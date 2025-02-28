'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DatabaseInspector() {
  const [table, setTable] = useState('comments');
  const [limit, setLimit] = useState(10);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tables = ['channels', 'videos', 'comments'];
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(limit);
      
      if (error) throw error;
      
      setResults(data || []);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
      console.error('Database query error:', err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Table</label>
          <select 
            value={table}
            onChange={(e) => setTable(e.target.value)}
            className="p-2 border rounded"
          >
            {tables.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Limit</label>
          <input 
            type="number" 
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="p-2 border rounded w-20"
            min={1}
            max={100}
          />
        </div>
        
        <button
          onClick={fetchData}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Query Database'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
          {error}
        </div>
      )}
      
      {results.length > 0 && (
        <div className="overflow-x-auto">
          <pre className="bg-gray-50 p-4 rounded border text-sm overflow-auto max-h-96">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
} 