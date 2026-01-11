/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties, IDataObject } from 'n8n-workflow';
import { searchDocuments, buildPredicate } from '../../transport/prismicApi';
import { extractSlices, filterSlicesByType } from '../../utils/helpers';
import type { IPrismicDocument, IPrismicSlice } from '../../types/PrismicTypes';

export const sliceOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['slice'],
			},
		},
		options: [
			{
				name: 'Extract Slices',
				value: 'extractSlices',
				description: 'Extract and flatten slices from document data',
				action: 'Extract slices from document',
			},
			{
				name: 'Get by Document',
				value: 'getByDocument',
				description: 'Get all slices from a specific document',
				action: 'Get slices from document',
			},
			{
				name: 'Get by Type',
				value: 'getByType',
				description: 'Get slice definitions for a custom type',
				action: 'Get slices by type',
			},
		],
		default: 'getByDocument',
	},
];

export const sliceFields: INodeProperties[] = [
	{
		displayName: 'Document ID',
		name: 'documentId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['slice'],
				operation: ['getByDocument', 'extractSlices'],
			},
		},
		default: '',
		description: 'The ID of the document to extract slices from',
	},
	{
		displayName: 'Custom Type',
		name: 'customType',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['slice'],
				operation: ['getByType'],
			},
		},
		default: '',
		placeholder: 'blog_post',
		description: 'The API ID of the custom type',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: {
			show: {
				resource: ['slice'],
			},
		},
		options: [
			{
				displayName: 'Include Document Info',
				name: 'includeDocumentInfo',
				type: 'boolean',
				default: false,
				description: 'Whether to include document metadata with each slice',
			},
			{
				displayName: 'Slice Type Filter',
				name: 'sliceType',
				type: 'string',
				default: '',
				placeholder: 'text_block',
				description: 'Filter slices by a specific type',
			},
			{
				displayName: 'Slice Zone',
				name: 'sliceZone',
				type: 'string',
				default: 'slices',
				description: 'Name of the slice zone field in the document',
			},
		],
	},
];

export async function executeSliceOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];
	const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

	const sliceZone = (options.sliceZone as string) || 'slices';
	const sliceTypeFilter = options.sliceType as string || '';
	const includeDocumentInfo = options.includeDocumentInfo as boolean || false;

	switch (operation) {
		case 'getByDocument': {
			const documentId = this.getNodeParameter('documentId', itemIndex) as string;
			
			const query = buildPredicate('at', 'document.id', documentId);
			const response = await searchDocuments(this, {
				q: [query],
				pageSize: 1,
			});

			if (response.results.length > 0) {
				const doc = response.results[0] as IPrismicDocument;
				let slices = extractSlices(doc, sliceZone);

				if (sliceTypeFilter) {
					slices = filterSlicesByType(slices, sliceTypeFilter);
				}

				if (includeDocumentInfo) {
					for (let i = 0; i < slices.length; i++) {
						returnData.push({
							json: {
								documentId: doc.id,
								documentType: doc.type,
								documentUid: doc.uid,
								sliceIndex: i,
								...slices[i],
							},
							pairedItem: { item: itemIndex },
						});
					}
				} else {
					for (let i = 0; i < slices.length; i++) {
						returnData.push({
							json: {
								sliceIndex: i,
								...slices[i],
							},
							pairedItem: { item: itemIndex },
						});
					}
				}
			}
			break;
		}

		case 'extractSlices': {
			const documentId = this.getNodeParameter('documentId', itemIndex) as string;
			
			const query = buildPredicate('at', 'document.id', documentId);
			const response = await searchDocuments(this, {
				q: [query],
				pageSize: 1,
			});

			if (response.results.length > 0) {
				const doc = response.results[0] as IPrismicDocument;
				let slices = extractSlices(doc, sliceZone);

				if (sliceTypeFilter) {
					slices = filterSlicesByType(slices, sliceTypeFilter);
				}

				// Flatten and extract content from each slice
				const flattenedSlices = slices.map((slice: IPrismicSlice, index: number) => ({
					sliceIndex: index,
					sliceType: slice.slice_type,
					sliceLabel: slice.slice_label,
					variation: slice.variation,
					primary: slice.primary,
					items: slice.items,
					itemCount: slice.items?.length || 0,
				}));

				returnData.push({
					json: {
						documentId: doc.id,
						documentType: doc.type,
						sliceCount: flattenedSlices.length,
						slices: flattenedSlices,
					},
					pairedItem: { item: itemIndex },
				});
			}
			break;
		}

		case 'getByType': {
			const customType = this.getNodeParameter('customType', itemIndex) as string;
			
			// Get a sample document of this type to extract slice structure
			const query = buildPredicate('at', 'document.type', customType);
			const response = await searchDocuments(this, {
				q: [query],
				pageSize: 10,
			});

			// Collect unique slice types across documents
			const sliceTypes = new Map<string, IDataObject>();

			for (const doc of response.results as IPrismicDocument[]) {
				const slices = extractSlices(doc, sliceZone);

				for (const slice of slices) {
					if (!sliceTypes.has(slice.slice_type)) {
						sliceTypes.set(slice.slice_type, {
							sliceType: slice.slice_type,
							variation: slice.variation,
							primaryFields: Object.keys(slice.primary || {}),
							hasItems: (slice.items?.length || 0) > 0,
							sampleItemFields: slice.items?.length > 0 
								? Object.keys(slice.items[0] || {})
								: [],
						});
					}
				}
			}

			returnData.push({
				json: {
					customType,
					sliceTypes: Array.from(sliceTypes.values()),
				},
				pairedItem: { item: itemIndex },
			});
			break;
		}
	}

	return returnData;
}
