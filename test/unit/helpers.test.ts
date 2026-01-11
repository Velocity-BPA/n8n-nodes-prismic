/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import {
	extractSlices,
	filterSlicesByType,
	flattenDocumentData,
	isRichText,
	extractRichText,
	formatOrderings,
	parseOrderings,
	buildFetchParam,
	buildFetchLinksParam,
	isValidDocumentId,
	isValidUid,
	formatPrismicDate,
	getTimeSince,
} from '../../nodes/Prismic/utils/helpers';
import type { IPrismicDocument, IPrismicSlice } from '../../nodes/Prismic/types/PrismicTypes';

describe('Prismic Helper Functions', () => {
	describe('extractSlices', () => {
		it('should extract slices from document data', () => {
			const doc: IPrismicDocument = {
				id: 'test-id',
				type: 'blog_post',
				href: 'https://example.com',
				tags: [],
				first_publication_date: '2024-01-01T00:00:00Z',
				last_publication_date: '2024-01-01T00:00:00Z',
				slugs: ['test'],
				linked_documents: [],
				lang: 'en-us',
				alternate_languages: [],
				data: {
					slices: [
						{ slice_type: 'text_block', slice_label: null, version: '1', variation: 'default', primary: {}, items: [] },
						{ slice_type: 'image', slice_label: 'hero', version: '1', variation: 'default', primary: {}, items: [] },
					],
				},
			};

			const slices = extractSlices(doc);
			expect(slices).toHaveLength(2);
			expect(slices[0].slice_type).toBe('text_block');
			expect(slices[1].slice_type).toBe('image');
		});

		it('should return empty array if no slices', () => {
			const doc: IPrismicDocument = {
				id: 'test-id',
				type: 'blog_post',
				href: 'https://example.com',
				tags: [],
				first_publication_date: '2024-01-01T00:00:00Z',
				last_publication_date: '2024-01-01T00:00:00Z',
				slugs: ['test'],
				linked_documents: [],
				lang: 'en-us',
				alternate_languages: [],
				data: {},
			};

			const slices = extractSlices(doc);
			expect(slices).toHaveLength(0);
		});

		it('should use custom slice zone name', () => {
			const doc: IPrismicDocument = {
				id: 'test-id',
				type: 'blog_post',
				href: 'https://example.com',
				tags: [],
				first_publication_date: '2024-01-01T00:00:00Z',
				last_publication_date: '2024-01-01T00:00:00Z',
				slugs: ['test'],
				linked_documents: [],
				lang: 'en-us',
				alternate_languages: [],
				data: {
					body: [
						{ slice_type: 'content', slice_label: null, version: '1', variation: 'default', primary: {}, items: [] },
					],
				},
			};

			const slices = extractSlices(doc, 'body');
			expect(slices).toHaveLength(1);
			expect(slices[0].slice_type).toBe('content');
		});
	});

	describe('filterSlicesByType', () => {
		it('should filter slices by type', () => {
			const slices: IPrismicSlice[] = [
				{ slice_type: 'text_block', slice_label: null, version: '1', variation: 'default', primary: {}, items: [] },
				{ slice_type: 'image', slice_label: null, version: '1', variation: 'default', primary: {}, items: [] },
				{ slice_type: 'text_block', slice_label: null, version: '1', variation: 'default', primary: {}, items: [] },
			];

			const filtered = filterSlicesByType(slices, 'text_block');
			expect(filtered).toHaveLength(2);
			expect(filtered.every((s) => s.slice_type === 'text_block')).toBe(true);
		});
	});

	describe('isRichText', () => {
		it('should identify rich text fields', () => {
			const richText = [
				{ type: 'paragraph', text: 'Hello world', spans: [] },
			];
			expect(isRichText(richText)).toBe(true);
		});

		it('should return false for non-rich text', () => {
			expect(isRichText('string')).toBe(false);
			expect(isRichText(null)).toBe(false);
			expect(isRichText([])).toBe(false);
			expect(isRichText([{ other: 'value' }])).toBe(false);
		});
	});

	describe('extractRichText', () => {
		it('should extract text from rich text field', () => {
			const richText = [
				{ type: 'paragraph', text: 'Hello', spans: [] },
				{ type: 'paragraph', text: 'World', spans: [] },
			];
			expect(extractRichText(richText)).toBe('Hello\nWorld');
		});

		it('should handle empty rich text', () => {
			expect(extractRichText([])).toBe('');
		});
	});

	describe('formatOrderings', () => {
		it('should format orderings correctly', () => {
			const orderings = [
				{ field: 'document.first_publication_date', direction: 'desc' as const },
				{ field: 'my.blog_post.date', direction: 'asc' as const },
			];
			expect(formatOrderings(orderings)).toBe('[document.first_publication_date desc, my.blog_post.date]');
		});
	});

	describe('parseOrderings', () => {
		it('should parse orderings string', () => {
			const result = parseOrderings('[document.first_publication_date desc, my.blog_post.date]');
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ field: 'document.first_publication_date', direction: 'desc' });
			expect(result[1]).toEqual({ field: 'my.blog_post.date', direction: 'asc' });
		});

		it('should handle empty string', () => {
			expect(parseOrderings('')).toHaveLength(0);
		});
	});

	describe('buildFetchParam', () => {
		it('should build fetch parameter', () => {
			expect(buildFetchParam('blog_post', ['title', 'date'])).toBe('blog_post.title,blog_post.date');
		});
	});

	describe('buildFetchLinksParam', () => {
		it('should build fetchLinks parameter', () => {
			const links = [
				{ type: 'author', fields: ['name', 'bio'] },
				{ type: 'category', fields: ['title'] },
			];
			expect(buildFetchLinksParam(links)).toBe('author.name,author.bio,category.title');
		});
	});

	describe('isValidDocumentId', () => {
		it('should validate document IDs', () => {
			expect(isValidDocumentId('XxxxxxXXXXxXXXxXx')).toBe(true);
			expect(isValidDocumentId('YZ_abc123def456gh')).toBe(true);
			expect(isValidDocumentId('short')).toBe(false);
			expect(isValidDocumentId('invalid chars!')).toBe(false);
		});
	});

	describe('isValidUid', () => {
		it('should validate UIDs', () => {
			expect(isValidUid('my-blog-post')).toBe(true);
			expect(isValidUid('post123')).toBe(true);
			expect(isValidUid('Invalid_UID')).toBe(false);
			expect(isValidUid('has spaces')).toBe(false);
		});
	});

	describe('formatPrismicDate', () => {
		it('should format date to ISO string', () => {
			const result = formatPrismicDate('2024-01-15T10:00:00+0000');
			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
		});

		it('should return empty string for empty input', () => {
			expect(formatPrismicDate('')).toBe('');
		});
	});

	describe('getTimeSince', () => {
		it('should return "today" for today\'s date', () => {
			const today = new Date().toISOString();
			expect(getTimeSince(today)).toBe('today');
		});

		it('should return empty string for empty input', () => {
			expect(getTimeSince('')).toBe('');
		});
	});

	describe('flattenDocumentData', () => {
		it('should flatten document data structure', () => {
			const doc: IPrismicDocument = {
				id: 'test-id',
				uid: 'test-uid',
				type: 'blog_post',
				href: 'https://example.com',
				tags: ['featured'],
				first_publication_date: '2024-01-01T00:00:00Z',
				last_publication_date: '2024-01-15T00:00:00Z',
				slugs: ['test'],
				linked_documents: [],
				lang: 'en-us',
				alternate_languages: [],
				data: {
					title: [{ type: 'heading1', text: 'Test Title', spans: [] }],
					description: 'A test description',
				},
			};

			const flattened = flattenDocumentData(doc);
			expect(flattened.id).toBe('test-id');
			expect(flattened.uid).toBe('test-uid');
			expect(flattened.type).toBe('blog_post');
			expect(flattened.title).toBe('Test Title');
			expect(flattened.description).toBe('A test description');
		});
	});
});
