#!/usr/bin/env node

/**
 * Supabase MCP Server
 * 允许通过自然语言操作 Supabase 数据库
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase 客户端
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)'
    );
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// 定义工具列表
const tools: Tool[] = [
  {
    name: 'supabase_query',
    description:
      '查询 Supabase 数据库表。支持过滤、排序、分页等操作。可以查询单个表或多个表（使用 join）。',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: '要查询的表名',
        },
        select: {
          type: 'string',
          description: '要选择的列，用逗号分隔。默认为 *（所有列）',
          default: '*',
        },
        filters: {
          type: 'object',
          description: '过滤条件，例如 { column: "name", operator: "eq", value: "John" }',
          additionalProperties: true,
        },
        orderBy: {
          type: 'string',
          description: '排序字段，例如 "created_at.desc"',
        },
        limit: {
          type: 'number',
          description: '返回结果的最大数量',
          default: 100,
        },
        offset: {
          type: 'number',
          description: '跳过的记录数（用于分页）',
          default: 0,
        },
      },
      required: ['table'],
    },
  },
  {
    name: 'supabase_insert',
    description: '向 Supabase 数据库表插入新记录。可以插入单条或多条记录。',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: '要插入数据的表名',
        },
        data: {
          type: 'object',
          description: '要插入的数据对象（单条记录）或数组（多条记录）',
        },
      },
      required: ['table', 'data'],
    },
  },
  {
    name: 'supabase_update',
    description: '更新 Supabase 数据库表中的记录。支持批量更新。',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: '要更新的表名',
        },
        filters: {
          type: 'object',
          description: '过滤条件，用于确定要更新哪些记录',
          additionalProperties: true,
        },
        data: {
          type: 'object',
          description: '要更新的字段和值',
        },
      },
      required: ['table', 'filters', 'data'],
    },
  },
  {
    name: 'supabase_delete',
    description: '从 Supabase 数据库表中删除记录。',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: '要删除数据的表名',
        },
        filters: {
          type: 'object',
          description: '过滤条件，用于确定要删除哪些记录',
          additionalProperties: true,
        },
      },
      required: ['table', 'filters'],
    },
  },
  {
    name: 'supabase_rpc',
    description: '调用 Supabase 数据库的 RPC（远程过程调用）函数。',
    inputSchema: {
      type: 'object',
      properties: {
        functionName: {
          type: 'string',
          description: '要调用的 RPC 函数名',
        },
        params: {
          type: 'object',
          description: '传递给 RPC 函数的参数',
          additionalProperties: true,
        },
      },
      required: ['functionName'],
    },
  },
  {
    name: 'supabase_list_tables',
    description: '列出 Supabase 数据库中的所有表。',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'supabase_get_table_schema',
    description: '获取指定表的结构信息（列名、类型等）。',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: '要查询的表名',
        },
      },
      required: ['table'],
    },
  },
];

// 创建 MCP 服务器
const server = new Server(
  {
    name: 'supabase-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 列出所有可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools,
  };
});

// 处理工具调用
server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  try {
    const supabase = getSupabaseClient();

    switch (name) {
      case 'supabase_query': {
        const { table, select = '*', filters, orderBy, limit = 100, offset = 0 } = args as any;
        let query = supabase.from(table).select(select);

        // 应用过滤条件
        if (filters) {
          for (const [column, condition] of Object.entries(filters)) {
            if (typeof condition === 'object' && condition !== null) {
              const { operator, value } = condition as any;
              switch (operator) {
                case 'eq':
                  query = query.eq(column, value);
                  break;
                case 'neq':
                  query = query.neq(column, value);
                  break;
                case 'gt':
                  query = query.gt(column, value);
                  break;
                case 'gte':
                  query = query.gte(column, value);
                  break;
                case 'lt':
                  query = query.lt(column, value);
                  break;
                case 'lte':
                  query = query.lte(column, value);
                  break;
                case 'like':
                  query = query.like(column, value);
                  break;
                case 'ilike':
                  query = query.ilike(column, value);
                  break;
                case 'in':
                  query = query.in(column, value);
                  break;
                case 'is':
                  query = query.is(column, value);
                  break;
                default:
                  query = query.eq(column, value);
              }
            } else {
              query = query.eq(column, condition);
            }
          }
        }

        // 应用排序
        if (orderBy) {
          const [column, direction] = orderBy.split('.');
          query = query.order(column, { ascending: direction !== 'desc' });
        }

        // 应用分页
        query = query.range(offset, offset + limit - 1);

        const { data, error } = await query;

        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: error.message, details: error }, null, 2),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ data, count: data?.length || 0 }, null, 2),
            },
          ],
        };
      }

      case 'supabase_insert': {
        const { table, data } = args as any;
        const { data: result, error } = await supabase.from(table).insert(data).select();

        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: error.message, details: error }, null, 2),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { success: true, data: result, insertedCount: Array.isArray(data) ? data.length : 1 },
                null,
                2
              ),
            },
          ],
        };
      }

      case 'supabase_update': {
        const { table, filters, data } = args as any;
        let query = supabase.from(table).update(data);

        // 应用过滤条件
        if (filters) {
          for (const [column, condition] of Object.entries(filters)) {
            if (typeof condition === 'object' && condition !== null) {
              const { operator, value } = condition as any;
              switch (operator) {
                case 'eq':
                  query = query.eq(column, value);
                  break;
                case 'neq':
                  query = query.neq(column, value);
                  break;
                case 'gt':
                  query = query.gt(column, value);
                  break;
                case 'gte':
                  query = query.gte(column, value);
                  break;
                case 'lt':
                  query = query.lt(column, value);
                  break;
                case 'lte':
                  query = query.lte(column, value);
                  break;
                case 'in':
                  query = query.in(column, value);
                  break;
                default:
                  query = query.eq(column, value);
              }
            } else {
              query = query.eq(column, condition);
            }
          }
        }

        const { data: result, error } = await query.select();

        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: error.message, details: error }, null, 2),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data: result, updatedCount: result?.length || 0 }, null, 2),
            },
          ],
        };
      }

      case 'supabase_delete': {
        const { table, filters } = args as any;
        let query = supabase.from(table).delete();

        // 应用过滤条件
        if (filters) {
          for (const [column, condition] of Object.entries(filters)) {
            if (typeof condition === 'object' && condition !== null) {
              const { operator, value } = condition as any;
              switch (operator) {
                case 'eq':
                  query = query.eq(column, value);
                  break;
                case 'neq':
                  query = query.neq(column, value);
                  break;
                case 'gt':
                  query = query.gt(column, value);
                  break;
                case 'gte':
                  query = query.gte(column, value);
                  break;
                case 'lt':
                  query = query.lt(column, value);
                  break;
                case 'lte':
                  query = query.lte(column, value);
                  break;
                case 'in':
                  query = query.in(column, value);
                  break;
                default:
                  query = query.eq(column, value);
              }
            } else {
              query = query.eq(column, condition);
            }
          }
        }

        const { data: result, error } = await query.select();

        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: error.message, details: error }, null, 2),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data: result, deletedCount: result?.length || 0 }, null, 2),
            },
          ],
        };
      }

      case 'supabase_rpc': {
        const { functionName, params = {} } = args as any;
        const { data, error } = await supabase.rpc(functionName, params);

        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ error: error.message, details: error }, null, 2),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, data }, null, 2),
            },
          ],
        };
      }

      case 'supabase_list_tables': {
        let tables: string[] = [];
        let error: any = null;

        // 方法1: 尝试使用 RPC 函数 get_tables（如果存在）
        try {
          const { data: rpcData, error: rpcError } = await supabase.rpc('get_tables', {});
          if (!rpcError && rpcData) {
            tables = Array.isArray(rpcData) 
              ? rpcData.map((row: any) => row.table_name || row.tablename || row) 
              : [];
          }
        } catch (e) {
          // RPC 函数可能不存在，继续尝试其他方法
        }

        // 方法2: 如果 RPC 失败，使用 REST API 获取 OpenAPI schema 来提取表列表
        if (tables.length === 0) {
          try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
            
            if (supabaseUrl && supabaseKey) {
              // 获取 OpenAPI schema
              const response = await fetch(`${supabaseUrl}/rest/v1/`, {
                headers: {
                  'apikey': supabaseKey,
                  'Authorization': `Bearer ${supabaseKey}`,
                  'Accept': 'application/json',
                },
              });

              if (response.ok) {
                const schema = await response.json() as any;
                // 从 paths 中提取表名（排除 RPC 函数和特殊路径）
                if (schema && schema.paths) {
                  tables = Object.keys(schema.paths)
                    .filter((path: string) => path.startsWith('/') && path !== '/')
                    .map((path: string) => path.substring(1))
                    .filter((table: string) => 
                      !table.includes('{') && 
                      !table.includes('}') && 
                      !table.startsWith('rpc/')
                    )
                    .sort();
                }
              } else {
                error = new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
            }
          } catch (e: any) {
            error = e;
          }
        }

        // 方法3: 如果以上都失败，尝试直接查询 information_schema（通常不会成功）
        if (tables.length === 0 && !error) {
          const { data: schemaData, error: schemaError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public');

          if (!schemaError && schemaData) {
            tables = schemaData.map((row: any) => row.table_name);
          } else {
            error = schemaError;
          }
        }

        // 如果仍然没有表，返回错误和创建 RPC 函数的说明
        if (tables.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: error?.message || '无法获取表列表',
                  note: '无法通过 REST API 或 information_schema 获取表列表。\n\n解决方案：\n1. 在 Supabase Dashboard 的 SQL Editor 中执行以下 SQL 创建 RPC 函数：\n\nCREATE OR REPLACE FUNCTION get_tables()\nRETURNS TABLE(table_name text) AS $$\nBEGIN\n  RETURN QUERY\n  SELECT tablename::text\n  FROM pg_tables\n  WHERE schemaname = \'public\'\n  ORDER BY tablename;\nEND;\n$$ LANGUAGE plpgsql SECURITY DEFINER;\n\n2. 或者直接在 Supabase Dashboard 中查看表列表。',
                  tables: [],
                  count: 0,
                }, null, 2),
              },
            ],
            isError: false, // 不标记为错误，因为提供了解决方案
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ tables, count: tables.length }, null, 2),
            },
          ],
        };
      }

      case 'supabase_get_table_schema': {
        const { table } = args as any;
        // 查询表结构
        const { data, error } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_schema', 'public')
          .eq('table_name', table);

        if (error) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: error.message,
                  note: '无法直接查询 information_schema，请使用 Supabase Dashboard 查看表结构',
                }),
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ table, schema: data }, null, 2),
            },
          ],
        };
      }

      default:
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${name}`,
            },
          ],
          isError: true,
        };
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error.message || 'Unknown error',
              stack: error.stack,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Supabase MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});

