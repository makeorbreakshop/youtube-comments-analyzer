"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Channel {
  id: string;
  title: string;
  description: string;
  thumbnail_url: string;
  created_at: string;
}

interface ChannelsListProps {
  channels?: Channel[];
  loading?: boolean;
  onChannelClick?: (channelId: string) => void;
}

export default function ChannelsList({ 
  channels: propChannels, 
  loading: propLoading,
  onChannelClick 
}: ChannelsListProps = {}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // If props are provided, use them
  const useProvidedProps = propChannels !== undefined;

  useEffect(() => {
    // If channels are provided as props, use them
    if (useProvidedProps) {
      setChannels(propChannels || []);
      setLoading(propLoading || false);
      return;
    }
    
    // Otherwise fetch from the database
    async function fetchChannels() {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('channels').select('*');
        
        if (error) {
          throw error;
        }
        
        setChannels(data || []);
      } catch (err) {
        console.error('Error fetching channels:', err);
        setError('Failed to load channels');
      } finally {
        setLoading(false);
      }
    }
    
    fetchChannels();
  }, [propChannels, propLoading, useProvidedProps]);

  if (loading) return <div className="text-center p-4">Loading channels...</div>;
  
  if (error) return <div className="text-center p-4 text-red-500">{error}</div>;

  const handleChannelClick = (channelId: string) => {
    if (onChannelClick) {
      onChannelClick(channelId);
    }
  };

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold mb-4">Imported Channels</h2>
      
      {channels.length === 0 ? (
        <p className="text-gray-500">No channels imported yet</p>
      ) : (
        <ul className="divide-y divide-gray-200">
          {channels.map((channel) => (
            <li key={channel.id} className="py-4">
              {onChannelClick ? (
                <div 
                  onClick={() => handleChannelClick(channel.id)}
                  className="flex items-center hover:bg-gray-50 p-2 rounded cursor-pointer"
                >
                  {channel.thumbnail_url && (
                    <img 
                      src={channel.thumbnail_url} 
                      alt={channel.title} 
                      className="w-10 h-10 rounded-full mr-4"
                    />
                  )}
                  <div>
                    <h3 className="font-medium text-lg">{channel.title}</h3>
                    <p className="text-sm text-gray-500 truncate max-w-md">{channel.description}</p>
                  </div>
                </div>
              ) : (
                <Link href={`/channels/${channel.id}`} className="flex items-center hover:bg-gray-50 p-2 rounded">
                  {channel.thumbnail_url && (
                    <img 
                      src={channel.thumbnail_url} 
                      alt={channel.title} 
                      className="w-10 h-10 rounded-full mr-4"
                    />
                  )}
                  <div>
                    <h3 className="font-medium text-lg">{channel.title}</h3>
                    <p className="text-sm text-gray-500 truncate max-w-md">{channel.description}</p>
                  </div>
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 