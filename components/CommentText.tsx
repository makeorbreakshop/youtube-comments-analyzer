'use client';
import React from 'react';
import DOMPurify from 'isomorphic-dompurify';
import { decodeAllHtmlEntities } from '../lib/utils';

interface CommentTextProps {
  text: string;
  className?: string;
  useHtml?: boolean;
}

const CommentText = ({ text, className = '', useHtml = true }: CommentTextProps) => {
  // First decode all HTML entities
  const decodedText = decodeAllHtmlEntities(text);
  
  // If useHtml is false, just render the text with line breaks converted to <br>
  if (!useHtml) {
    return (
      <p className={className} style={{ whiteSpace: 'pre-wrap' }}>
        {decodedText}
      </p>
    );
  }
  
  // For HTML rendering, sanitize the HTML before rendering it
  // Configure DOMPurify to allow <br> tags but strip other potentially dangerous elements
  const sanitizedHtml = DOMPurify.sanitize(decodedText, {
    ALLOWED_TAGS: ['br', 'a', 'p', 'span', 'em', 'strong', 'b', 'i'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class']
  });
  
  // Use dangerouslySetInnerHTML to render the sanitized HTML
  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export default CommentText; 