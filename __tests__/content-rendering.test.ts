import { sanitizeAndRenderHtml, convertHtmlToText } from '@/lib/content-utils';

describe('Content utilities', () => {
  test('Properly sanitizes and preserves HTML', () => {
    const input = 'Line 1<br>Line 2<br/>Line 3';
    const result = sanitizeAndRenderHtml(input);
    expect(result.__html).toContain('<br>');
    expect(result.__html).toContain('Line 1');
  });

  test('Converts HTML to text with newlines', () => {
    const input = 'Line 1<br>Line 2<br/>Line 3';
    const result = convertHtmlToText(input);
    expect(result).toBe('Line 1\nLine 2\nLine 3');
  });
}); 