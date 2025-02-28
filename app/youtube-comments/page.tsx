"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';
import { sanitizeAndRenderHtml } from '@/lib/content-utils';

export default function YouTubeCommentsPage() {
  const [comments, setComments] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchChannels();
  }, []);

  useEffect(() => {
    if (selectedChannel) {
      fetchComments();
    }
  }, [selectedChannel, searchQuery]);

  async function fetchChannels() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setChannels(data || []);
      
      // If channels exist, select the first one by default
      if (data && data.length > 0) {
        setSelectedChannel(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchComments() {
    try {
      setLoading(true);
      
      let query = supabase
        .from('comments')
        .select('*')
        .eq('channel_id', selectedChannel)
        .order('published_at', { ascending: false });
      
      // Apply search filter if provided
      if (searchQuery) {
        query = query.ilike('text', `%${searchQuery}%`);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComments();
  };

  const handleClearLocalComments = async () => {
    if (confirm('Are you sure you want to clear all locally saved comments? This cannot be undone.')) {
      // Clear localStorage comments if using localStorage
      localStorage.removeItem('youtube_comments');
      alert('Local comments cleared successfully');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">YouTube Comments</h1>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex-1">
            <label htmlFor="channel-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Channel
            </label>
            <select
              id="channel-select"
              value={selectedChannel || ''}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={loading || channels.length === 0}
            >
              {channels.length === 0 && <option value="">No channels available</option>}
              {channels.map(channel => (
                <option key={channel.id} value={channel.id}>{channel.title}</option>
              ))}
            </select>
          </div>
          
          <form onSubmit={handleSearch} className="flex w-full sm:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search comments..."
              className="block w-full rounded-l-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Search
            </button>
          </form>
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">
            {loading ? 'Loading...' : `Showing ${comments.length} comments`}
          </p>
          
          <button
            onClick={handleClearLocalComments}
            className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition"
          >
            Clear Local Comments
          </button>
        </div>
        
        {loading ? (
          <div className="py-4 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-500">Loading comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No comments found. Try selecting a different channel or adjusting your search.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {comments.map((comment) => (
              <div key={comment.id} className="py-4">
                <div className="flex space-x-3">
                  {comment.author_profile_url && (
                    <div className="flex-shrink-0">
                      <Image
                        className="h-10 w-10 rounded-full"
                        src={comment.author_profile_url}
                        alt={comment.author_name}
                        width={40}
                        height={40}
                      />
                    </div>
                  )}
                  
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {comment.author_name}
                    </p>
                    
                    <p className="text-sm text-gray-500">
                      Commented on {new Date(comment.published_at).toLocaleDateString()}
                      {comment.video_title && ` • ${comment.video_title}`}
                    </p>
                    
                    <div 
                      className="mt-2 text-sm text-gray-700 comment-text"
                      dangerouslySetInnerHTML={sanitizeAndRenderHtml(comment.text)}
                    />
                    
                    <div className="mt-2 text-xs text-gray-500">
                      {comment.like_count > 0 && (
                        <span className="mr-2">👍 {comment.like_count}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <Link href="/" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
} 