/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { searchDocuments, prismicApiRequestAllItems, buildPredicate } from '../../transport/prismicApi';
import { flattenDocumentData } from '../../utils/helpers';
import type { IPrismicDocument } from '../../types/PrismicTypes';

export const documentOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['document'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a single document by ID',
				action: 'Get a document',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all documents with optional filtering',
				action: 'Get all documents',
			},
			{
				name: 'Get by IDs',
				value: 'getByIds',
				description: 'Get multiple documents by their IDs',
				action: 'Get documents by IDs',
			},
			{
				name: 'Get by Tag',
				value: 'getByTag',
				description: 'Get all documents with a specific tag',
				action: 'Get documents by tag',
			},
			{
				name: 'Get by Type',
				value: 'getByType',
				description: 'Get all documents of a specific custom type',
				action: 'Get documents by type',
			},
			{
				name: 'Get by UID',
				value: 'getByUid',
				description: 'Get a document by its UID within a custom type',
				action: 'Get document by UID',
			},
			{
				name: 'Get Similar',
				value: 'getSimilar',
				description: 'Get documents similar to a specified document',
				action: 'Get similar documents',
			},
			{
				name: 'Get Single',
				value: 'getSingle',
				description: 'Get the singleton document of a custom type',
				action: 'Get singleton document',
			},
			{
				name: 'Search',
				value: 'search',
				description: 'Search documents with predicate queries',
				action: 'Search documents',
			},
		],
		default: 'get',
	},
];

export const documentFields: INodeProperties[] = [
	// Get by ID
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['get', 'getSimilar'],
			},
		},
		default: '',
		description: 'The ID of the document to retrieve',
	},

	// Get by UID
	{
		displayName: 'Custom Type',
		name: 'customType',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['getByUid', 'getSingle', 'getByType'],
			},
		},
		default: '',
		placeholder: 'blog_post',
		description: 'The API ID of the custom type',
	},
	{
		displayName: 'UID',
		name: 'uid',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['getByUid'],
			},
		},
		default: '',
		description: 'The unique identifier of the document within its custom type',
	},

	// Get by IDs
	{
		displayName: 'Document IDs',
		name: 'documentIds',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['getByIds'],
			},
		},
		default: '',
		placeholder: 'XxxXXX, YyyYYY, ZzzZZZ',
		description: 'Comma-separated list of document IDs to retrieve',
	},

	// Get by Tag
	{
		displayName: 'Tag',
		name: 'tag',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['getByTag'],
			},
		},
		default: '',
		description: 'The tag to filter documents by',
	},

	// Search - Predicate Type
	{
		displayName: 'Search Type',
		name: 'searchType',
		type: 'options',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['search'],
			},
		},
		options: [
			{
				name: 'Full Text',
				value: 'fulltext',
				description: 'Full text search across document content',
			},
			{
				name: 'Field Match',
				value: 'at',
				description: 'Match exact field value',
			},
			{
				name: 'Field Contains Any',
				value: 'any',
				description: 'Match any of multiple values',
			},
			{
				name: 'Custom Predicate',
				value: 'custom',
				description: 'Use a custom predicate query',
			},
		],
		default: 'fulltext',
	},
	{
		displayName: 'Search Query',
		name: 'searchQuery',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['search'],
				searchType: ['fulltext'],
			},
		},
		default: '',
		description: 'The text to search for',
	},
	{
		displayName: 'Field Path',
		name: 'fieldPath',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['search'],
				searchType: ['at', 'any', 'fulltext'],
			},
			hide: {
				searchType: ['fulltext'],
			},
		},
		default: '',
		placeholder: 'my.blog_post.title',
		description: 'The field path to search (e.g., my.blog_post.title or document.type)',
	},
	{
		displayName: 'Field Value',
		name: 'fieldValue',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['search'],
				searchType: ['at'],
			},
		},
		default: '',
		description: 'The value to match',
	},
	{
		displayName: 'Field Values',
		name: 'fieldValues',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['search'],
				searchType: ['any'],
			},
		},
		default: '',
		placeholder: 'value1, value2, value3',
		description: 'Comma-separated list of values to match any of',
	},
	{
		displayName: 'Custom Predicate',
		name: 'customPredicate',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['search'],
				searchType: ['custom'],
			},
		},
		default: '',
		placeholder: '[[at(document.type, "blog_post")]]',
		description: 'A custom Prismic predicate query',
	},

	// Common options
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['getAll', 'getByType', 'getByTag', 'search', 'getSimilar'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				resource: ['document'],
				operation: ['getAll', 'getByType', 'getByTag', 'search', 'getSimilar'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 100,
		},
		default: 20,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['document'],
			},
		},
		options: [
			{
				displayName: 'Fetch Fields',
				name: 'fetch',
				type: 'string',
				default: '',
				placeholder: 'blog_post.title, blog_post.date',
				description: 'Comma-separated list of fields to fetch (e.g., blog_post.title)',
			},
			{
				displayName: 'Fetch Links',
				name: 'fetchLinks',
				type: 'string',
				default: '',
				placeholder: 'author.name, category.title',
				description: 'Fields to fetch from linked documents',
			},
			{
				displayName: 'Flatten Data',
				name: 'flattenData',
				type: 'boolean',
				default: false,
				description: 'Whether to flatten the document data structure',
			},
			{
				displayName: 'Graph Query',
				name: 'graphQuery',
				type: 'string',
				default: '',
				description: 'Advanced query for selective/deep fetching',
			},
			{
				displayName: 'Language',
				name: 'lang',
				type: 'string',
				default: '*',
				placeholder: 'en-us',
				description: 'Language/locale code (use * for all languages)',
			},
			{
				displayName: 'Orderings',
				name: 'orderings',
				type: 'string',
				default: '',
				placeholder: '[document.first_publication_date desc]',
				description: 'Field orderings for results',
			},
		],
	},
];

