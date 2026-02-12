-- ============================================
-- Supabase RLS 策略和触发器配置（安全版本）
-- 在 Supabase 控制台的 SQL Editor 中执行此脚本
-- 可以重复执行，不会报错
-- ============================================

-- 1. 启用行级安全策略（RLS）
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_records ENABLE ROW LEVEL SECURITY;

-- 2. 删除已存在的策略（如果存在）
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

DROP POLICY IF EXISTS "Users can view own records" ON completion_records;
DROP POLICY IF EXISTS "Users can insert own records" ON completion_records;

DROP POLICY IF EXISTS "Users can view own rewards" ON rewards;
DROP POLICY IF EXISTS "Users can insert own rewards" ON rewards;
DROP POLICY IF EXISTS "Users can delete own rewards" ON rewards;

DROP POLICY IF EXISTS "Users can view own redemptions" ON redemption_records;
DROP POLICY IF EXISTS "Users can insert own redemptions" ON redemption_records;

-- 3. 创建安全策略（用户只能访问自己的数据）

-- user_profiles 策略
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- tasks 策略
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- completion_records 策略
CREATE POLICY "Users can view own records" ON completion_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own records" ON completion_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- rewards 策略
CREATE POLICY "Users can view own rewards" ON rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rewards" ON rewards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own rewards" ON rewards FOR DELETE USING (auth.uid() = user_id);

-- redemption_records 策略
CREATE POLICY "Users can view own redemptions" ON redemption_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own redemptions" ON redemption_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. 删除已存在的触发器（如果存在）
DROP TRIGGER IF EXISTS trigger_update_points_on_completion ON completion_records;
DROP TRIGGER IF EXISTS trigger_update_points_on_redemption ON redemption_records;

-- 5. 创建触发器：完成任务时自动更新积分
CREATE OR REPLACE FUNCTION update_user_points_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET total_points = total_points + NEW.points_earned
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_points_on_completion
AFTER INSERT ON completion_records
FOR EACH ROW
EXECUTE FUNCTION update_user_points_on_completion();

-- 6. 创建触发器：兑换奖励时自动扣除积分
CREATE OR REPLACE FUNCTION update_user_points_on_redemption()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET total_points = total_points - NEW.points_spent
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_points_on_redemption
AFTER INSERT ON redemption_records
FOR EACH ROW
EXECUTE FUNCTION update_user_points_on_redemption();

-- 7. 验证配置
-- 执行以下查询检查策略是否创建成功
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('user_profiles', 'tasks', 'completion_records', 'rewards', 'redemption_records')
ORDER BY tablename, policyname;

-- 执行以下查询检查触发器是否创建成功
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('completion_records', 'redemption_records');
