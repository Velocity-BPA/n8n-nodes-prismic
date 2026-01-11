# n8n-nodes-prismic

> [Velocity BPA Licensing Notice]
>
> This n8n node is licensed under the Business Source License 1.1 (BSL 1.1).
>
> Use of this node by for-profit organizations in production environments requires a commercial license from Velocity BPA.
>
> For licensing information, visit https://velobpa.com/licensing or contact licensing@velobpa.com.

This n8n community node integrates Prismic's headless CMS capabilities into n8n workflows, enabling content teams and developers to automate content retrieval, querying, and management. It provides full access to Prismic's Content API for fetching documents, searching content by type, filtering with predicates, and managing multi-language content across repositories.

![n8n](https://img.shields.io/badge/n8n-community--node-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![License](https://img.shields.io/badge/license-BSL--1.1-blue)

## Features

- **Complete Document Management**: Retrieve, search, and filter documents with powerful predicate queries
- **Multi-Language Support**: Full internationalization with language-aware content retrieval
- **Slice Extraction**: Extract and process Slice Machine components from documents
- **Release Management**: Access scheduled releases and preview content versions
- **Trigger Node**: Poll for content changes with configurable event filters
- **Automatic Pagination**: Handle large result sets with built-in pagination support
- **CDN and Preview Endpoints**: Switch between cached CDN and live preview endpoints

## Installation

### Community Nodes (Recommended)

1. Open n8n
2. Go to **Settings** > **Community Nodes**
3. Click **Install a community node**
4. Enter `n8n-nodes-prismic`
5. Click **Install**

### Manual Installation

```bash
# Navigate to your n8n installation directory
cd ~/.n8n

# Install the node
npm install n8n-nodes-prismic
```

### Development Installation

```bash
# Clone the repository
git clone https://github.com/Velocity-BPA/n8n-nodes-prismic.git
cd n8n-nodes-prismic

# Install dependencies
npm install

# Build the project
npm run build

# Create symlink to n8n custom nodes directory
mkdir -p ~/.n8n/custom
ln -s $(pwd) ~/.n8n/custom/n8n-nodes-prismic

# Restart n8n
n8n start
```

## Credentials Setup

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| Repository Name | string | Yes | Your Prismic repository name (e.g., "my-repo" from my-repo.prismic.io) |
| Access Token | string | No | Access token for private repositories |
| Use Preview Endpoint | boolean | No | Use preview endpoint instead of CDN (default: false) |

### Obtaining an Access Token

1. Navigate to your Prismic repository dashboard
2. Go to **Settings** > **API & Security**
3. Under "Generate an Access Token", create a new permanent token
4. Copy the token immediately (it won't be shown again)

## Resources & Operations

### Repository

| Operation | Description |
|-----------|-------------|
| Get Info | Get repository metadata including refs, types, tags, and languages |
| Get Master Ref | Get the current master ref for querying published content |
| Get Refs | List all available refs (master, releases, scheduled) |
| Get Tags | Get all document tags in the repository |
| Get Types | Get all custom types defined in the repository |
| Get Languages | Get all configured locales/languages |

### Document

| Operation | Description |
|-----------|-------------|
| Get | Get a single document by ID |
| Get By UID | Get a document by its UID within a custom type |
| Get All | Get all documents with optional filtering |
| Get By Type | Get all documents of a specific custom type |
| Get By Tag | Get all documents with a specific tag |
| Get By IDs | Get multiple documents by their IDs |
| Get Single | Get the singleton document of a custom type |
| Search | Search documents with predicate queries |
| Get Similar | Get documents similar to a specified document |

### Custom Type

| Operation | Description |
|-----------|-------------|
| Get All | List all custom types in the repository |
| Get Documents | Get all documents of this custom type |
| Get By UID | Get a document by UID within this type |
| Get Singleton | Get the singleton instance of this type |
| Count | Count documents of this custom type |

### Tag

| Operation | Description |
|-----------|-------------|
| Get All | List all tags in the repository |
| Get Documents | Get all documents with a specific tag |
| Count | Count documents with a specific tag |

### Language

| Operation | Description |
|-----------|-------------|
| Get All | List all configured languages/locales |
| Get Documents | Get all documents in a specific language |
| Get Master Language | Get the master language configuration |

### Release

| Operation | Description |
|-----------|-------------|
| Get All | List all releases (scheduled content versions) |
| Get | Get a specific release by ID |
| Get Ref | Get the ref for querying release content |
| Get Documents | Get documents in a specific release |

### Slice

| Operation | Description |
|-----------|-------------|
| Get By Document | Get all slices from a specific document |
| Get By Type | Get slices filtered by slice type |
| Extract Slices | Extract and flatten slices from document data |

### Asset (Integration Fields)

| Operation | Description |
|-----------|-------------|
| Get Integration Fields Ref | Get the ref for integration fields data |
| Query | Query integration field data from external sources |

## Trigger Node

The Prismic Trigger node polls for content changes in your repository.

### Events

| Event | Description |
|-------|-------------|
| Any Document Change | Trigger on any document change in the repository |
| Document Created | Trigger when a new document is published |
| Document Updated | Trigger when an existing document is updated |
| Type Change | Trigger when documents of a specific type change |

### Filters

- **Language**: Filter changes by language code
- **Tag**: Filter changes by document tag
- **Custom Type**: Filter changes by custom type

## Usage Examples

### Fetch All Blog Posts

```json
{
  "resource": "document",
  "operation": "getByType",
  "customType": "blog_post",
  "returnAll": true,
  "lang": "en-us"
}
```

### Search Documents with Predicates

```json
{
  "resource": "document",
  "operation": "search",
  "predicateType": "fulltext",
  "searchValue": "marketing strategy",
  "lang": "*"
}
```

### Get Document by UID

```json
{
  "resource": "document",
  "operation": "getByUid",
  "customType": "page",
  "uid": "about-us"
}
```

### Extract Slices from Document

```json
{
  "resource": "slice",
  "operation": "getByDocument",
  "documentId": "XxxxxxXXXXxXXXxXx",
  "sliceZone": "body"
}
```

## Prismic Concepts

### Refs

Prismic uses refs to version content. The master ref points to the currently published content, while release refs point to scheduled or draft content versions.

### Custom Types

Custom types define the structure of your content. Each document belongs to a custom type that determines its fields and schema.

### Slices

Slices are reusable content components created with Slice Machine. Documents can contain slice zones with multiple slices of different types.

### Predicates

Prismic uses predicate queries for filtering:
- `at`: Exact match on a field
- `any`: Match any value in a list
- `fulltext`: Full-text search
- `similar`: Find similar documents

### Languages

Prismic supports multi-language content with language codes (e.g., "en-us", "fr-fr"). Use `*` to query all languages.

## Error Handling

The node handles common Prismic API errors:

| Error | Description |
|-------|-------------|
| 400 Bad Request | Invalid query parameters or malformed predicate |
| 401 Unauthorized | Missing or invalid access token for private repository |
| 403 Forbidden | Access token lacks required permissions |
| 404 Not Found | Repository, document, or custom type not found |
| 429 Too Many Requests | Rate limit exceeded (200 req/sec) |

Errors are returned with descriptive messages to help troubleshoot issues.

## Security Best Practices

1. **Use environment variables** for storing access tokens
2. **Enable private API** for sensitive content repositories
3. **Use read-only tokens** when possible
4. **Rotate tokens** regularly
5. **Monitor API usage** to stay within rate limits

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Watch mode for development
npm run dev
```

## Author

**Velocity BPA**
- Website: [velobpa.com](https://velobpa.com)
- GitHub: [Velocity-BPA](https://github.com/Velocity-BPA)

## Licensing

This n8n community node is licensed under the **Business Source License 1.1**.

### Free Use
Permitted for personal, educational, research, and internal business use.

### Commercial Use
Use of this node within any SaaS, PaaS, hosted platform, managed service,
or paid automation offering requires a commercial license.

For licensing inquiries:
**licensing@velobpa.com**

See [LICENSE](LICENSE), [COMMERCIAL_LICENSE.md](COMMERCIAL_LICENSE.md), and [LICENSING_FAQ.md](LICENSING_FAQ.md) for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Issues**: [GitHub Issues](https://github.com/Velocity-BPA/n8n-nodes-prismic/issues)
- **Documentation**: [Prismic API Docs](https://prismic.io/docs/api)
- **n8n Community**: [n8n Community Forum](https://community.n8n.io)

## Acknowledgments

- [Prismic](https://prismic.io) for the excellent headless CMS platform
- [n8n](https://n8n.io) for the powerful workflow automation platform
- The open-source community for inspiration and contributions
