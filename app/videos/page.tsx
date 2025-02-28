"use client";
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import Image from 'next/image';

export default function VideosPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchChannels();
    fetchVideos();
  }, []);

  async function fetchChannels() {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .order('title');
      
      if (error) throw error;
      setChannels(data || []);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  }

  async function fetchVideos() {
    try {
      let query = supabase
        .from('videos')
        .select('*, channels(title, thumbnail_url)')
        .order('published_at', { ascending: false });
      
      if (selectedChannel) {
        query = query.eq('channel_id', selectedChannel);
      }
      
      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchVideos();
  }, [selectedChannel, searchQuery]);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">YouTube Videos</h1>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div>
          <select
            value={selectedChannel || ''}
            onChange={(e) => setSelectedChannel(e.target.value || null)}
            className="w-full p-2 border rounded"
          >
            <option value="">All Channels</option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>
                {channel.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-10">Loading videos...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.length === 0 ? (
            <div className="col-span-3 text-center py-10">
              No videos found
            </div>
          ) : (
            videos.map(video => (
              <Link href={`/videos/${video.video_id}`} key={video.id} className="block border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {video.thumbnail_url ? (
                  <div className="aspect-video relative">
                    <Image
                      src={video.thumbnail_url}
                      alt={video.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No thumbnail</span>
                  </div>
                )}
                
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">{video.title}</h3>
                  <p className="text-sm text-gray-500 mb-2">
                    {new Date(video.published_at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-3">{video.description}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
      
      <div className="flex justify-center mt-8">
        <Link href="/" className="text-indigo-600 hover:text-indigo-800">
          ← Back to Home
        </Link>
      </div>
    </div>
  );
} 