import DOMPurify from 'dompurify';

export function sanitizeAndRenderHtml(htmlContent: string) {
  if (!htmlContent) return { __html: '' };
  
  // Sanitize the HTML content using DOMPurify
  const sanitizedContent = DOMPurify.sanitize(htmlContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel']
  });
  
  return { __html: sanitizedContent };
}

export const convertHtmlToText = (content: string): string => {
  if (!content) return '';
  
  // Replace <br> tags with newlines
  let processedText = content.replace(/<br\s*\/?>/gi, '\n');
  
  // Remove all other HTML tags
  processedText = processedText.replace(/<[^>]*>/g, '');
  
  return processedText;
}; 