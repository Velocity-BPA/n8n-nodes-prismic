/*
 * Copyright (c) Velocity BPA, LLC
 * Licensed under the Business Source License 1.1
 * Commercial use requires a separate commercial license.
 * See LICENSE file for details.
 */

import { PrismicApi } from '../../credentials/PrismicApi.credentials';

describe('PrismicApi Credentials', () => {
	let credentials: PrismicApi;

	beforeEach(() => {
		credentials = new PrismicApi();
	});

	describe('credential properties', () => {
		it('should have correct name', () => {
			expect(credentials.name).toBe('prismicApi');
		});

		it('should have correct display name', () => {
			expect(credentials.displayName).toBe('Prismic API');
		});

		it('should have documentation URL', () => {
			expect(credentials.documentationUrl).toBe('https://prismic.io/docs/api');
		});
	});

	describe('properties configuration', () => {
		it('should have repositoryName property', () => {
			const repoNameProp = credentials.properties.find((p) => p.name === 'repositoryName');
			expect(repoNameProp).toBeDefined();
			expect(repoNameProp?.type).toBe('string');
			expect(repoNameProp?.required).toBe(true);
		});

		it('should have accessToken property', () => {
			const tokenProp = credentials.properties.find((p) => p.name === 'accessToken');
			expect(tokenProp).toBeDefined();
			expect(tokenProp?.type).toBe('string');
			expect(tokenProp?.typeOptions?.password).toBe(true);
		});

		it('should have usePreviewEndpoint property', () => {
			const previewProp = credentials.properties.find((p) => p.name === 'usePreviewEndpoint');
			expect(previewProp).toBeDefined();
			expect(previewProp?.type).toBe('boolean');
			expect(previewProp?.default).toBe(false);
		});
	});

	describe('authentication', () => {
		it('should use generic authentication type', () => {
			expect(credentials.authenticate.type).toBe('generic');
		});

		it('should pass access token as query parameter', () => {
			const properties = credentials.authenticate.properties as { qs: { access_token: string } };
			expect(properties.qs.access_token).toBe('={{$credentials.accessToken}}');
		});
	});

	describe('test request', () => {
		it('should have correct test request configuration', () => {
			expect(credentials.test.request.url).toBe('/api/v2');
			expect(credentials.test.request.method).toBe('GET');
		});

		it('should use CDN base URL for testing', () => {
			expect(credentials.test.request.baseURL).toBe('=https://{{$credentials.repositoryName}}.cdn.prismic.io');
		});
	});
});
