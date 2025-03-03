import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import he from 'he';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Creates a safe markup object for dangerouslySetInnerHTML
 */
export function createMarkup(html: string) {
  // Use DOMPurify if available (client-side)
  if (typeof window !== 'undefined') {
    // Use dynamic import to avoid SSR issues
    const DOMPurify = require('dompurify');
    return { 
      __html: DOMPurify.sanitize(html || '', {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'br', 'p'],
        ALLOWED_ATTR: ['href', 'target', 'rel']
      }) 
    };
  }
  
  // Basic server-side fallback
  return { __html: html || '' };
}

/**
 * Decodes HTML entities in text returned from YouTube API
 * e.g. "I&#39;ve" becomes "I've"
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  return he.decode(text);
}

/**
 * More thorough HTML entity decoding that also handles special cases
 */
export function decodeAllHtmlEntities(text: string): string {
  if (!text) return '';
  
  // First use the he library for standard entities
  const decoded = he.decode(text);
  
  // Then handle any special cases that might not be covered
  return decoded
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=');
} 