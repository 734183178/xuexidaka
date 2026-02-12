-- ===========================================
-- 会员兑换码系统 SQL 脚本
-- 在 Supabase 控制台的 SQL Editor 中执行此脚本
-- ===========================================

-- 1. 启用 UUID 扩展（如果未启用）
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 创建兑换码表
CREATE TABLE IF NOT EXISTS redemption_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,                    -- 兑换码：VIP-A8X2-K9M3 格式
  code_type TEXT CHECK (code_type IN ('year', 'permanent')) NOT NULL, -- 类型：年费/永久
  is_used BOOLEAN DEFAULT FALSE,                -- 是否已使用
  used_by UUID REFERENCES auth.users,           -- 使用者ID
  used_at TIMESTAMP WITH TIME ZONE,             -- 使用时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 创建用户订阅表
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE, -- 一个用户只有一条记录
  trial_started_at TIMESTAMP WITH TIME ZONE,          -- 试用开始时间
  trial_expires_at TIMESTAMP WITH TIME ZONE,          -- 试用结束时间
  subscription_type TEXT CHECK (subscription_type IN ('trial', 'year', 'permanent')) DEFAULT 'trial',
  subscription_started_at TIMESTAMP WITH TIME ZONE,   -- 订阅开始时间
  subscription_expires_at TIMESTAMP WITH TIME ZONE,   -- 订阅结束时间
  redemption_code_id UUID REFERENCES redemption_codes, -- 使用的兑换码
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_redemption_codes_code ON redemption_codes(code);
CREATE INDEX IF NOT EXISTS idx_redemption_codes_used_by ON redemption_codes(used_by);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);

-- 5. 启用 RLS
ALTER TABLE redemption_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. 删除已存在的策略（如果存在）
DROP POLICY IF EXISTS "Users can view own redemption codes" ON redemption_codes;
DROP POLICY IF EXISTS "Users can view own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON user_subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON user_subscriptions;

-- 7. RLS 策略 - redemption_codes
-- 用户可以查看自己使用的兑换码
CREATE POLICY "Users can view own redemption codes"
  ON redemption_codes FOR SELECT
  USING (auth.uid() = used_by);

-- 8. RLS 策略 - user_subscriptions
CREATE POLICY "Users can view own subscription"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscription"
  ON user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscription"
  ON user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- 9. 触发器：新用户注册时自动创建订阅记录（含1天试用）
CREATE OR REPLACE FUNCTION create_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_subscriptions (user_id, trial_started_at, trial_expires_at, subscription_type)
  VALUES (
    NEW.id,
    NOW(),
    NOW() + INTERVAL '1 day',
    'trial'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 在 user_profiles 表上创建触发器
DROP TRIGGER IF EXISTS trigger_create_subscription_on_profile ON user_profiles;
CREATE TRIGGER trigger_create_subscription_on_profile
AFTER INSERT ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION create_user_subscription();

-- 10. 触发器：更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_subscriptions_updated_at ON user_subscriptions;
CREATE TRIGGER trigger_update_user_subscriptions_updated_at
BEFORE UPDATE ON user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 11. 辅助函数：检查用户是否有有效订阅
CREATE OR REPLACE FUNCTION check_user_subscription(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  sub_record RECORD;
  result JSONB;
BEGIN
  SELECT * INTO sub_record
  FROM user_subscriptions
  WHERE user_id = user_uuid;

  -- 如果没有订阅记录，返回 false
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'reason', 'no_subscription'
    );
  END IF;

  -- 根据订阅类型判断
  CASE sub_record.subscription_type
    WHEN 'permanent' THEN
      result := jsonb_build_object(
        'is_valid', true,
        'type', 'permanent',
        'subscription_type', 'permanent'
      );
    WHEN 'year' THEN
      IF sub_record.subscription_expires_at > NOW() THEN
        result := jsonb_build_object(
          'is_valid', true,
          'type', 'year',
          'expires_at', sub_record.subscription_expires_at,
          'subscription_type', 'year'
        );
      ELSE
        result := jsonb_build_object(
          'is_valid', false,
          'reason', 'subscription_expired',
          'subscription_type', 'year'
        );
      END IF;
    WHEN 'trial' THEN
      IF sub_record.trial_expires_at > NOW() THEN
        result := jsonb_build_object(
          'is_valid', true,
          'type', 'trial',
          'expires_at', sub_record.trial_expires_at,
          'subscription_type', 'trial'
        );
      ELSE
        result := jsonb_build_object(
          'is_valid', false,
          'reason', 'trial_expired',
          'subscription_type', 'trial'
        );
      END IF;
    ELSE
      result := jsonb_build_object(
        'is_valid', false,
        'reason', 'unknown_type'
      );
  END CASE;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. 生成兑换码的函数
CREATE OR REPLACE FUNCTION generate_redemption_code(
  p_code_type TEXT,
  p_count INTEGER DEFAULT 1
)
RETURNS TABLE(code TEXT, code_type TEXT) AS $$
DECLARE
  i INTEGER;
  v_code TEXT;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- 排除易混淆字符 I,O,0,1
BEGIN
  FOR i IN 1..p_count LOOP
    -- 生成 VIP-XXXX-XXXX 格式的兑换码
    v_code := 'VIP-' ||
      SUBSTRING(v_chars FROM FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER FOR 1) ||
      SUBSTRING(v_chars FROM FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER FOR 1) ||
      SUBSTRING(v_chars FROM FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER FOR 1) ||
      SUBSTRING(v_chars FROM FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER FOR 1) ||
      '-' ||
      SUBSTRING(v_chars FROM FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER FOR 1) ||
      SUBSTRING(v_chars FROM FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER FOR 1) ||
      SUBSTRING(v_chars FROM FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER FOR 1) ||
      SUBSTRING(v_chars FROM FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER FOR 1);

    INSERT INTO redemption_codes (code, code_type)
    VALUES (v_code, p_code_type);

    RETURN QUERY SELECT v_code, p_code_type;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. 为现有用户创建订阅记录（如果不存在）
INSERT INTO user_subscriptions (user_id, trial_started_at, trial_expires_at, subscription_type)
SELECT
  id,
  NOW(),
  NOW() + INTERVAL '1 day',
  'trial'
FROM user_profiles
WHERE id NOT IN (SELECT user_id FROM user_subscriptions)
ON CONFLICT (user_id) DO NOTHING;

-- ===========================================
-- 验证脚本执行成功
-- ===========================================
SELECT
  'redemption_codes' as table_name,
  COUNT(*) as count
FROM redemption_codes
UNION ALL
SELECT
  'user_subscriptions' as table_name,
  COUNT(*) as count
FROM user_subscriptions;

-- ===========================================
-- 使用示例
-- ===========================================

-- 生成 10 个年费兑换码
-- SELECT * FROM generate_redemption_code('year', 10);

-- 生成 5 个永久兑换码
-- SELECT * FROM generate_redemption_code('permanent', 5);

-- 查看所有未使用的兑换码
-- SELECT code, code_type, created_at
-- FROM redemption_codes
-- WHERE is_used = FALSE
-- ORDER BY created_at DESC;

-- 查看所有用户订阅状态
-- SELECT
--   u.email,
--   s.subscription_type,
--   s.trial_expires_at,
--   s.subscription_expires_at
-- FROM user_subscriptions s
-- JOIN auth.users u ON u.id = s.user_id
-- ORDER BY s.created_at DESC;
