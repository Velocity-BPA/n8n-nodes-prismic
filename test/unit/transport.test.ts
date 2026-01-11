/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { getBaseUrl, buildPredicate, buildPredicates } from '../../nodes/Prismic/transport/prismicApi';

describe('Prismic Transport Functions', () => {
	describe('getBaseUrl', () => {
		it('should return CDN URL by default', () => {
			const url = getBaseUrl('my-repo');
			expect(url).toBe('https://my-repo.cdn.prismic.io/api/v2');
		});

		it('should return CDN URL when usePreview is false', () => {
			const url = getBaseUrl('my-repo', false);
			expect(url).toBe('https://my-repo.cdn.prismic.io/api/v2');
		});

		it('should return preview URL when usePreview is true', () => {
			const url = getBaseUrl('my-repo', true);
			expect(url).toBe('https://my-repo.prismic.io/api/v2');
		});

		it('should handle repository names with hyphens', () => {
			const url = getBaseUrl('my-awesome-repo');
			expect(url).toBe('https://my-awesome-repo.cdn.prismic.io/api/v2');
		});
	});

	describe('buildPredicate', () => {
		it('should build an "at" predicate with string value', () => {
			const predicate = buildPredicate('at', 'document.type', 'blog_post');
			expect(predicate).toBe('[[at(document.type, "blog_post")]]');
		});

		it('should build an "any" predicate with array values', () => {
			const predicate = buildPredicate('any', 'document.tags', ['featured', 'news']);
			expect(predicate).toBe('[[any(document.tags, ["featured", "news"])]]');
		});

		it('should handle field paths with dots', () => {
			const predicate = buildPredicate('at', 'my.blog_post.category', 'technology');
			expect(predicate).toBe('[[at(my.blog_post.category, "technology")]]');
		});

		it('should handle fulltext predicate', () => {
			const predicate = buildPredicate('fulltext', 'document', 'search term');
			expect(predicate).toBe('[[fulltext(document, "search term")]]');
		});
	});

	describe('buildPredicates', () => {
		it('should build multiple predicates', () => {
			const predicates = buildPredicates([
				{ type: 'at', path: 'document.type', value: 'blog_post' },
				{ type: 'at', path: 'document.tags', value: 'featured' },
			]);

			expect(predicates).toHaveLength(2);
			expect(predicates[0]).toBe('[[at(document.type, "blog_post")]]');
			expect(predicates[1]).toBe('[[at(document.tags, "featured")]]');
		});

		it('should return empty array for empty input', () => {
			const predicates = buildPredicates([]);
			expect(predicates).toHaveLength(0);
		});
	});
});
