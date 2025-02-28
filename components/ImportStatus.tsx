"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ImportStatus() {
  const [stats, setStats] = useState({
    channelCount: 0,
    commentCount: 0,
    lastImport: null as Date | null
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Count channels
        const { count: channelCount, error: channelError } = await supabase
          .from('channels')
          .select('*', { count: 'exact', head: true });
        
        if (channelError) throw channelError;
        
        // Count comments
        const { count: commentCount, error: commentError } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true });
        
        if (commentError) throw commentError;
        
        // Get latest comment timestamp
        const { data: latestComment, error: latestError } = await supabase
          .from('comments')
          .select('created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        const lastImport = latestComment ? new Date(latestComment.created_at) : null;
        
        setStats({
          channelCount: channelCount || 0,
          commentCount: commentCount || 0,
          lastImport
        });
      } catch (error) {
        console.error('Error fetching import stats:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading stats...</div>;
  }

  return (
    <div className="bg-gray-50 p-3 rounded-md">
      <h3 className="text-sm font-medium text-gray-700 mb-2">Database Status</h3>
      <ul className="text-xs text-gray-600 space-y-1">
        <li>Channels: <span className="font-medium">{stats.channelCount}</span></li>
        <li>Comments: <span className="font-medium">{stats.commentCount}</span></li>
        {stats.lastImport && (
          <li>Last import: <span className="font-medium">
            {stats.lastImport.toLocaleDateString()} {stats.lastImport.toLocaleTimeString()}
          </span></li>
        )}
      </ul>
    </div>
  );
} 