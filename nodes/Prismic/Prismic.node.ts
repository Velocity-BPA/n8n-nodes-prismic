/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	repositoryOperations,
	repositoryFields,
	executeRepositoryOperation,
} from './actions/repository/repository';
import {
	documentOperations,
	documentFields,
	executeDocumentOperation,
} from './actions/document/document';
import {
	customTypeOperations,
	customTypeFields,
	executeCustomTypeOperation,
} from './actions/customType/customType';
import {
	tagOperations,
	tagFields,
	executeTagOperation,
} from './actions/tag/tag';
import {
	languageOperations,
	languageFields,
	executeLanguageOperation,
} from './actions/language/language';
import {
	releaseOperations,
	releaseFields,
	executeReleaseOperation,
} from './actions/release/release';
import {
	sliceOperations,
	sliceFields,
	executeSliceOperation,
} from './actions/slice/slice';
import {
	assetOperations,
	assetFields,
	executeAssetOperation,
} from './actions/asset/asset';

// Log licensing notice once on node load
const LICENSING_NOTICE = `[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.`;

let licenseNoticeLogged = false;

export class Prismic implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Prismic',
		name: 'prismic',
		icon: 'file:prismic.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Prismic headless CMS API',
		defaults: {
			name: 'Prismic',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'prismicApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Asset',
						value: 'asset',
						description: 'Work with integration fields',
					},
					{
						name: 'Custom Type',
						value: 'customType',
						description: 'Work with custom types',
					},
					{
						name: 'Document',
						value: 'document',
						description: 'Work with documents',
					},
					{
						name: 'Language',
						value: 'language',
						description: 'Work with languages/locales',
					},
					{
						name: 'Release',
						value: 'release',
						description: 'Work with scheduled releases',
					},
					{
						name: 'Repository',
						value: 'repository',
						description: 'Work with repository metadata',
					},
					{
						name: 'Slice',
						value: 'slice',
						description: 'Work with slices',
					},
					{
						name: 'Tag',
						value: 'tag',
						description: 'Work with tags',
					},
				],
				default: 'document',
			},
			// Repository operations and fields
			...repositoryOperations,
			...repositoryFields,
			// Document operations and fields
			...documentOperations,
			...documentFields,
			// Custom Type operations and fields
			...customTypeOperations,
			...customTypeFields,
			// Tag operations and fields
			...tagOperations,
			...tagFields,
			// Language operations and fields
			...languageOperations,
			...languageFields,
			// Release operations and fields
			...releaseOperations,
			...releaseFields,
			// Slice operations and fields
			...sliceOperations,
			...sliceFields,
			// Asset operations and fields
			...assetOperations,
			...assetFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		// Log licensing notice once
		if (!licenseNoticeLogged) {
			console.warn(LICENSING_NOTICE);
			licenseNoticeLogged = true;
		}

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let result: INodeExecutionData[] = [];

				switch (resource) {
					case 'repository':
						result = await executeRepositoryOperation.call(this, operation, i);
						break;
					case 'document':
						result = await executeDocumentOperation.call(this, operation, i);
						break;
					case 'customType':
						result = await executeCustomTypeOperation.call(this, operation, i);
						break;
					case 'tag':
						result = await executeTagOperation.call(this, operation, i);
						break;
					case 'language':
						result = await executeLanguageOperation.call(this, operation, i);
						break;
					case 'release':
						result = await executeReleaseOperation.call(this, operation, i);
						break;
					case 'slice':
						result = await executeSliceOperation.call(this, operation, i);
						break;
					case 'asset':
						result = await executeAssetOperation.call(this, operation, i);
						break;
				}

				returnData.push(...result);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
