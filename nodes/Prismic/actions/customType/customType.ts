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

export const customTypeOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['customType'],
			},
		},
		options: [
			{
				name: 'Count',
				value: 'count',
				description: 'Count documents of this custom type',
				action: 'Count documents of custom type',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'List all custom types in the repository',
				action: 'Get all custom types',
			},
			{
				name: 'Get by UID',
				value: 'getByUid',
				description: 'Get a document by UID within this type',
				action: 'Get document by UID in custom type',
			},
			{
				name: 'Get Documents',
				value: 'getDocuments',
				description: 'Get all documents of this custom type',
				action: 'Get documents of custom type',
			},
			{
				name: 'Get Singleton',
				value: 'getSingleton',
				description: 'Get the singleton instance of this type',
				action: 'Get singleton document',
			},
		],
		default: 'getAll',
	},
];

export const customTypeFields: INodeProperties[] = [
	{
		displayName: 'Custom Type ID',
		name: 'customTypeId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['customType'],
				operation: ['getDocuments', 'getByUid', 'getSingleton', 'count'],
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
				resource: ['customType'],
				operation: ['getByUid'],
			},
		},
		default: '',
		description: 'The unique identifier of the document within the custom type',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['customType'],
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
				resource: ['customType'],
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
				resource: ['customType'],
				operation: ['getDocuments', 'getByUid', 'getSingleton'],
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
		],
	},
];

export async function executeCustomTypeOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	switch (operation) {
		case 'getAll': {
			const repository = await getRepository(this);
			const types = repository.types || {};
			
			const typeList = Object.entries(types).map(([id, name]) => ({
				id,
				name,
			}));

			returnData.push({
				json: { types: typeList },
				pairedItem: { item: itemIndex },
			});
			break;
		}

		case 'getDocuments': {
			const customTypeId = this.getNodeParameter('customTypeId', itemIndex) as string;
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

			const query = buildPredicate('at', 'document.type', customTypeId);

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

		case 'getByUid': {
			const customTypeId = this.getNodeParameter('customTypeId', itemIndex) as string;
			const uid = this.getNodeParameter('uid', itemIndex) as string;
			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

			const flattenData = options.flattenData as boolean || false;

			const requestOptions: IDataObject = {};
			if (options.lang) {
				requestOptions.lang = options.lang as string;
			}

			const typeQuery = buildPredicate('at', 'document.type', customTypeId);
			const uidQuery = buildPredicate('at', `my.${customTypeId}.uid`, uid);

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

		case 'getSingleton': {
			const customTypeId = this.getNodeParameter('customTypeId', itemIndex) as string;
			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

			const flattenData = options.flattenData as boolean || false;

			const requestOptions: IDataObject = {};
			if (options.lang) {
				requestOptions.lang = options.lang as string;
			}

			const query = buildPredicate('at', 'document.type', customTypeId);

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

		case 'count': {
			const customTypeId = this.getNodeParameter('customTypeId', itemIndex) as string;

			const query = buildPredicate('at', 'document.type', customTypeId);

			const response = await searchDocuments(this, {
				q: [query],
				pageSize: 1,
			});

			returnData.push({
				json: {
					customType: customTypeId,
					count: response.total_results_size,
				},
				pairedItem: { item: itemIndex },
			});
			break;
		}
	}

	return returnData;
}
