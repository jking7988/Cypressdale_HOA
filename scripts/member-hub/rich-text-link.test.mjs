import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeRichTextLink } from '../../lib/member-hub/rich-text-link.ts';

test('rich text links accept ordinary website addresses with or without a scheme', () => {
  for (const input of ['example.com/community', 'www.example.com/community', '  https://example.com/community  ']) {
    assert.equal(normalizeRichTextLink(input), input.trim().startsWith('http') ? input.trim() : `https://${input}`);
  }
  assert.equal(normalizeRichTextLink('http://example.com'), 'http://example.com/');
  assert.equal(normalizeRichTextLink('example.com:8080/path'), 'https://example.com:8080/path');
});

test('rich text links retain supported email, telephone, page and anchor targets', () => {
  for (const href of ['mailto:board@example.com', 'tel:+12815551212', '/events?year=2026#calendar', '#winners']) {
    assert.equal(normalizeRichTextLink(href), href);
  }
});

test('empty, unsafe and malformed links return an explicit invalid result', () => {
  for (const href of ['', ' ', 'not a website', 'javascript:alert(1)', 'data:text/html,test', 'file:///test', '//example.com', '/\\example.com', 'https://', 'https://user:password@example.com', 'https://exam\nple.com', 'mailto:', 'tel:']) {
    assert.equal(normalizeRichTextLink(href), null, href);
  }
});
