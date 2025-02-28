"use client";
import { useState, useEffect } from 'react';

interface ChannelImporterProps {
  onImportSuccess: () => void;
}

export default function ChannelImporter({ onImportSuccess }: ChannelImporterProps) {
  const [channelName, setChannelName] = useState('');
  const [maxVideos, setMaxVideos] = useState(10);
  const [maxComments, setMaxComments] = useState(1000);
  const [includeOldVideos, setIncludeOldVideos] = useState(false);
  const [includeReplies, setIncludeReplies] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState({
    currentVideo: '',
    videosProcessed: 0,
    totalVideos: 0,
    commentsFound: 0,
    status: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!channelName.trim()) {
      setError('Please enter a channel name');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Create the EventSource for server-sent events
      const params = new URLSearchParams({
        channelName,
        maxVideos: maxVideos.toString(),
        includeOldVideos: includeOldVideos.toString(),
        maxComments: maxComments.toString(),
        includeReplies: includeReplies.toString()
      });
      
      const eventSource = new EventSource(`/api/import-comments-stream?${params.toString()}`);
      
      // Set a timeout to handle long-running imports
      const connectionTimeout = setTimeout(() => {
        // If connection is still open after 5 minutes, check if we have progress
        if (importProgress.commentsFound > 0 && importProgress.videosProcessed > 0) {
          // We have progress, so this is probably still working
          console.log("Import still in progress after timeout window");
        } else {
          // No progress, likely a real connection issue
          eventSource.close();
          setError('Connection timed out. Please try again.');
          setLoading(false);
        }
      }, 5 * 60 * 1000); // 5 minutes
      
      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'progress') {
          setImportProgress(data.progress);
        } else if (data.type === 'complete') {
          eventSource.close();
          clearTimeout(connectionTimeout);
          setSuccess(`Successfully imported ${data.commentCount} comments from ${data.channelTitle}!`);
          setLoading(false);
          onImportSuccess();
        } else if (data.type === 'error') {
          eventSource.close();
          clearTimeout(connectionTimeout);
          setError(data.error || 'An error occurred during import');
          setLoading(false);
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        
        // Check if we had already received some data
        if (importProgress.commentsFound > 0 && importProgress.videosProcessed > 0) {
          // We've made progress, so it might have finished successfully despite connection close
          setSuccess(`Import likely succeeded. ${importProgress.commentsFound} comments were processed.`);
        } else {
          setError('Connection to server lost. Please check the terminal for details.');
        }
        
        eventSource.close();
        clearTimeout(connectionTimeout);
        setLoading(false);
      };
      
      // Clean up function for when component unmounts or user cancels
      return () => {
        eventSource.close();
        clearTimeout(connectionTimeout);
      };
    } catch (error) {
      setError(`Error starting import: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="channelName" className="block text-sm font-medium text-gray-700">
            Channel Name or URL
          </label>
          <input
            id="channelName"
            type="text"
            value={channelName}
            onChange={(e) => setChannelName(e.target.value)}
            placeholder="e.g. NextJS"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            disabled={loading}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="maxVideos" className="block text-sm font-medium text-gray-700">
              Max Videos to Process
            </label>
            <input
              id="maxVideos"
              type="number"
              value={maxVideos}
              onChange={(e) => setMaxVideos(parseInt(e.target.value))}
              min="1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={loading}
            />
          </div>
          
          <div>
            <label htmlFor="maxComments" className="block text-sm font-medium text-gray-700">
              Max Comments to Import
            </label>
            <input
              id="maxComments"
              type="number"
              value={maxComments}
              onChange={(e) => setMaxComments(parseInt(e.target.value))}
              min="1"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              disabled={loading}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              id="includeOldVideos"
              type="checkbox"
              checked={includeOldVideos}
              onChange={(e) => setIncludeOldVideos(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              disabled={loading}
            />
            <label htmlFor="includeOldVideos" className="ml-2 block text-sm text-gray-700">
              Include older videos
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              id="includeReplies"
              type="checkbox"
              checked={includeReplies}
              onChange={(e) => setIncludeReplies(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              disabled={loading}
            />
            <label htmlFor="includeReplies" className="ml-2 block text-sm text-gray-700">
              Include replies
            </label>
          </div>
        </div>
        
        <div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Importing...' : 'Import Channel'}
          </button>
        </div>
      </form>
      
      {loading && (
        <div className="mt-4 p-4 border border-blue-100 bg-blue-50 rounded-md">
          <p className="text-blue-800 font-medium">{importProgress.status || 'Importing comments...'}</p>
          
          {importProgress.totalVideos > 0 && (
            <>
              <p className="mt-2">Processing: {importProgress.currentVideo}</p>
              <p>Video {importProgress.videosProcessed} of {importProgress.totalVideos}</p>
              <p>Comments found: {importProgress.commentsFound}</p>
              
              <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${Math.round((importProgress.videosProcessed / importProgress.totalVideos) * 100)}%` }}
                ></div>
              </div>
            </>
          )}
        </div>
      )}
      
      {error && (
        <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="mt-4 p-3 bg-green-50 text-green-700 rounded-md">
          <p>{success}</p>
        </div>
      )}
    </div>
  );
} 