/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IPollFunctions,
	IWebhookFunctions,
	IRequestOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import type {
	IPrismicCredentials,
	IPrismicRepository,
	IPrismicSearchResponse,
	IPrismicRequestOptions,
	IPrismicDocument,
} from '../types/PrismicTypes';

type PrismicContext = IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions | IWebhookFunctions;

/**
 * Get the base URL for Prismic API requests
 */
export function getBaseUrl(repositoryName: string, usePreview: boolean = false): string {
	const subdomain = usePreview ? '' : '.cdn';
	return `https://${repositoryName}${subdomain}.prismic.io/api/v2`;
}

/**
 * Get Prismic credentials from the node
 */
export async function getPrismicCredentials(
	context: PrismicContext,
): Promise<IPrismicCredentials> {
	const credentials = await context.getCredentials('prismicApi');
	return {
		repositoryName: credentials.repositoryName as string,
		accessToken: credentials.accessToken as string | undefined,
		usePreviewEndpoint: credentials.usePreviewEndpoint as boolean | undefined,
	};
}

/**
 * Get repository information including refs
 */
export async function getRepository(
	context: PrismicContext,
): Promise<IPrismicRepository> {
	const credentials = await getPrismicCredentials(context);
	const baseUrl = getBaseUrl(credentials.repositoryName, credentials.usePreviewEndpoint);

	const options: IRequestOptions = {
		method: 'GET' as IHttpRequestMethods,
		uri: baseUrl,
		json: true,
	};

	if (credentials.accessToken) {
		options.qs = { access_token: credentials.accessToken };
	}

	try {
		return await context.helpers.request(options) as IPrismicRepository;
	} catch (error) {
		throw new NodeApiError(context.getNode(), error as JsonObject, {
			message: 'Failed to fetch repository information',
		});
	}
}

/**
 * Get the master ref for querying published content
 */
export async function getMasterRef(
	context: PrismicContext,
): Promise<string> {
	const repository = await getRepository(context);
	const masterRef = repository.refs.find((ref) => ref.isMasterRef);

	if (!masterRef) {
		throw new NodeApiError(context.getNode(), { message: 'Could not find master ref' } as JsonObject, {
			message: 'Could not find master ref in repository',
		});
	}

	return masterRef.ref;
}

/**
 * Make a request to the Prismic API
 */
export async function prismicApiRequest(
	context: PrismicContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body?: IDataObject,
	query?: IDataObject,
): Promise<IDataObject | IDataObject[]> {
	const credentials = await getPrismicCredentials(context);
	const baseUrl = getBaseUrl(credentials.repositoryName, credentials.usePreviewEndpoint);

	const options: IRequestOptions = {
		method,
		uri: `${baseUrl}${endpoint}`,
		headers: {
			Accept: 'application/json',
		},
		json: true,
		qs: { ...query },
	};

	if (credentials.accessToken) {
		options.qs = {
			...options.qs,
			access_token: credentials.accessToken,
		};
	}

	if (body && method !== 'GET') {
		options.body = body;
	}

	try {
		const response = await context.helpers.request(options);
		
		// Check for Prismic error response
		if (response.error) {
			throw new NodeApiError(context.getNode(), response as JsonObject, {
				message: response.error as string,
			});
		}

		return response as IDataObject | IDataObject[];
	} catch (error) {
		if ((error as NodeApiError).context?.httpCode) {
			throw error;
		}
		throw new NodeApiError(context.getNode(), error as JsonObject, {
			message: 'Prismic API request failed',
		});
	}
}

/**
 * Search for documents with pagination
 */
export async function searchDocuments(
	context: PrismicContext,
	options: IPrismicRequestOptions,
): Promise<IPrismicSearchResponse> {
	const ref = options.ref || await getMasterRef(context);

	const query: IDataObject = {
		ref,
		page: options.page || 1,
		pageSize: options.pageSize || 20,
	};

	if (options.q) {
		query.q = Array.isArray(options.q) ? options.q : [options.q];
	}

	if (options.after) {
		query.after = options.after;
	}

	if (options.fetch) {
		query.fetch = Array.isArray(options.fetch) ? options.fetch.join(',') : options.fetch;
	}

	if (options.fetchLinks) {
		query.fetchLinks = Array.isArray(options.fetchLinks) 
			? options.fetchLinks.join(',') 
			: options.fetchLinks;
	}

	if (options.graphQuery) {
		query.graphQuery = options.graphQuery;
	}

	if (options.lang) {
		query.lang = options.lang;
	}

	if (options.orderings) {
		query.orderings = options.orderings;
	}

	const response = await prismicApiRequest(context, 'GET', '/documents/search', undefined, query);
	return response as unknown as IPrismicSearchResponse;
}

/**
 * Fetch all documents with automatic pagination
 */
export async function prismicApiRequestAllItems(
	context: IExecuteFunctions,
	options: IPrismicRequestOptions,
	limit?: number,
): Promise<IPrismicDocument[]> {
	const returnData: IPrismicDocument[] = [];
	let page = 1;
	let totalPages = 1;

	do {
		const response = await searchDocuments(context, {
			...options,
			page,
			pageSize: 100,
		});

		returnData.push(...response.results);
		totalPages = response.total_pages;
		page++;

		if (limit && returnData.length >= limit) {
			return returnData.slice(0, limit);
		}
	} while (page <= totalPages);

	return returnData;
}

/**
 * Build a Prismic predicate query string
 */
export function buildPredicate(type: string, path: string, value: string | string[]): string {
	const formattedValue = Array.isArray(value)
		? `[${value.map((v) => `"${v}"`).join(', ')}]`
		: `"${value}"`;

	return `[[${type}(${path}, ${formattedValue})]]`;
}

/**
 * Build multiple predicates into a query array
 */
export function buildPredicates(predicates: Array<{ type: string; path: string; value: string | string[] }>): string[] {
	return predicates.map((p) => buildPredicate(p.type, p.path, p.value));
}

/**
 * Handle rate limiting with exponential backoff
 */
export async function withRetry<T>(
	context: PrismicContext,
	operation: () => Promise<T>,
	maxRetries: number = 3,
): Promise<T> {
	let lastError: Error | undefined;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await operation();
		} catch (error) {
			lastError = error as Error;
			
			// Check if it's a rate limit error (429)
			if ((error as NodeApiError).context?.httpCode === '429') {
				const delay = Math.pow(2, attempt) * 1000;
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}
			
			throw error;
		}
	}

	throw lastError;
}
