/**
 * Basic HTML sanitizer — strips script tags, event handlers, and dangerous URLs.
 * For admin-only email template previews where the HTML source is trusted
 * but we want defense-in-depth against accidental XSS.
 */
export function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';

  return html
    // Remove <script> tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove <iframe> tags
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    // Remove <object> and <embed> tags
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^>]*>/gi, '')
    // Remove on* event attributes (onclick, onload, onerror, etc.)
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
    .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    // Remove javascript: URLs in href/src attributes
    .replace(/(href|src)\s*=\s*["']javascript:[^"']*["']/gi, '$1="#"')
    // Remove data: URLs in src attributes (can be used for XSS)
    .replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src="#"');
}
