/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PrismicApi implements ICredentialType {
	name = 'prismicApi';
	displayName = 'Prismic API';
	documentationUrl = 'https://prismic.io/docs/api';
	properties: INodeProperties[] = [
		{
			displayName: 'Repository Name',
			name: 'repositoryName',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'my-repo',
			description: 'Your Prismic repository name (e.g., "my-repo" from my-repo.prismic.io)',
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			description: 'Access token for private repositories. Leave empty for public repositories.',
		},
		{
			displayName: 'Use Preview Endpoint',
			name: 'usePreviewEndpoint',
			type: 'boolean',
			default: false,
			description: 'Whether to use the preview endpoint instead of CDN (for unpublished content)',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			qs: {
				access_token: '={{$credentials.accessToken}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '=https://{{$credentials.repositoryName}}.cdn.prismic.io',
			url: '/api/v2',
			method: 'GET',
		},
	};
}
