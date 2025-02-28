"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Channel } from "@prisma/client";

export function ChannelSelector() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchChannels() {
      try {
        const response = await fetch("/api/channels");
        if (!response.ok) {
          throw new Error("Failed to fetch channels");
        }
        const data = await response.json();
        setChannels(data.channels);
      } catch (err) {
        setError("Error loading channels");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchChannels();
  }, []);

  async function refreshChannels() {
    setLoading(true);
    try {
      const response = await fetch("/api/channels", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Failed to refresh channels");
      }
      const data = await response.json();
      setChannels(data.channels);
    } catch (err) {
      setError("Error refreshing channels");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function selectChannel(channelId: string) {
    router.push(`/dashboard/channel/${channelId}`);
  }

  if (loading) {
    return <div>Loading channels...</div>;
  }

  if (error) {
    return (
      <div>
        <p>{error}</p>
        <Button onClick={refreshChannels}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Your YouTube Channels</h2>
        <Button onClick={refreshChannels}>Refresh Channels</Button>
      </div>
      
      {channels.length === 0 ? (
        <div className="text-center p-8 border rounded-lg">
          <p className="mb-4">No channels found. Click below to fetch your YouTube channels.</p>
          <Button onClick={refreshChannels}>Fetch Channels</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {channels.map((channel) => (
            <div 
              key={channel.id} 
              className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => selectChannel(channel.id)}
            >
              <div className="flex items-center space-x-3">
                {channel.thumbnailUrl && (
                  <img 
                    src={channel.thumbnailUrl} 
                    alt={channel.title} 
                    className="w-12 h-12 rounded-full"
                  />
                )}
                <div>
                  <h3 className="font-medium">{channel.title}</h3>
                  <p className="text-sm text-gray-500 truncate max-w-xs">
                    {channel.description || "No description"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 