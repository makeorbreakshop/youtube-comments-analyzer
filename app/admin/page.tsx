"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ChannelImporter from '@/components/ChannelImporter';
import ChannelsList from '@/components/ChannelsList';
import SupabaseConnectionTest from '@/components/SupabaseConnectionTest';
import { supabase } from '@/lib/supabase';
import ImportStatus from '@/components/ImportStatus';
import VideoImporter from '@/components/VideoImporter';
import DatabaseInspector from '@/components/DatabaseInspector';

export default function AdminPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Define fetchChannels outside of useEffect so it can be used elsewhere
  async function fetchChannels() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoading(false);
    }
  }
  
  // Fetch channels when component mounts
  useEffect(() => {
    fetchChannels();
  }, []);
  
  const handleChannelClick = (channelId: string) => {
    router.push(`/channels/${channelId}`);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Commenter Admin</h1>
        
        <div className="space-y-8">
          <SupabaseConnectionTest />
          
          <div className="flex flex-wrap gap-4 mb-6">
            <Link href="/" className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700">
              Back to Analytics
            </Link>
            <Link href="/youtube-comments" className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded hover:bg-indigo-100">
              View All Comments
            </Link>
            <Link href="/admin/migrate" className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded hover:bg-indigo-100">
              Migrate Local Comments
            </Link>
            <Link href="/videos" className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded hover:bg-indigo-100">
              View All Videos
            </Link>
          </div>
          
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Import a YouTube Channel</h2>
            <div className="mb-4">
              <ImportStatus />
            </div>
            <ChannelImporter onImportSuccess={() => {
              fetchChannels();
              router.refresh();
            }} />
          </section>
          
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Your Channels</h2>
            <ChannelsList 
              channels={channels} 
              loading={loading}
              onChannelClick={handleChannelClick}
            />
          </section>
          
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Import YouTube Videos</h2>
            <VideoImporter />
          </section>
          
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Test Database Connection</h2>
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={async () => {
                const { data, error } = await supabase
                  .from('comments')
                  .select('count')
                  .limit(1);
                
                console.log('Database connection test:', { data, error });
                alert(error 
                  ? `Connection error: ${error.message}` 
                  : `Connection successful! Data: ${JSON.stringify(data)}`);
              }}
            >
              Test Database Connection
            </button>
          </section>
          
          <section className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Database Inspector</h2>
            <DatabaseInspector />
          </section>
        </div>
      </div>
    </div>
  );
} 