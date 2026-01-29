# Supabase MCP Server

这是一个 Model Context Protocol (MCP) 服务器，允许你通过自然语言与 Supabase 数据库进行交互。

## 功能特性

- ✅ **查询数据** (`supabase_query`) - 支持过滤、排序、分页
- ✅ **插入数据** (`supabase_insert`) - 支持单条或多条记录
- ✅ **更新数据** (`supabase_update`) - 支持批量更新
- ✅ **删除数据** (`supabase_delete`) - 支持条件删除
- ✅ **RPC 调用** (`supabase_rpc`) - 调用数据库函数
- ✅ **列出表** (`supabase_list_tables`) - 查看所有表（通过 REST API）
- ✅ **获取表结构** (`supabase_get_table_schema`) - 查看表结构信息

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 构建项目

```bash
npm run build
```

### 3. 配置 Cursor

在项目根目录创建 `.cursor/mcp.json`（参考 `mcp-config.example.json`）：

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["你的绝对路径/dist/server.js"],
      "env": {
        "NEXT_PUBLIC_SUPABASE_URL": "你的项目URL",
        "SUPABASE_SECRET_KEY": "你的Service Role Key"
      }
    }
  }
}
```

**获取配置信息：**
1. 打开 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. Settings → API
4. 复制 **Service Role Key**（secret key）
5. 复制 **Project URL**

### 4. 重启 Cursor

完全关闭并重新打开 Cursor。

### 5. 测试

在 Cursor 中输入：

```
列出数据库中的所有表
```

## 开发

```bash
# 开发模式（使用 tsx）
npm run dev

# 构建
npm run build

# 运行构建后的文件
npm start
```

## 项目结构

```
mcp-supabase/
├── src/
│   └── server.ts          # MCP 服务器主文件
├── dist/                  # 编译后的文件（运行 npm run build 后生成）
├── .cursor/
│   └── mcp.json          # MCP 配置文件（不提交到 git）
├── create-get-tables-function.sql  # 可选的 RPC 函数创建脚本
├── package.json           # 项目依赖配置
├── tsconfig.json          # TypeScript 配置
└── README.md             # 本文档
```

## 技术栈

- **TypeScript** - 类型安全
- **@modelcontextprotocol/sdk** - MCP 协议实现
- **@supabase/supabase-js** - Supabase 客户端

## 配置要求

- **环境变量**：
  - `NEXT_PUBLIC_SUPABASE_URL` 或 `SUPABASE_URL`
  - `SUPABASE_SECRET_KEY` 或 `SUPABASE_SERVICE_ROLE_KEY`

- **权限**：需要 Service Role Key（完全访问权限）

## 安全注意事项

⚠️ **重要**：此 MCP 服务器使用 Service Role Key，具有完全访问权限。请确保：

1. **不要提交 Service Role Key 到 Git**
   - Service Role Key 具有完全访问权限
   - `.cursor/mcp.json` 已在 `.gitignore` 中
   - 使用 `mcp-config.example.json` 作为模板

2. **仅在受信任的环境中使用**
   - Service Role Key 应该只在后端使用
   - 不要在前端代码中暴露

## 表列表功能

`supabase_list_tables` 工具使用三层回退策略：

1. **方法1**：尝试使用 RPC 函数 `get_tables()`（如果存在）
2. **方法2**：通过 REST API 获取 OpenAPI schema 提取表列表（推荐）
3. **方法3**：回退到查询 `information_schema`（通常不可用）

如需使用 RPC 函数方法，可以在 Supabase Dashboard 的 SQL Editor 中执行 `create-get-tables-function.sql`。

## 许可证

MIT
