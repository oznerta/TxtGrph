import { z } from 'zod';
import { sanitizeMermaidOutput } from '@txtgrph/core';

export const TOOL_DEFINITIONS = [
  {
    name: 'list_diagrams',
    description: 'List user active diagrams with optional folder filtering and limit.',
    inputSchema: {
      type: 'object',
      properties: {
        folder_id: { type: 'string', description: 'Optional folder UUID to filter diagrams.' },
        limit: { type: 'number', description: 'Maximum number of diagrams to return (default 50).' },
      },
    },
  },
  {
    name: 'get_diagram',
    description: 'Retrieve a single diagram by ID including Mermaid code and configuration.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Diagram UUID.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'create_diagram',
    description: 'Create a new Mermaid diagram. Supports placing inside a folder by folder_id or folder_name.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the diagram.' },
        code: { type: 'string', description: 'Mermaid syntax code string.' },
        folder_id: { type: 'string', description: 'Optional folder UUID.' },
        folder_name: { type: 'string', description: 'Optional folder name. If specified and folder_id is not provided, the folder will be found or automatically created.' },
        config: { type: 'object', description: 'Optional JSON config override.' },
      },
      required: ['title', 'code'],
    },
  },
  {
    name: 'update_diagram',
    description: 'Update an existing Mermaid diagram by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Diagram UUID.' },
        title: { type: 'string', description: 'Updated title.' },
        code: { type: 'string', description: 'Updated Mermaid syntax code.' },
        folder_id: { type: 'string', description: 'Updated folder UUID or null.' },
        folder_name: { type: 'string', description: 'Optional folder name to move diagram into. Will be found or created if needed.' },
        config: { type: 'object', description: 'Updated JSON config.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_diagram',
    description: 'Soft-delete a diagram by ID (move to trash).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Diagram UUID to delete.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_folders',
    description: 'List all active user folders.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_folder',
    description: 'Create a new diagram folder (or return existing if already present).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Name of the folder.' },
        parent_id: { type: 'string', description: 'Optional parent folder UUID for nested folders.' },
        parent_name: { type: 'string', description: 'Optional parent folder name for nested folders.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'render_mermaid_svg',
    description: 'Sanitize and validate a Mermaid diagram code string.',
    inputSchema: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Raw Mermaid diagram code.' },
      },
      required: ['code'],
    },
  },
] as const;

export interface SupabaseClientAdapter {
  from(table: string): any;
}

