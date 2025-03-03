import DOMPurify from 'dompurify';

/**
 * Sanitizes and prepares HTML content for rendering
 * Simple implementation to handle common issues in comment text
 */
export function sanitizeAndRenderHtml(html: string) {
  if (!html) return { __html: '' };
  
  // Basic sanitization
  let sanitized = html
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  
  // Convert line breaks to <br>
  sanitized = sanitized.replace(/\n/g, '<br />');
  
  // Handle YouTube @mentions
  sanitized = sanitized.replace(
    /@@([a-zA-Z0-9_-]+)/g, 
    '<span class="text-blue-600">@$1</span>'
  );
  
  // Handle URLs
  sanitized = sanitized.replace(
    /(https?:\/\/[^\s]+)/g, 
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">$1</a>'
  );
  
  return { __html: sanitized };
}

export const convertHtmlToText = (content: string): string => {
  if (!content) return '';
  
  // Replace <br> tags with newlines
  let processedText = content.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove all other HTML tags
  processedText = processedText.replace(/<[^>]*>/g, '');
  
  return processedText;
}; 