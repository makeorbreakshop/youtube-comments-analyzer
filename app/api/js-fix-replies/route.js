// Force this route to be dynamic and prevent static generation
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const runtime = 'nodejs'; // Use Node.js runtime which has higher timeout limits
export const preferredRegion = 'auto';
export const maxDuration = 300; // Longer timeout for this specific route (5 minutes)

// Import the config (this is redundant but ensures the config is applied)
import '../config';

// ... existing code ... 