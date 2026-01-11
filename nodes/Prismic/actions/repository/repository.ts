/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type { IExecuteFunctions, INodeExecutionData, INodeProperties } from 'n8n-workflow';
import { getRepository, getMasterRef } from '../../transport/prismicApi';

export const repositoryOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['repository'],
			},
		},
		options: [
			{
				name: 'Get Info',
				value: 'getInfo',
				description: 'Get repository metadata including refs, types, tags, and languages',
				action: 'Get repository info',
			},
			{
				name: 'Get Languages',
				value: 'getLanguages',
				description: 'Get all configured locales/languages',
				action: 'Get repository languages',
			},
			{
				name: 'Get Master Ref',
				value: 'getMasterRef',
				description: 'Get the current master ref for querying published content',
				action: 'Get master ref',
			},
			{
				name: 'Get Refs',
				value: 'getRefs',
				description: 'List all available refs (master, releases, scheduled)',
				action: 'Get repository refs',
			},
			{
				name: 'Get Tags',
				value: 'getTags',
				description: 'Get all document tags in the repository',
				action: 'Get repository tags',
			},
			{
				name: 'Get Types',
				value: 'getTypes',
				description: 'Get all custom types defined in the repository',
				action: 'Get repository types',
			},
		],
		default: 'getInfo',
	},
];

export const repositoryFields: INodeProperties[] = [];

export async function executeRepositoryOperation(
	this: IExecuteFunctions,
	operation: string,
	itemIndex: number,
): Promise<INodeExecutionData[]> {
	const returnData: INodeExecutionData[] = [];

	switch (operation) {
		case 'getInfo': {
			const repository = await getRepository(this);
			returnData.push({
				json: {
					refs: repository.refs,
					bookmarks: repository.bookmarks,
					types: repository.types,
					languages: repository.languages,
					tags: repository.tags,
					version: repository.version,
					license: repository.license,
				},
				pairedItem: { item: itemIndex },
			});
			break;
		}

		case 'getMasterRef': {
			const masterRef = await getMasterRef(this);
			returnData.push({
				json: { ref: masterRef },
				pairedItem: { item: itemIndex },
			});
			break;
		}

		case 'getRefs': {
			const repository = await getRepository(this);
			returnData.push({
				json: { refs: repository.refs },
				pairedItem: { item: itemIndex },
			});
			break;
		}

		case 'getTags': {
			const repository = await getRepository(this);
			returnData.push({
				json: { tags: repository.tags },
				pairedItem: { item: itemIndex },
			});
			break;
		}

		case 'getTypes': {
			const repository = await getRepository(this);
			returnData.push({
				json: { types: repository.types },
				pairedItem: { item: itemIndex },
			});
			break;
		}

		case 'getLanguages': {
			const repository = await getRepository(this);
			returnData.push({
				json: { languages: repository.languages },
				pairedItem: { item: itemIndex },
			});
			break;
		}
	}

	return returnData;
}
