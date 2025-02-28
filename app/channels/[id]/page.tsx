"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import CommentsList from '@/components/CommentsList';

export default function ChannelPage({ params }: { params: { id: string } }) {
  const [channel, setChannel] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    async function fetchChannelData() {
      try {
        // Fetch channel details
        const { data: channelData, error: channelError } = await supabase
          .from('channels')
          .select('*')
          .eq('id', params.id)
          .single();
        
        if (channelError) throw channelError;
        
        setChannel(channelData);
        
        // Fetch comments
        await fetchComments();
      } catch (error) {
        console.error('Error fetching channel data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchChannelData();
  }, [params.id]);
  
  const fetchComments = async () => {
    setLoading(true);
    
    try {
      let query = supabase
        .from('comments')
        .select('*')
        .eq('channel_id', params.id)
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
  };
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchComments();
  };
  
  if (loading && !channel) {
    return (
      <div className="py-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p className="mt-2 text-gray-500">Loading channel...</p>
      </div>
    );
  }
  
  if (!channel) {
    return (
      <div className="py-8 text-center">
        <h2 className="text-xl font-semibold text-red-600">Channel not found</h2>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center space-x-4">
          {channel.thumbnail_url && (
            <img 
              src={channel.thumbnail_url} 
              alt={channel.title} 
              className="w-16 h-16 rounded-full"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold">{channel.title}</h1>
            <p className="text-gray-600">{channel.description}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Comments</h2>
          
          <form onSubmit={handleSearch} className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search comments..."
              className="block w-64 rounded-l-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-r-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Search
            </button>
          </form>
        </div>
        
        <CommentsList comments={comments} loading={loading} />
      </div>
    </div>
  );
} 