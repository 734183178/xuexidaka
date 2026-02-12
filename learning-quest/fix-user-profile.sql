-- ============================================
-- 为现有用户创建 user_profile 的脚本
-- ============================================

-- 方案 1：为所有缺少 profile 的用户自动创建
INSERT INTO user_profiles (id, username, total_points)
SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1), '用户'),
    0
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 方案 2：为特定用户创建（替换 USER_ID）
-- INSERT INTO user_profiles (id, username, total_points)
-- VALUES ('6e57c960-77ca-4a9c-965a-e9a1d92fb193', '用户', 0)
-- ON CONFLICT (id) DO NOTHING;

-- 验证结果
SELECT
    u.id,
    u.email,
    u.created_at,
    CASE WHEN p.id IS NULL THEN '❌ 缺少 profile' ELSE '✅ 有 profile' END as status,
    p.username,
    p.total_points
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
