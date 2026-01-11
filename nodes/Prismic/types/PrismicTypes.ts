/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IDataObject } from 'n8n-workflow';

export interface IPrismicCredentials {
	repositoryName: string;
	accessToken?: string;
	usePreviewEndpoint?: boolean;
}

export interface IPrismicRef {
	id: string;
	ref: string;
	label: string;
	isMasterRef: boolean;
}

export interface IPrismicLanguage {
	id: string;
	name: string;
}

export interface IPrismicRepository {
	refs: IPrismicRef[];
	bookmarks: IDataObject;
	types: IDataObject;
	languages: IPrismicLanguage[];
	tags: string[];
	forms: IDataObject;
	experiments: IDataObject;
	oauth_initiate: string;
	oauth_token: string;
	version: string;
	license: string;
}

export interface IPrismicDocument {
	id: string;
	uid?: string;
	type: string;
	href: string;
	tags: string[];
	first_publication_date: string;
	last_publication_date: string;
	slugs: string[];
	linked_documents: IDataObject[];
	lang: string;
	alternate_languages: IPrismicAlternateLanguage[];
	data: IDataObject;
}

export interface IPrismicAlternateLanguage {
	id: string;
	type: string;
	lang: string;
	uid?: string;
}

export interface IPrismicSearchResponse {
	page: number;
	results_per_page: number;
	results_size: number;
	total_results_size: number;
	total_pages: number;
	next_page: string | null;
	prev_page: string | null;
	results: IPrismicDocument[];
	version: string;
	license: string;
}

export interface IPrismicError {
	error: string;
	oauth_initiate?: string;
	oauth_token?: string;
}

export interface IPrismicSlice {
	slice_type: string;
	slice_label: string | null;
	version: string;
	variation: string;
	primary: IDataObject;
	items: IDataObject[];
}

export interface IPrismicRelease {
	id: string;
	ref: string;
	label: string;
	scheduledAt?: string;
}

export interface IPrismicCustomType {
	id: string;
	name: string;
	repeatable: boolean;
	json: IDataObject;
}

export type PrismicResourceType = 
	| 'repository'
	| 'document'
	| 'customType'
	| 'tag'
	| 'language'
	| 'release'
	| 'slice'
	| 'asset';

export type PrismicPredicateType =
	| 'at'
	| 'not'
	| 'any'
	| 'in'
	| 'fulltext'
	| 'has'
	| 'missing'
	| 'similar'
	| 'near'
	| 'gt'
	| 'lt'
	| 'inRange'
	| 'dateAfter'
	| 'dateBefore'
	| 'dateBetween'
	| 'dayOfMonth'
	| 'dayOfMonthAfter'
	| 'dayOfMonthBefore'
	| 'dayOfWeek'
	| 'dayOfWeekAfter'
	| 'dayOfWeekBefore'
	| 'month'
	| 'monthAfter'
	| 'monthBefore'
	| 'year'
	| 'hour'
	| 'hourAfter'
	| 'hourBefore';

export interface IPrismicPredicate {
	type: PrismicPredicateType;
	path: string;
	value: string | string[] | number | number[];
}

export interface IPrismicRequestOptions {
	ref?: string;
	q?: string | string[];
	page?: number;
	pageSize?: number;
	after?: string;
	fetch?: string | string[];
	fetchLinks?: string | string[];
	graphQuery?: string;
	lang?: string;
	orderings?: string;
}

export interface IPrismicWebhookPayload {
	type: string;
	masterRef: string;
	releases: IDataObject;
	masks: IDataObject;
	tags: IDataObject;
	experiments: IDataObject;
	documents: string[];
	domain: string;
	apiUrl: string;
	secret?: string;
}
