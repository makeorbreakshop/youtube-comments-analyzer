import he from 'he';

/**
 * Decodes HTML entities in a string
 * e.g. "I&#39;ve" becomes "I've"
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return he.decode(text);
}

/**
 * Export any other utility functions you might need
 */

/**
 * Converts HTML to plain text, preserving line breaks
 */
export function convertHtmlToText(html: string): string {
  if (!html) return '';
  
  // First decode entities
  // const decodedText = decodeHtmlEntities(html);
  
  // Replace <br> tags with newlines
  const withLineBreaks = html.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove any other HTML tags
  const plainText = withLineBreaks.replace(/<[^>]*>/g, '');
  
  // Decode any HTML entities
  return he.decode(plainText);
}

// Re-export the functions from utils.ts for compatibility
export { decodeHtmlEntities, decodeAllHtmlEntities } from './utils';

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