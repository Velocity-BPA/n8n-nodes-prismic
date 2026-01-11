/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { getRepository, prismicApiRequestAllItems, buildPredicate } from '../../transport/prismicApi';
import { flattenDocumentData } from '../../utils/helpers';
import type { IPrismicDocument } from '../../types/PrismicTypes';

export const languageOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['language'],
			},
		},
		options: [
			{
				name: 'Get All',
				value: 'getAll',
				description: 'List all configured languages/locales',
				action: 'Get all languages',
			},
			{
				name: 'Get Documents',
				value: 'getDocuments',
				description: 'Get all documents in a specific language',
				action: 'Get documents in language',
			},
			{
				name: 'Get Master Language',
				value: 'getMasterLanguage',
				description: 'Get the master language configuration',
				action: 'Get master language',
			},
		],
		default: 'getAll',
	},
];

export const languageFields: INodeProperties[] = [
	{
		displayName: 'Language',
		name: 'lang',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['language'],
				operation: ['getDocuments'],
			},
		},
		default: '',
		placeholder: 'en-us',
		description: 'The language code to filter by (e.g., en-us, fr-fr)',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['language'],
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
				resource: ['language'],
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
				resource: ['language'],
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

export async function executeLanguageOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	switch (operation) {
		case 'getAll': {
			const repository = await getRepository(this);
			
			returnData.push({
				json: { languages: repository.languages || [] },
				pairedItem: { item: itemIndex },
			});
			break;
		}

		case 'getMasterLanguage': {
			const repository = await getRepository(this);
			const languages = repository.languages || [];
			
			// The first language in the list is typically the master language
			const masterLanguage = languages.length > 0 ? languages[0] : null;

			returnData.push({
				json: {
					masterLanguage,
					allLanguages: languages,
				},
				pairedItem: { item: itemIndex },
			});
			break;
		}

		case 'getDocuments': {
			const lang = this.getNodeParameter('lang', itemIndex) as string;
			const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', itemIndex) as number);
			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

			const flattenData = options.flattenData as boolean || false;

			const requestOptions: IDataObject = {
				lang,
			};
			if (options.orderings) {
				requestOptions.orderings = options.orderings as string;
			}

			const queries: string[] = [];

			if (options.typeFilter) {
				queries.push(buildPredicate('at', 'document.type', options.typeFilter as string));
			}

			const documents = await prismicApiRequestAllItems(
				this,
				{ ...requestOptions, q: queries.length > 0 ? queries : undefined },
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
