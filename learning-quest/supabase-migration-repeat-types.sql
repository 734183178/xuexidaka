-- ============================================
-- 添加任务重复类型和起始日期功能
-- ============================================

-- 1. 添加新字段到 tasks 表
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS repeat_type TEXT DEFAULT 'daily'
CHECK (repeat_type IN (
  'once',           -- 仅当天
  'daily',          -- 每天
  'weekly',         -- 每周
  'biweekly',       -- 每双周
  'ebbinghaus',     -- 艾宾浩斯
  'week_cross',     -- 本周1次跨日任务
  'biweek_cross',   -- 本双周1次跨日任务
  'month_cross',    -- 本月1次跨日任务
  'weekly_cross',   -- 每周1次跨日任务
  'biweekly_cross', -- 每双周1次跨日任务
  'monthly_cross'   -- 每月1次跨日任务
));

-- 2. 更新现有数据（将 task_type 映射到 repeat_type）
UPDATE tasks
SET repeat_type = CASE
  WHEN task_type = 'once' THEN 'once'
  WHEN task_type = 'daily' THEN 'daily'
  ELSE 'daily'
END
WHERE repeat_type IS NULL OR repeat_type = 'daily';

-- 3. 为 start_date 设置默认值（如果为空）
UPDATE tasks
SET start_date = task_date
WHERE start_date IS NULL AND task_date IS NOT NULL;

-- 4. 添加注释
COMMENT ON COLUMN tasks.start_date IS '任务起始日期';
COMMENT ON COLUMN tasks.repeat_type IS '重复类型: once/daily/weekly/biweekly/ebbinghaus/week_cross/biweek_cross/month_cross/weekly_cross/biweekly_cross/monthly_cross';

-- 5. 验证更新
SELECT
    id,
    title,
    task_type,
    repeat_type,
    start_date,
    task_date,
    created_at
FROM tasks
ORDER BY created_at DESC
LIMIT 5;
