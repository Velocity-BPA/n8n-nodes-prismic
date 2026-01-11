/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
	IPollFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

import { searchDocuments, getMasterRef, getRepository } from './transport/prismicApi';
import type { IPrismicDocument } from './types/PrismicTypes';

// Log licensing notice once on node load
const LICENSING_NOTICE = `[Velocity BPA Licensing Notice]

This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).

Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.

For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.`;

let licenseNoticeLogged = false;

export class PrismicTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Prismic Trigger',
		name: 'prismicTrigger',
		icon: 'file:prismic.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Triggers when Prismic content changes',
		defaults: {
			name: 'Prismic Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'prismicApi',
				required: true,
			},
		],
		polling: true,
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'Any Document Change',
						value: 'anyChange',
						description: 'Trigger on any document change in the repository',
					},
					{
						name: 'Document Created',
						value: 'documentCreated',
						description: 'Trigger when a new document is published',
					},
					{
						name: 'Document Updated',
						value: 'documentUpdated',
						description: 'Trigger when an existing document is updated',
					},
					{
						name: 'Type Change',
						value: 'typeChange',
						description: 'Trigger when any document of a specific type changes',
					},
				],
				default: 'anyChange',
			},
			{
				displayName: 'Custom Type',
				name: 'customType',
				type: 'string',
				displayOptions: {
					show: {
						event: ['typeChange'],
					},
				},
				default: '',
				placeholder: 'blog_post',
				description: 'The API ID of the custom type to watch',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Include Document Data',
						name: 'includeDocumentData',
						type: 'boolean',
						default: true,
						description: 'Whether to include full document data in the trigger output',
					},
					{
						displayName: 'Language Filter',
						name: 'langFilter',
						type: 'string',
						default: '*',
						placeholder: 'en-us',
						description: 'Only trigger for documents in this language (use * for all)',
					},
					{
						displayName: 'Tag Filter',
						name: 'tagFilter',
						type: 'string',
						default: '',
						description: 'Only trigger for documents with this tag',
					},
				],
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		// Log licensing notice once
		if (!licenseNoticeLogged) {
			console.warn(LICENSING_NOTICE);
			licenseNoticeLogged = true;
		}

		const webhookData = this.getWorkflowStaticData('node');
		const event = this.getNodeParameter('event') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;

		const includeDocumentData = options.includeDocumentData !== false;
		const langFilter = (options.langFilter as string) || '*';
		const tagFilter = options.tagFilter as string;

		const returnData: INodeExecutionData[] = [];

		try {
			// Get current master ref to detect changes
			const currentRef = await getMasterRef(this);
			const previousRef = webhookData.lastRef as string | undefined;
			const lastPollTime = webhookData.lastPollTime as string | undefined;

			// Store current state for next poll
			webhookData.lastRef = currentRef;
			webhookData.lastPollTime = new Date().toISOString();

			// If this is the first run, just store the ref and return
			if (!previousRef) {
				return null;
			}

			// If ref hasn't changed, no updates
			if (currentRef === previousRef) {
				return null;
			}

			// Ref changed, fetch recently updated documents
			const requestOptions: IDataObject = {
				lang: langFilter,
				orderings: '[document.last_publication_date desc]',
				pageSize: 100,
			};

			const queries: string[] = [];

			// Add type filter if specified
			if (event === 'typeChange') {
				const customType = this.getNodeParameter('customType') as string;
				if (customType) {
					queries.push(`[[at(document.type, "${customType}")]]`);
				}
			}

			// Add tag filter if specified
			if (tagFilter) {
				queries.push(`[[at(document.tags, "${tagFilter}")]]`);
			}

			if (queries.length > 0) {
				requestOptions.q = queries;
			}

			const response = await searchDocuments(this, requestOptions);

			// Get previous document state
			const previousDocs = (webhookData.documentState as IDataObject) || {};
			const currentDocs: IDataObject = {};

			for (const doc of response.results as IPrismicDocument[]) {
				const docId = doc.id;
				currentDocs[docId] = doc.last_publication_date;

				const previousPubDate = previousDocs[docId] as string | undefined;
				const isNew = !previousPubDate;
				const isUpdated = !!(previousPubDate && previousPubDate !== doc.last_publication_date);

				// Check if document matches event criteria
				let shouldTrigger = false;

				switch (event) {
					case 'anyChange':
						shouldTrigger = isNew || isUpdated;
						break;
					case 'documentCreated':
						// Consider it "created" if first publication was after last poll
						if (lastPollTime && doc.first_publication_date > lastPollTime) {
							shouldTrigger = true;
						}
						break;
					case 'documentUpdated':
						shouldTrigger = isUpdated;
						break;
					case 'typeChange':
						shouldTrigger = isNew || isUpdated;
						break;
				}

				if (shouldTrigger) {
					if (includeDocumentData) {
						returnData.push({
							json: {
								event: isNew ? 'created' : 'updated',
								...doc,
							},
						});
					} else {
						returnData.push({
							json: {
								event: isNew ? 'created' : 'updated',
								id: doc.id,
								uid: doc.uid,
								type: doc.type,
								lang: doc.lang,
								first_publication_date: doc.first_publication_date,
								last_publication_date: doc.last_publication_date,
								tags: doc.tags,
							},
						});
					}
				}
			}

			// Update stored document state
			webhookData.documentState = currentDocs;

			if (returnData.length === 0) {
				return null;
			}

			return [returnData];
		} catch (error) {
			// On error, don't update state to retry on next poll
			throw error;
		}
	}
}