export async function handleMcpToolCall(
  toolName: string,
  args: any,
  supabase: SupabaseClientAdapter,
  userId: string
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (toolName) {
      case 'list_diagrams': {
        const limit = typeof args?.limit === 'number' ? Math.min(args.limit, 100) : 50;
        let query = supabase
          .from('diagrams')
          .select('id, title, folder_id, config, created_at, updated_at')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .order('updated_at', { ascending: false })
          .limit(limit);

        if (args?.folder_id) {
          query = query.eq('folder_id', args.folder_id);
        }

        const { data, error } = await query;
        if (error) throw new Error(error.message);

        return {
          content: [{ type: 'text', text: JSON.stringify(data || [], null, 2) }],
        };
      }

      case 'get_diagram': {
        if (!args?.id) throw new Error('Missing required param: id');
        const { data, error } = await supabase
          .from('diagrams')
          .select('id, title, code, config, folder_id, is_shared, share_token, created_at, updated_at')
          .eq('id', args.id)
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .single();

        if (error || !data) throw new Error('Diagram not found');

        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'create_diagram': {
        if (!args?.title || !args?.code) throw new Error('Missing required params: title, code');
        const sanitizedCode = sanitizeMermaidOutput(args.code);

        let targetFolderId = args.folder_id || null;

        // Auto-resolve or create folder by name if folder_id is not provided
        if (!targetFolderId && args.folder_name?.trim()) {
          const folderName = args.folder_name.trim();
          const { data: existingFolder } = await supabase
            .from('folders')
            .select('id')
            .eq('user_id', userId)
            .eq('name', folderName)
            .eq('is_deleted', false)
            .maybeSingle();

          if (existingFolder?.id) {
            targetFolderId = existingFolder.id;
          } else {
            const { data: newFolder } = await supabase
              .from('folders')
              .insert({
                user_id: userId,
                name: folderName,
                is_deleted: false,
              })
              .select('id')
              .single();

            if (newFolder?.id) {
              targetFolderId = newFolder.id;
            }
          }
        }

        const { data, error } = await supabase
          .from('diagrams')
          .insert({
            user_id: userId,
            title: args.title.trim(),
            code: sanitizedCode,
            folder_id: targetFolderId,
            config: args.config || {},
            is_deleted: false,
          })
          .select('id, title, code, config, folder_id, created_at, updated_at')
          .single();

        if (error) throw new Error(error.message);

        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'update_diagram': {
        if (!args?.id) throw new Error('Missing required param: id');
        const updatePayload: Record<string, any> = {};

        if (args.title) updatePayload.title = args.title.trim();
        if (args.code) updatePayload.code = sanitizeMermaidOutput(args.code);
        if (args.folder_id !== undefined) updatePayload.folder_id = args.folder_id;
        if (args.config) updatePayload.config = args.config;

        if (args.folder_name?.trim() && args.folder_id === undefined) {
          const folderName = args.folder_name.trim();
          const { data: existingFolder } = await supabase
            .from('folders')
            .select('id')
            .eq('user_id', userId)
            .eq('name', folderName)
            .eq('is_deleted', false)
            .maybeSingle();

          if (existingFolder?.id) {
            updatePayload.folder_id = existingFolder.id;
          } else {
            const { data: newFolder } = await supabase
              .from('folders')
              .insert({
                user_id: userId,
                name: folderName,
                is_deleted: false,
              })
              .select('id')
              .single();

            if (newFolder?.id) {
              updatePayload.folder_id = newFolder.id;
            }
          }
        }

        const { data, error } = await supabase
          .from('diagrams')
          .update(updatePayload)
          .eq('id', args.id)
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .select('id, title, code, config, folder_id, updated_at')
          .single();

        if (error || !data) throw new Error('Diagram not found or update failed');

        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'delete_diagram': {
        if (!args?.id) throw new Error('Missing required param: id');
        const { data, error } = await supabase
          .from('diagrams')
          .update({ is_deleted: true, deleted_at: new Date().toISOString() })
          .eq('id', args.id)
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .select('id')
          .single();

        if (error || !data) throw new Error('Diagram not found or already deleted');

        return {
          content: [{ type: 'text', text: JSON.stringify({ id: args.id, deleted: true }, null, 2) }],
        };
      }

      case 'list_folders': {
        const { data: directFolders, error } = await supabase
          .from('folders')
          .select('id, name, parent_id, created_at, updated_at, is_shared, organization_id')
          .eq('user_id', userId)
          .eq('is_deleted', false)
          .order('name', { ascending: true });

        let allFolders: any[] = directFolders || [];

        try {
          // Fetch folders shared with user
          const { data: sharedCollabs } = await supabase
            .from('folder_collaborators')
            .select('folder_id')
            .eq('user_id', userId);

          if (sharedCollabs && sharedCollabs.length > 0) {
            const sharedIds = sharedCollabs
              .map((sc: any) => sc.folder_id)
              .filter((id: string) => !allFolders.some((f) => f.id === id));

            if (sharedIds.length > 0) {
              const { data: sharedFolders } = await supabase
                .from('folders')
                .select('id, name, parent_id, created_at, updated_at, is_shared, organization_id')
                .in('id', sharedIds)
                .eq('is_deleted', false);

              if (sharedFolders) {
                allFolders = [...allFolders, ...sharedFolders];
              }
            }
          }

          // Fetch organization folders
          const { data: orgMemberships } = await supabase
            .from('organization_members')
            .select('organization_id')
            .eq('user_id', userId);

          if (orgMemberships && orgMemberships.length > 0) {
            const orgIds = orgMemberships.map((om: any) => om.organization_id);
            const { data: orgFolders } = await supabase
              .from('folders')
              .select('id, name, parent_id, created_at, updated_at, is_shared, organization_id')
              .in('organization_id', orgIds)
              .eq('is_deleted', false);

            if (orgFolders) {
              orgFolders.forEach((of: any) => {
                if (!allFolders.some((f) => f.id === of.id)) {
                  allFolders.push(of);
                }
              });
            }
          }
        } catch {
          // best-effort
        }

        if (error && allFolders.length === 0) throw new Error(error.message);

        return {
          content: [{ type: 'text', text: JSON.stringify(allFolders, null, 2) }],
        };
      }

      case 'create_folder': {
        if (!args?.name) throw new Error('Missing required param: name');
        const folderName = args.name.trim();
        let parentId = args.parent_id || null;

        // Resolve parent_name if supplied
        if (!parentId && args.parent_name?.trim()) {
          const { data: parentFolder } = await supabase
            .from('folders')
            .select('id')
            .eq('user_id', userId)
            .eq('name', args.parent_name.trim())
            .eq('is_deleted', false)
            .maybeSingle();

          if (parentFolder?.id) {
            parentId = parentFolder.id;
          }
        }

        // Check if folder already exists
        let checkQuery = supabase
          .from('folders')
          .select('id, name, parent_id, created_at, updated_at')
          .eq('user_id', userId)
          .eq('name', folderName)
          .eq('is_deleted', false);

        if (parentId) {
          checkQuery = checkQuery.eq('parent_id', parentId);
        } else {
          checkQuery = checkQuery.is('parent_id', null);
        }

        const { data: existing } = await checkQuery.maybeSingle();
        if (existing) {
          return {
            content: [{ type: 'text', text: JSON.stringify(existing, null, 2) }],
          };
        }

        const { data, error } = await supabase
          .from('folders')
          .insert({
            user_id: userId,
            name: folderName,
            parent_id: parentId,
            is_deleted: false,
          })
          .select('id, name, parent_id, created_at, updated_at')
          .single();

        if (error) throw new Error(error.message);

        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      }

      case 'render_mermaid_svg': {
        if (!args?.code) throw new Error('Missing required param: code');
        const sanitized = sanitizeMermaidOutput(args.code);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  valid: true,
                  sanitizedCode: sanitized,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        return {
          content: [{ type: 'text', text: `Unknown tool name: ${toolName}` }],
          isError: true,
        };
    }
  } catch (err: any) {
    return {
      content: [{ type: 'text', text: `Error executing ${toolName}: ${err?.message || err}` }],
      isError: true,
    };
  }
}
