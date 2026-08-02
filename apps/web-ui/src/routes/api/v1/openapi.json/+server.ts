import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const origin = url.origin;

  const openApiSpec = {
    openapi: '3.0.3',
    info: {
      title: 'TxtGrph MCP & REST API',
      description: 'Model Context Protocol (MCP) and REST API for TxtGrph - Visual Diagrams & Flowcharts for AI Platforms (Gemini, Claude, ChatGPT, Cursor).',
      version: '1.0.0',
      contact: {
        name: 'TxtGrph Support',
        url: origin
      }
    },
    servers: [
      {
        url: origin,
        description: 'TxtGrph Live Production Server'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'TXTGRPH Token',
          description: 'Enter your TxtGrph Personal Access Token (txtgrph_mcp_...)'
        }
      }
    },
    security: [
      {
        BearerAuth: []
      }
    ],
    paths: {
      '/api/v1/mcp': {
        post: {
          summary: 'Execute MCP Tool or JSON-RPC 2.0 method',
          description: 'Executes TxtGrph MCP tools (list_diagrams, get_diagram, create_diagram, update_diagram, delete_diagram, list_folders, create_folder, render_mermaid_svg).',
          operationId: 'executeMcpTool',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: 'MCP Tool Name' },
                    arguments: { type: 'object', description: 'Tool input arguments' }
                  }
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Successful MCP Execution',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      data: { type: 'object' }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/v1/diagrams': {
        get: {
          summary: 'List user diagrams',
          operationId: 'listDiagrams',
          parameters: [
            {
              name: 'folder_id',
              in: 'query',
              required: false,
              schema: { type: 'string' },
              description: 'Filter by folder UUID'
            }
          ],
          responses: {
            '200': { description: 'Array of diagram records' },
            '401': { description: 'Unauthorized' }
          }
        },
        post: {
          summary: 'Create a new diagram',
          operationId: 'createDiagram',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['title', 'code'],
                  properties: {
                    title: { type: 'string' },
                    code: { type: 'string', description: 'Mermaid code' },
                    folder_id: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Created diagram object' },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/v1/diagrams/{id}': {
        get: {
          summary: 'Get diagram by ID',
          operationId: 'getDiagram',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Diagram object' },
            '404': { description: 'Diagram not found' }
          }
        },
        put: {
          summary: 'Update diagram by ID',
          operationId: 'updateDiagram',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    code: { type: 'string' },
                    folder_id: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Updated diagram object' }
          }
        },
        delete: {
          summary: 'Delete diagram by ID',
          operationId: 'deleteDiagram',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
          ],
          responses: {
            '200': { description: 'Deleted success payload' }
          }
        }
      },
      '/api/v1/folders': {
        get: {
          summary: 'List user folders',
          operationId: 'listFolders',
          responses: {
            '200': { description: 'Array of folder objects' }
          }
        },
        post: {
          summary: 'Create a new folder',
          operationId: 'createFolder',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name'],
                  properties: {
                    name: { type: 'string' },
                    parent_id: { type: 'string' }
                  }
                }
              }
            }
          },
          responses: {
            '200': { description: 'Created folder object' }
          }
        }
      }
    }
  };

  return json(openApiSpec, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'max-age=3600'
    }
  });
};
