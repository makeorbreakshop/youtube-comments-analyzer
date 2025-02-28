"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function MigrationPage() {
  const [localComments, setLocalComments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Check if there are any comments in localStorage
    const storedComments = localStorage.getItem('youtube_comments');
    if (storedComments) {
      try {
        const parsedComments = JSON.parse(storedComments);
        setLocalComments(Array.isArray(parsedComments) ? parsedComments : []);
      } catch (error) {
        console.error('Error parsing local comments:', error);
        setLocalComments([]);
      }
    }
  }, []);

  const migrateToSupabase = async () => {
    if (localComments.length === 0) {
      setResult({
        success: false,
        message: 'No local comments to migrate'
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // First, get or create channel
      const channelInfo = localComments[0]?.channel || {
        title: 'Migrated Channel',
        description: 'Channel migrated from local storage'
      };

      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .insert({
          channel_id: channelInfo.id || 'local-migration-' + Date.now(),
          title: channelInfo.title,
          description: channelInfo.description || '',
          thumbnail_url: channelInfo.thumbnail_url || null
        })
        .select()
        .single();

      if (channelError) throw channelError;

      // Format comments for Supabase
      const formattedComments = localComments.map(comment => ({
        comment_id: comment.id || 'local-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        video_id: comment.videoId || 'unknown',
        video_title: comment.videoTitle || null,
        author_name: comment.authorName || 'Unknown Author',
        author_profile_url: comment.authorProfileImageUrl || null,
        text: comment.text || '',
        like_count: comment.likeCount || 0,
        published_at: new Date(comment.publishedAt || Date.now()).toISOString(),
        channel_id: channelData.id
      }));

      // Insert comments in batches of 50
      const batchSize = 50;
      let migratedCount = 0;

      for (let i = 0; i < formattedComments.length; i += batchSize) {
        const batch = formattedComments.slice(i, i + batchSize);
        
        const { error: commentsError } = await supabase
          .from('comments')
          .insert(batch);
        
        if (commentsError) throw commentsError;
        
        migratedCount += batch.length;
      }

      setResult({
        success: true,
        message: `Successfully migrated ${migratedCount} comments to Supabase!`
      });

      // Optionally clear localStorage after successful migration
      localStorage.removeItem('youtube_comments');
    } catch (error) {
      console.error('Migration error:', error);
      setResult({
        success: false,
        message: `Error during migration: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Migrate Local Comments to Supabase</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Local Comments</h2>
          <p className="text-gray-600">
            {localComments.length > 0
              ? `Found ${localComments.length} comments in local storage.`
              : 'No local comments found.'
            }
          </p>
        </div>
        
        <button
          onClick={migrateToSupabase}
          disabled={isLoading || localComments.length === 0}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isLoading ? 'Migrating...' : 'Migrate to Supabase'}
        </button>
        
        {result && (
          <div className={`mt-4 p-3 rounded-md ${result.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            <p>{result.message}</p>
          </div>
        )}
      </div>
      
      <div className="flex justify-between">
        <Link href="/" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Home
        </Link>
        
        <Link href="/youtube-comments" className="text-indigo-600 hover:text-indigo-800">
          View YouTube Comments →
        </Link>
      </div>
    </div>
  );
} 