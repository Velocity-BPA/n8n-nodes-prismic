/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { prismicApiRequest } from '../../transport/prismicApi';

export const assetOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['asset'],
			},
		},
		options: [
			{
				name: 'Get Integration Fields Ref',
				value: 'getIntegrationFieldsRef',
				description: 'Get the ref for integration fields data',
				action: 'Get integration fields ref',
			},
			{
				name: 'Query',
				value: 'query',
				description: 'Query integration field data from external sources',
				action: 'Query integration fields',
			},
		],
		default: 'getIntegrationFieldsRef',
	},
];

export const assetFields: INodeProperties[] = [
	{
		displayName: 'Integration Fields Ref',
		name: 'integrationFieldsRef',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['query'],
			},
		},
		default: '',
		description: 'The ref for querying integration field data',
	},
	{
		displayName: 'Custom Type',
		name: 'customType',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['query'],
			},
		},
		default: '',
		placeholder: 'product',
		description: 'The custom type containing the integration field',
	},
	{
		displayName: 'Field Name',
		name: 'fieldName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['query'],
			},
		},
		default: '',
		placeholder: 'external_data',
		description: 'The name of the integration field',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['asset'],
				operation: ['query'],
			},
		},
		options: [
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 20,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Search Query',
				name: 'searchQuery',
				type: 'string',
				default: '',
				description: 'Search query to filter integration field data',
			},
		],
	},
];

export async function executeAssetOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	switch (operation) {
		case 'getIntegrationFieldsRef': {
			// Get repository info to find integration fields ref
			const response = await prismicApiRequest(this, 'GET', '') as IDataObject;
			
			// Look for integration fields configuration in forms
			const forms = response.forms as IDataObject || {};
			const integrationFieldsForm = forms.integration_fields as IDataObject;

			if (integrationFieldsForm) {
				returnData.push({
					json: {
						method: integrationFieldsForm.method,
						action: integrationFieldsForm.action,
						name: integrationFieldsForm.name,
						fields: integrationFieldsForm.fields,
					},
					pairedItem: { item: itemIndex },
				});
			} else {
				returnData.push({
					json: {
						message: 'No integration fields configured in this repository',
						availableForms: Object.keys(forms),
					},
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}

		case 'query': {
			const integrationFieldsRef = this.getNodeParameter('integrationFieldsRef', itemIndex) as string;
			const customType = this.getNodeParameter('customType', itemIndex) as string;
			const fieldName = this.getNodeParameter('fieldName', itemIndex) as string;
			const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

			const queryParams: IDataObject = {
				ref: integrationFieldsRef,
			};

			if (options.limit) {
				queryParams.pageSize = options.limit;
			}

			if (options.searchQuery) {
				queryParams.q = options.searchQuery;
			}

			// Integration fields are queried via a specific endpoint pattern
			const endpoint = `/integration/fields/${customType}/${fieldName}`;
			
			try {
				const response = await prismicApiRequest(this, 'GET', endpoint, undefined, queryParams) as IDataObject;
				
				if (Array.isArray(response)) {
					for (const item of response) {
						returnData.push({
							json: item as IDataObject,
							pairedItem: { item: itemIndex },
						});
					}
				} else {
					returnData.push({
						json: response,
						pairedItem: { item: itemIndex },
					});
				}
			} catch (error) {
				// Integration fields might not be available or configured differently
				returnData.push({
					json: {
						error: 'Could not query integration fields',
						message: (error as Error).message,
						hint: 'Ensure integration fields are configured in your Prismic repository',
					},
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}
	}

	return returnData;
}
