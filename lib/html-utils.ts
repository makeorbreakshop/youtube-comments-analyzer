import he from 'he';

// Re-export from utils.ts (only what we don't define here)
export { decodeAllHtmlEntities } from './utils';

/**
 * Decodes HTML entities in a string
 * e.g. "I&#39;ve" becomes "I've"
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return he.decode(text);
}

/**
 * Converts HTML to plain text, preserving line breaks
 */
export function convertHtmlToText(html: string): string {
  if (!html) return '';
  
  // Replace <br> tags with newlines
  const withLineBreaks = html.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove any other HTML tags
  const plainText = withLineBreaks.replace(/<[^>]*>/g, '');
  
  // Decode any HTML entities
  return he.decode(plainText);
} 