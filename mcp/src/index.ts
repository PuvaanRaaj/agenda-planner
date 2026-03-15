import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { ApiClient } from './api-client.js';

const api = new ApiClient();

/**
 * Register a tool. Catches all errors and surfaces them as MCP error responses
 * so Claude sees the error message rather than a silent failure.
 */
function registerTool<T extends z.ZodRawShape>(
  server: McpServer,
  name: string,
  schema: T,
  handler: (args: z.infer<z.ZodObject<T>>) => Promise<unknown>,
): void {
  server.tool(name, schema, async (args) => {
    try {
      const result = await handler(args as z.infer<z.ZodObject<T>>);
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });
}

async function main() {
  // Await initial token exchange BEFORE connecting the transport.
  // No tool calls are accepted until this completes.
  await api.init();

  const server = new McpServer({
    name: 'agenda-planner',
    version: '1.0.0',
  });

  // ── Agendas ────────────────────────────────────────────────────────────

  registerTool(server, 'list_agendas', {}, async () =>
    api.get('/agendas'),
  );

  registerTool(
    server,
    'create_agenda',
    {
      title: z.string().describe('Agenda title'),
      description: z.string().optional().describe('Optional description'),
      visibility: z
        .enum(['private', 'restricted', 'public'])
        .optional()
        .default('private')
        .describe('Visibility: private | restricted | public'),
    },
    async ({ title, description, visibility }) =>
      api.post('/agendas', { title, description, visibility }),
  );

  registerTool(
    server,
    'get_agenda',
    {
      agenda_id: z.string().describe('Agenda ID'),
    },
    async ({ agenda_id }) => api.get(`/agendas/${agenda_id}`),
  );

  // ── Items ──────────────────────────────────────────────────────────────

  registerTool(
    server,
    'create_item',
    {
      agenda_id: z.string().describe('Agenda ID'),
      title: z.string().describe('Item title'),
      date: z.string().describe('Date in YYYY-MM-DD format'),
      start_time: z.string().describe('Start time in HH:MM format'),
      end_time: z.string().optional().describe('End time in HH:MM format'),
      location: z.string().optional().describe('Location'),
      description: z.string().optional().describe('Description'),
    },
    async ({ agenda_id, title, date, start_time, end_time, location, description }) =>
      api.post(`/agendas/${agenda_id}/items`, {
        title,
        date,
        start_time,
        end_time,
        location,
        description,
      }),
  );

  registerTool(
    server,
    'update_item',
    {
      agenda_id: z.string().describe('Agenda ID'),
      item_id: z.string().describe('Item ID'),
      title: z.string().optional().describe('New title'),
      date: z.string().optional().describe('New date in YYYY-MM-DD format'),
      start_time: z.string().optional().describe('New start time in HH:MM format'),
      end_time: z.string().optional().describe('New end time in HH:MM format'),
      location: z.string().optional().describe('New location'),
      description: z.string().optional().describe('New description'),
    },
    async ({ agenda_id, item_id, title, date, start_time, end_time, location, description }) =>
      api.patch(`/agendas/${agenda_id}/items/${item_id}`, {
        title,
        date,
        start_time,
        end_time,
        location,
        description,
      }),
  );

  registerTool(
    server,
    'delete_item',
    {
      agenda_id: z.string().describe('Agenda ID'),
      item_id: z.string().describe('Item ID'),
    },
    async ({ agenda_id, item_id }) => {
      await api.del(`/agendas/${agenda_id}/items/${item_id}`);
      return { success: true };
    },
  );

  // ── Comments ───────────────────────────────────────────────────────────

  registerTool(
    server,
    'list_comments',
    {
      item_id: z.string().describe('Item ID'),
    },
    async ({ item_id }) => api.get(`/items/${item_id}/comments`),
  );

  registerTool(
    server,
    'create_comment',
    {
      item_id: z.string().describe('Item ID'),
      body: z.string().describe('Comment text'),
    },
    async ({ item_id, body }) =>
      api.post(`/items/${item_id}/comments`, { body }),
  );

  registerTool(
    server,
    'delete_comment',
    {
      comment_id: z.string().describe('Comment ID'),
    },
    async ({ comment_id }) => {
      await api.del(`/comments/${comment_id}`);
      return { success: true };
    },
  );

  // ── Connect ────────────────────────────────────────────────────────────

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
