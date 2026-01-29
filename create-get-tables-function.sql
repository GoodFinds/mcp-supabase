-- 创建用于列出所有表的 RPC 函数
-- 在 Supabase Dashboard 的 SQL Editor 中执行此脚本

CREATE OR REPLACE FUNCTION get_tables()
RETURNS TABLE(table_name text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT tablename::text
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY tablename;
END;
$$;

-- 授予执行权限（如果需要）
GRANT EXECUTE ON FUNCTION get_tables() TO anon, authenticated;
