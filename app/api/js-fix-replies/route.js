// Force this route to be dynamic and prevent static generation
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;
export const runtime = 'nodejs'; // Use Node.js runtime which has higher timeout limits

// ... existing code ... 