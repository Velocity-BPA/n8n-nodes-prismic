/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IDataObject } from 'n8n-workflow';
import type { IPrismicSlice, IPrismicDocument } from '../types/PrismicTypes';

/**
 * Extract slices from a document's data
 */
export function extractSlices(document: IPrismicDocument, sliceZone: string = 'slices'): IPrismicSlice[] {
	const data = document.data;
	
	if (!data || !data[sliceZone]) {
		return [];
	}

	const slices = data[sliceZone];
	
	if (!Array.isArray(slices)) {
		return [];
	}

	return slices as IPrismicSlice[];
}

/**
 * Filter slices by type
 */
export function filterSlicesByType(slices: IPrismicSlice[], sliceType: string): IPrismicSlice[] {
	return slices.filter((slice) => slice.slice_type === sliceType);
}

/**
 * Flatten document data for easier processing
 */
export function flattenDocumentData(document: IPrismicDocument): IDataObject {
	const flattened: IDataObject = {
		id: document.id,
		uid: document.uid,
		type: document.type,
		lang: document.lang,
		first_publication_date: document.first_publication_date,
		last_publication_date: document.last_publication_date,
		tags: document.tags,
	};

	// Flatten data fields
	if (document.data) {
		for (const [key, value] of Object.entries(document.data)) {
			if (key === 'slices' || key === 'body') {
				// Keep slices as-is
				flattened[key] = value;
			} else if (isRichText(value)) {
				// Extract text from rich text fields
				flattened[key] = extractRichText(value as IDataObject[]);
			} else {
				flattened[key] = value;
			}
		}
	}

	return flattened;
}

/**
 * Check if a field is a Prismic rich text field
 */
export function isRichText(value: unknown): boolean {
	if (!Array.isArray(value)) {
		return false;
	}

	if (value.length === 0) {
		return false;
	}

	const firstItem = value[0] as IDataObject;
	return 'type' in firstItem && 'text' in firstItem;
}

/**
 * Extract plain text from Prismic rich text field
 */
export function extractRichText(richText: IDataObject[]): string {
	if (!Array.isArray(richText)) {
		return '';
	}

	return richText
		.map((block) => block.text || '')
		.filter((text) => text !== '')
		.join('\n');
}

/**
 * Format ordering string for Prismic API
 */
export function formatOrderings(orderings: Array<{ field: string; direction?: 'asc' | 'desc' }>): string {
	const formatted = orderings
		.map((o) => {
			const dir = o.direction === 'desc' ? ' desc' : '';
			return `${o.field}${dir}`;
		})
		.join(', ');

	return `[${formatted}]`;
}

/**
 * Parse ordering string from Prismic format
 */
export function parseOrderings(orderingsString: string): Array<{ field: string; direction: 'asc' | 'desc' }> {
	if (!orderingsString) {
		return [];
	}

	// Remove brackets if present
	const cleaned = orderingsString.replace(/^\[|\]$/g, '');

	return cleaned.split(',').map((part) => {
		const trimmed = part.trim();
		const isDesc = trimmed.endsWith(' desc');
		const field = isDesc ? trimmed.replace(/ desc$/, '') : trimmed.replace(/ asc$/, '');
		
		return {
			field,
			direction: isDesc ? 'desc' : 'asc',
		};
	});
}

/**
 * Build fetch parameter for selective field fetching
 */
export function buildFetchParam(type: string, fields: string[]): string {
	return fields.map((field) => `${type}.${field}`).join(',');
}

/**
 * Build fetchLinks parameter for linked document fields
 */
export function buildFetchLinksParam(links: Array<{ type: string; fields: string[] }>): string {
	return links
		.flatMap((link) => link.fields.map((field) => `${link.type}.${field}`))
		.join(',');
}

/**
 * Parse a Prismic document ID
 */
export function isValidDocumentId(id: string): boolean {
	// Prismic document IDs are base64-like strings, typically 16-24 characters
	return /^[A-Za-z0-9_-]{16,24}$/.test(id);
}

/**
 * Parse a Prismic UID
 */
export function isValidUid(uid: string): boolean {
	// UIDs are lowercase alphanumeric with hyphens
	return /^[a-z0-9-]+$/.test(uid);
}

/**
 * Extract linked document references from a document
 */
export function extractLinkedDocuments(document: IPrismicDocument): IDataObject[] {
	const links: IDataObject[] = [];
	
	function traverse(obj: unknown) {
		if (!obj || typeof obj !== 'object') {
			return;
		}

		if (Array.isArray(obj)) {
			obj.forEach(traverse);
			return;
		}

		const data = obj as IDataObject;
		
		// Check if this is a link object
		if (data.link_type === 'Document' && data.id) {
			links.push({
				id: data.id,
				type: data.type,
				uid: data.uid,
				lang: data.lang,
			});
		}

		// Traverse nested objects
		for (const value of Object.values(data)) {
			traverse(value);
		}
	}

	traverse(document.data);
	return links;
}

/**
 * Format a Prismic date for display
 */
export function formatPrismicDate(dateString: string): string {
	if (!dateString) {
		return '';
	}

	const date = new Date(dateString);
	return date.toISOString();
}

/**
 * Calculate time difference from a Prismic date
 */
export function getTimeSince(dateString: string): string {
	if (!dateString) {
		return '';
	}

	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		return 'today';
	} else if (diffDays === 1) {
		return 'yesterday';
	} else if (diffDays < 7) {
		return `${diffDays} days ago`;
	} else if (diffDays < 30) {
		const weeks = Math.floor(diffDays / 7);
		return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
	} else if (diffDays < 365) {
		const months = Math.floor(diffDays / 30);
		return `${months} month${months > 1 ? 's' : ''} ago`;
	} else {
		const years = Math.floor(diffDays / 365);
		return `${years} year${years > 1 ? 's' : ''} ago`;
	}
}
