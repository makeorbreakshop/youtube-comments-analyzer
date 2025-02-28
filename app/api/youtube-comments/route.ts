import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]/route";

// Helper function to directly search for a channel
async function searchForChannel(query: string, apiKey: string) {
  try {
    // Search for the channel using the YouTube search API
    const searchResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=channel&maxResults=1&key=${apiKey}`
    );
    
    const searchData = await searchResponse.json();
    console.log("Search API response:", JSON.stringify(searchData, null, 2));
    
    if (!searchData.items || searchData.items.length === 0) {
      throw new Error(`No channel found for query: ${query}`);
    }
    
    return searchData.items[0].snippet.channelId;
  } catch (error) {
    console.error("Error searching for channel:", error);
    throw error;
  }
}

// Helper function to fetch comments from a YouTube channel
async function fetchLatestChannelComments(channelId: string, apiKey: string, maxResults: number = 20) {
  try {
    // First, get the channel's uploads playlist ID
    console.log(`Fetching channel data for ID: ${channelId}`);
    const channelResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=contentDetails,snippet&id=${channelId}&key=${apiKey}`
    );
    
    const channelData = await channelResponse.json();
    console.log("Channel API response:", JSON.stringify(channelData, null, 2));
    
    if (!channelData.items || channelData.items.length === 0) {
      throw new Error(`Channel not found with ID: ${channelId}`);
    }
    
    const uploadsPlaylistId = channelData.items[0]?.contentDetails?.relatedPlaylists?.uploads;
    
    if (!uploadsPlaylistId) {
      throw new Error("Could not find uploads playlist for this channel");
    }
    
    console.log(`Fetching videos from uploads playlist: ${uploadsPlaylistId}`);
    // Get the most recent videos from the uploads playlist
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=10&playlistId=${uploadsPlaylistId}&key=${apiKey}`
    );
    
    const videosData = await videosResponse.json();
    console.log("Videos response:", JSON.stringify(videosData, null, 2).substring(0, 500) + "...");
    
    if (!videosData.items || videosData.items.length === 0) {
      throw new Error("No videos found for this channel");
    }
    
    const videoIds = videosData.items.map((item: any) => item.snippet.resourceId.videoId);
    console.log(`Found ${videoIds.length} videos, will fetch comments for each`);
    
    // Fetch comments for each video
    let allComments: any[] = [];
    
    for (const videoId of videoIds) {
      if (allComments.length >= maxResults) break;
      
      console.log(`Fetching comments for video: ${videoId}`);
      const commentsResponse = await fetch(
        `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&maxResults=${maxResults - allComments.length}&videoId=${videoId}&key=${apiKey}`
      );
      
      const commentsData = await commentsResponse.json();
      console.log(`Comments for video ${videoId}:`, JSON.stringify(commentsData, null, 2).substring(0, 500) + "...");
      
      if (commentsData.items && commentsData.items.length > 0) {
        // Add video title to each comment
        const videoTitle = videosData.items.find((v: any) => v.snippet.resourceId.videoId === videoId)?.snippet?.title || "Unknown Video";
        
        const commentsWithTitle = commentsData.items.map((comment: any) => ({
          ...comment,
          snippet: {
            ...comment.snippet,
            videoTitle
          }
        }));
        
        allComments = [...allComments, ...commentsWithTitle];
        console.log(`Added ${commentsWithTitle.length} comments, total: ${allComments.length}`);
      }
      
      if (allComments.length >= maxResults) break;
    }
    
    return allComments.slice(0, maxResults);
  } catch (error) {
    console.error("Error fetching channel comments:", error);
    throw error;
  }
}

// Add this helper function at the top of the file
function decodeHtmlEntities(text: string): string {
  const entities = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '='
  };
  
  return text.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&#x27;|&#x2F;|&#x60;|&#x3D;/g, 
    match => entities[match as keyof typeof entities]);
}

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const apiKey = process.env.YOUTUBE_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: "YouTube API key not configured" }, { status: 500 });
  }
  
  try {
    // Search for the channel by name
    const channelName = "Make or Break Shop";
    console.log("Searching for channel:", channelName);
    
    const channelId = await searchForChannel(channelName, apiKey);
    console.log("Found channel ID:", channelId);
    
    const comments = await fetchLatestChannelComments(channelId, apiKey);
    
    // Format the comments for display
    const formattedComments = comments.map(comment => ({
      id: comment.id,
      videoId: comment.snippet.videoId,
      authorName: comment.snippet.topLevelComment.snippet.authorDisplayName,
      authorProfileUrl: comment.snippet.topLevelComment.snippet.authorProfileImageUrl,
      text: comment.snippet.topLevelComment.snippet.textDisplay,
      likeCount: comment.snippet.topLevelComment.snippet.likeCount,
      publishedAt: comment.snippet.topLevelComment.snippet.publishedAt,
      videoTitle: comment.snippet.videoTitle || "Unknown Video"
    }));
    
    return NextResponse.json({ comments: formattedComments });
  } catch (error) {
    console.error("Error processing YouTube comments:", error);
    return NextResponse.json(
      { error: `Failed to fetch YouTube comments: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 