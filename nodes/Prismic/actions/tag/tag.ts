/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { getRepository, searchDocuments, prismicApiRequestAllItems, buildPredicate } from '../../transport/prismicApi';
import { flattenDocumentData } from '../../utils/helpers';
import type { IPrismicDocument } from '../../types/PrismicTypes';

export const tagOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['tag'],
			},
		},
		options: [
			{
				name: 'Count',
				value: 'count',
				description: 'Count documents with a specific tag',
				action: 'Count documents with tag',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'List all tags in the repository',
				action: 'Get all tags',
			},
			{
				name: 'Get Documents',
				value: 'getDocuments',
				description: 'Get all documents with a specific tag',
				action: 'Get documents with tag',
			},
		],
		default: 'getAll',
	},
];

export const tagFields: INodeProperties[] = [
	{
		displayName: 'Tag',
		name: 'tag',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['tag'],
				operation: ['getDocuments', 'count'],
			},
		},
		default: '',
		description: 'The tag to filter by',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['tag'],
				operation: ['getDocuments'],
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
				resource: ['tag'],
				operation: ['getDocuments'],
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
				resource: ['tag'],
				operation: ['getDocuments'],
			},
		},
		options: [
			{
				displayName: 'Flatten Data',
				name: 'flattenData',
				type: 'boolean',
				default: false,
				description: 'Whether to flatten the document data structure',
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
			{
				displayName: 'Type Filter',
				name: 'typeFilter',
				type: 'string',
				default: '',
				placeholder: 'blog_post',
				description: 'Optional custom type to filter results by',
			},
		],
	},
];

export async function executeTagOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	switch (operation) {
		case 'getAll': {
			const repository = await getRepository(this);
			
			returnData.push({
				json: { tags: repository.tags || [] },
				pairedItem: { item: itemIndex },
			});
			break;
		}

		case 'getDocuments': {
			const tag = this.getNodeParameter('tag', itemIndex) as string;
			const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', itemIndex) as number);
			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

			const flattenData = options.flattenData as boolean || false;

			const requestOptions: IDataObject = {};
			if (options.lang) {
				requestOptions.lang = options.lang as string;
			}
			if (options.orderings) {
				requestOptions.orderings = options.orderings as string;
			}

			const queries: string[] = [buildPredicate('at', 'document.tags', tag)];

			if (options.typeFilter) {
				queries.push(buildPredicate('at', 'document.type', options.typeFilter as string));
			}

			const documents = await prismicApiRequestAllItems(
				this,
				{ ...requestOptions, q: queries },
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

		case 'count': {
			const tag = this.getNodeParameter('tag', itemIndex) as string;

			const query = buildPredicate('at', 'document.tags', tag);

			const response = await searchDocuments(this, {
				q: [query],
				pageSize: 1,
			});

			returnData.push({
				json: {
					tag,
					count: response.total_results_size,
				},
				pairedItem: { item: itemIndex },
			});
			break;
		}
	}

	return returnData;
}