export async function executeDocumentOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

	const requestOptions: IDataObject = {};

	if (options.lang) {
		requestOptions.lang = options.lang as string;
	}
	if (options.fetch) {
		requestOptions.fetch = options.fetch as string;
	}
	if (options.fetchLinks) {
		requestOptions.fetchLinks = options.fetchLinks as string;
	}
	if (options.graphQuery) {
		requestOptions.graphQuery = options.graphQuery as string;
	}
	if (options.orderings) {
		requestOptions.orderings = options.orderings as string;
	}

	const flattenData = options.flattenData as boolean || false;

	switch (operation) {
		case 'get': {
			const documentId = this.getNodeParameter('documentId', itemIndex) as string;
			const query = buildPredicate('at', 'document.id', documentId);
			
			const response = await searchDocuments(this, {
				...requestOptions,
				q: [query],
				pageSize: 1,
			});

			if (response.results.length > 0) {
				const doc = response.results[0] as IPrismicDocument;
				returnData.push({
					json: flattenData ? flattenDocumentData(doc) : (doc as unknown as IDataObject),
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}

		case 'getByUid': {
			const customType = this.getNodeParameter('customType', itemIndex) as string;
			const uid = this.getNodeParameter('uid', itemIndex) as string;
			
			const typeQuery = buildPredicate('at', 'document.type', customType);
			const uidQuery = buildPredicate('at', `my.${customType}.uid`, uid);

			const response = await searchDocuments(this, {
				...requestOptions,
				q: [typeQuery, uidQuery],
				pageSize: 1,
			});

			if (response.results.length > 0) {
				const doc = response.results[0] as IPrismicDocument;
				returnData.push({
					json: flattenData ? flattenDocumentData(doc) : (doc as unknown as IDataObject),
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}

		case 'getAll': {
			const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', itemIndex) as number);

			const documents = await prismicApiRequestAllItems(this, requestOptions, limit);

			for (const doc of documents) {
				returnData.push({
					json: flattenData ? flattenDocumentData(doc as IPrismicDocument) : (doc as unknown as IDataObject),
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}

		case 'getByType': {
			const customType = this.getNodeParameter('customType', itemIndex) as string;
			const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', itemIndex) as number);

			const query = buildPredicate('at', 'document.type', customType);

			const documents = await prismicApiRequestAllItems(
				this,
				{ ...requestOptions, q: [query] },
				limit,
			);

			for (const doc of documents) {
				returnData.push({
					json: flattenData ? flattenDocumentData(doc as IPrismicDocument) : (doc as unknown as IDataObject),
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}

		case 'getByTag': {
			const tag = this.getNodeParameter('tag', itemIndex) as string;
			const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', itemIndex) as number);

			const query = buildPredicate('at', 'document.tags', tag);

			const documents = await prismicApiRequestAllItems(
				this,
				{ ...requestOptions, q: [query] },
				limit,
			);

			for (const doc of documents) {
				returnData.push({
					json: flattenData ? flattenDocumentData(doc as IPrismicDocument) : (doc as unknown as IDataObject),
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}

		case 'getByIds': {
			const documentIds = this.getNodeParameter('documentIds', itemIndex) as string;
			const ids = documentIds.split(',').map((id) => id.trim());

			const formattedIds = `[${ids.map((id) => `"${id}"`).join(', ')}]`;
			const query = `[[in(document.id, ${formattedIds})]]`;

			const response = await searchDocuments(this, {
				...requestOptions,
				q: [query],
				pageSize: 100,
			});

			for (const doc of response.results) {
				returnData.push({
					json: flattenData ? flattenDocumentData(doc as IPrismicDocument) : (doc as unknown as IDataObject),
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}

		case 'getSingle': {
			const customType = this.getNodeParameter('customType', itemIndex) as string;
			const query = buildPredicate('at', 'document.type', customType);

			const response = await searchDocuments(this, {
				...requestOptions,
				q: [query],
				pageSize: 1,
			});

			if (response.results.length > 0) {
				const doc = response.results[0] as IPrismicDocument;
				returnData.push({
					json: flattenData ? flattenDocumentData(doc) : (doc as unknown as IDataObject),
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}

		case 'search': {
			const searchType = this.getNodeParameter('searchType', itemIndex) as string;
			const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', itemIndex) as number);

			let query: string;

			switch (searchType) {
				case 'fulltext': {
					const searchQuery = this.getNodeParameter('searchQuery', itemIndex) as string;
					query = `[[fulltext(document, "${searchQuery}")]]`;
					break;
				}
				case 'at': {
					const fieldPath = this.getNodeParameter('fieldPath', itemIndex) as string;
					const fieldValue = this.getNodeParameter('fieldValue', itemIndex) as string;
					query = buildPredicate('at', fieldPath, fieldValue);
					break;
				}
				case 'any': {
					const fieldPath = this.getNodeParameter('fieldPath', itemIndex) as string;
					const fieldValues = this.getNodeParameter('fieldValues', itemIndex) as string;
					const values = fieldValues.split(',').map((v) => v.trim());
					const formattedValues = `[${values.map((v) => `"${v}"`).join(', ')}]`;
					query = `[[any(${fieldPath}, ${formattedValues})]]`;
					break;
				}
				case 'custom':
				default: {
					query = this.getNodeParameter('customPredicate', itemIndex) as string;
					break;
				}
			}

			const documents = await prismicApiRequestAllItems(
				this,
				{ ...requestOptions, q: [query] },
				limit,
			);

			for (const doc of documents) {
				returnData.push({
					json: flattenData ? flattenDocumentData(doc as IPrismicDocument) : (doc as unknown as IDataObject),
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}

		case 'getSimilar': {
			const documentId = this.getNodeParameter('documentId', itemIndex) as string;
			const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', itemIndex) as number);

			const query = `[[similar("${documentId}", 10)]]`;

			const documents = await prismicApiRequestAllItems(
				this,
				{ ...requestOptions, q: [query] },
				limit,
			);

			for (const doc of documents) {
				returnData.push({
					json: flattenData ? flattenDocumentData(doc as IPrismicDocument) : (doc as unknown as IDataObject),
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}
	}

	return returnData;
}
