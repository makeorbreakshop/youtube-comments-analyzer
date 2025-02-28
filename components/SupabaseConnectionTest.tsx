"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SupabaseConnectionTest() {
  const [connectionStatus, setConnectionStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase.from('channels').select('id').limit(1);

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        setConnectionStatus('success');
      } catch (error) {
        console.error('Error connecting to Supabase:', error);
        setConnectionStatus('error');
        setErrorMessage(error instanceof Error ? error.message : JSON.stringify(error, null, 2));
      }
    }

    testConnection();
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Supabase Connection Test</h2>
      
      <div className="mb-4">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            connectionStatus === 'loading' ? 'bg-yellow-500' :
            connectionStatus === 'success' ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span>
            {connectionStatus === 'loading' ? 'Testing connection...' :
             connectionStatus === 'success' ? 'Connected to Supabase!' : 'Connection error'}
          </span>
        </div>
        
        {connectionStatus === 'error' && errorMessage && (
          <div className="mt-2 text-red-600 text-sm overflow-auto max-h-40 p-2 bg-red-50 rounded">
            <p className="font-medium">Error Details:</p>
            <pre className="whitespace-pre-wrap">{errorMessage}</pre>
          </div>
        )}
      </div>
    </div>
  );
} 