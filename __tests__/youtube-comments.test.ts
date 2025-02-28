import { sanitizeAndRenderHtml, convertHtmlToText } from '@/lib/content-utils';

test('Properly handles YouTube comment formatting', () => {
  // Sample comment from YouTube API
  const youtubeComment = 'First line<br>Second line<br><br>Last line with &amp; symbol';
  
  // Test HTML rendering
  const htmlResult = sanitizeAndRenderHtml(youtubeComment);
  expect(htmlResult.__html).toContain('<br>');
  expect(htmlResult.__html).toContain('&amp;'); // Should preserve entity
  
  // Test text conversion
  const textResult = convertHtmlToText(youtubeComment);
  expect(textResult).toBe('First line\nSecond line\n\nLast line with & symbol');
}); 