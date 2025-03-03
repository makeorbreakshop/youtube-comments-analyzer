# YouTube Comment Analyzer

This application allows you to analyze YouTube comments from channels and videos. It provides insights into comment patterns, engagement, and more.

## Reply Count Fix

The application includes a solution for correctly displaying replies to comments:

1. **API Endpoint**: The `/api/fix-comment-ui` endpoint fetches comments with their actual replies, bypassing the database's `reply_count` field which may not be accurate.

2. **SimpleComment Component**: The `SimpleComment` component used on the main page has been updated to:
   - Fetch the correct reply count on component mount
   - Fetch and display replies when the user clicks to expand them
   - Use the `fix-comment-ui` endpoint to ensure accurate data

3. **CommentItem Component**: Similarly, the `CommentItem` component used in other parts of the application has been updated to use the same approach.

## Debugging Tools

The application includes several debugging tools to help diagnose issues with the comment system:

- `/debug-replies` - A UI for examining reply counts and actual replies
- `/api/mcp-debug-replies` - API endpoint for debugging reply data
- `/api/fix-comment-ui` - API endpoint that returns the correct reply count and replies for a comment
- `/api/fix-reply-counts` - Legacy endpoint for updating reply counts in the database

## Usage

1. Start the application with `npm run dev`
2. Access the main page at `http://localhost:3001`
3. To debug reply issues, visit `http://localhost:3001/debug-replies`

## Known Issues

- The database's `reply_count` field may not update correctly. This is a known issue with the database schema and permissions.
- The application uses the `fix-comment-ui` endpoint as a workaround to ensure correct reply counts are displayed in the UI.

## Features

- YouTube OAuth authentication
- Fetch and store comments from your YouTube videos
- Search and filter comments
- Basic comment analysis

## Tech Stack

- Next.js 14+ with App Router
- TypeScript
- NextAuth.js for authentication
- Tailwind CSS for styling
- Prisma with PostgreSQL for database
- SWR for data fetching

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Google Developer account with YouTube Data API v3 access

### Environment Variables

Create a `.env` file in the root directory with the following variables: 