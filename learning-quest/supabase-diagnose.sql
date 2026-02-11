-- ============================================
-- Supabase 数据库诊断脚本
-- 用于排查数据加载问题
-- ============================================

-- 1. 检查表是否存在
SELECT
    table_name,
    case when exists (select 1 from information_schema.columns where table_name = t.table_name)
        then '✓ 存在'
        else '✗ 不存在'
    end as status
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'tasks', 'completion_records', 'rewards', 'redemption_records')
ORDER BY table_name;

-- 2. 检查用户表
SELECT
    id,
    email,
    created_at,
    confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- 3. 检查 user_profiles 表
SELECT
    id,
    username,
    total_points,
    created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 5;

-- 4. 检查是否存在孤儿用户（有 auth 用户但没有 profile）
SELECT
    u.id,
    u.email,
    u.created_at,
    CASE WHEN p.id IS NULL THEN '⚠️ 缺少 profile' ELSE '✓ 有 profile' END as profile_status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 5;

-- 5. 检查 RLS 策略状态
SELECT
    tablename,
    CASE WHEN rowsecurity = true THEN '✓ 已启用' ELSE '✗ 未启用' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'tasks', 'completion_records', 'rewards', 'redemption_records');

-- 6. 检查策略详情
SELECT
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE tablename IN ('user_profiles', 'tasks', 'completion_records', 'rewards', 'redemption_records')
ORDER BY tablename, cmd;

-- 7. 检查触发器
SELECT
    trigger_name,
    event_object_table,
    event_manipulation
FROM information_schema.triggers
WHERE event_object_table IN ('completion_records', 'redemption_records');

-- 8. 测试：为当前认证用户创建 profile（如果不存在）
-- 注意：这需要用户已登录，执行前请先替换 USER_ID 为实际的 user ID
-- INSERT INTO user_profiles (id, username, total_points)
-- VALUES ('USER_ID', '用户', 0)
-- ON CONFLICT (id) DO NOTHING;
