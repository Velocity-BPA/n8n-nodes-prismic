/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { getRepository, searchDocuments, prismicApiRequestAllItems } from '../../transport/prismicApi';
import { flattenDocumentData } from '../../utils/helpers';
import type { IPrismicDocument, IPrismicRef } from '../../types/PrismicTypes';

export const releaseOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['release'],
			},
		},
		options: [
			{
				name: 'Get',
				value: 'get',
				description: 'Get a specific release by ID',
				action: 'Get a release',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'List all releases (scheduled content versions)',
				action: 'Get all releases',
			},
			{
				name: 'Get Documents',
				value: 'getDocuments',
				description: 'Get documents in a specific release',
				action: 'Get documents in release',
			},
			{
				name: 'Get Ref',
				value: 'getRef',
				description: 'Get the ref for querying release content',
				action: 'Get release ref',
			},
		],
		default: 'getAll',
	},
];

export const releaseFields: INodeProperties[] = [
	{
		displayName: 'Release ID',
		name: 'releaseId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['release'],
				operation: ['get', 'getRef', 'getDocuments'],
			},
		},
		default: '',
		description: 'The ID of the release',
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				resource: ['release'],
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
				resource: ['release'],
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
				resource: ['release'],
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
		],
	},
];

export async function executeReleaseOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	switch (operation) {
		case 'getAll': {
			const repository = await getRepository(this);
			const refs = repository.refs || [];
			
			// Filter out the master ref to get only releases
			const releases = refs
				.filter((ref: IPrismicRef) => !ref.isMasterRef)
				.map((ref: IPrismicRef) => ({
					id: ref.id,
					ref: ref.ref,
					label: ref.label,
				}));

			returnData.push({
				json: { releases },
				pairedItem: { item: itemIndex },
			});
			break;
		}

		case 'get': {
			const releaseId = this.getNodeParameter('releaseId', itemIndex) as string;
			const repository = await getRepository(this);
			const refs = repository.refs || [];
			
			const release = refs.find((ref: IPrismicRef) => ref.id === releaseId);

			if (release) {
				returnData.push({
					json: {
						id: release.id,
						ref: release.ref,
						label: release.label,
						isMasterRef: release.isMasterRef,
					},
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}

		case 'getRef': {
			const releaseId = this.getNodeParameter('releaseId', itemIndex) as string;
			const repository = await getRepository(this);
			const refs = repository.refs || [];
			
			const release = refs.find((ref: IPrismicRef) => ref.id === releaseId);

			if (release) {
				returnData.push({
					json: { ref: release.ref },
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}

		case 'getDocuments': {
			const releaseId = this.getNodeParameter('releaseId', itemIndex) as string;
			const returnAll = this.getNodeParameter('returnAll', itemIndex) as boolean;
			const limit = returnAll ? undefined : (this.getNodeParameter('limit', itemIndex) as number);
			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

			const flattenData = options.flattenData as boolean || false;

			// Get the release ref
			const repository = await getRepository(this);
			const refs = repository.refs || [];
			const release = refs.find((ref: IPrismicRef) => ref.id === releaseId);

			if (!release) {
				break;
			}

			const requestOptions: IDataObject = {
				ref: release.ref,
			};
			if (options.lang) {
				requestOptions.lang = options.lang as string;
			}
			if (options.orderings) {
				requestOptions.orderings = options.orderings as string;
			}

			if (returnAll) {
				const documents = await prismicApiRequestAllItems(this, requestOptions, limit);

				for (const doc of documents) {
					returnData.push({
						json: flattenData ? flattenDocumentData(doc as IPrismicDocument) : (doc as unknown as IDataObject),
						pairedItem: { item: itemIndex },
					});
				}
			} else {
				const response = await searchDocuments(this, {
					...requestOptions,
					pageSize: limit || 20,
				});

				for (const doc of response.results) {
					returnData.push({
						json: flattenData ? flattenDocumentData(doc as IPrismicDocument) : (doc as unknown as IDataObject),
						pairedItem: { item: itemIndex },
					});
				}
			}
			break;
		}
	}

	return returnData;
}
