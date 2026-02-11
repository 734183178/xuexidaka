阶段一：环境准备（30分钟）
1. 注册Supabase账号

访问 supabase.com
创建新项目（选择离你最近的区域，如新加坡）
记录两个关键信息：

  SUPABASE_URL=https://xxxxx.supabase.co
  SUPABASE_ANON_KEY=eyJhbGc...（很长的字符串）
2. 安装依赖
bashnpm install @supabase/supabase-js

阶段二：数据库设计（1小时）
在Supabase控制台的SQL Editor中执行：
sql-- 1. 用户表（Supabase自动创建auth.users，我们创建扩展信息表）
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT,
  total_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 任务表
CREATE TABLE tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL,
  estimated_minutes INTEGER,
  time_mode TEXT CHECK (time_mode IN ('duration', 'timeSlot')),
  start_time TEXT,
  end_time TEXT,
  task_type TEXT CHECK (task_type IN ('daily', 'once')),
  task_date DATE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 完成记录表
CREATE TABLE completion_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  task_id UUID REFERENCES tasks NOT NULL,
  completion_date DATE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  actual_minutes INTEGER,
  points_earned INTEGER,
  proof_type TEXT,
  proof_data TEXT,
  proof_filename TEXT
);

-- 4. 奖励表
CREATE TABLE rewards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  points INTEGER NOT NULL,
  icon TEXT,
  reward_type TEXT CHECK (reward_type IN ('virtual', 'physical')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 兑换记录表
CREATE TABLE redemption_records (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  reward_id UUID REFERENCES rewards NOT NULL,
  redemption_date DATE NOT NULL,
  points_spent INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 启用行级安全策略（RLS）
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE redemption_records ENABLE ROW LEVEL SECURITY;

-- 7. 创建安全策略（用户只能访问自己的数据）
-- user_profiles
CREATE POLICY "Users can view own profile" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- tasks
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- completion_records
CREATE POLICY "Users can view own records" ON completion_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own records" ON completion_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- rewards
CREATE POLICY "Users can view own rewards" ON rewards FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own rewards" ON rewards FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own rewards" ON rewards FOR DELETE USING (auth.uid() = user_id);

-- redemption_records
CREATE POLICY "Users can view own redemptions" ON redemption_records FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own redemptions" ON redemption_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. 创建触发器：完成任务时自动更新积分
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

-- 9. 创建触发器：兑换奖励时自动扣除积分
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

阶段三：代码改造（2-3天）
1. 创建Supabase客户端配置
创建 src/lib/supabase.js：
javascriptimport { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

创建 `.env` 文件：
```
VITE_SUPABASE_URL=你的项目URL
VITE_SUPABASE_ANON_KEY=你的匿名密钥

2. 创建认证组件
创建 src/components/Auth.jsx：
javascriptimport React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User } from 'lucide-react';

export default function Auth({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // 登录
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onAuthSuccess(data.user);
      } else {
        // 注册
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // 创建用户配置
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert([
            {
              id: data.user.id,
              username: username || email.split('@')[0],
              total_points: 0,
            },
          ]);

        if (profileError) throw profileError;

        alert('注册成功！请登录');
        setIsLogin(true);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">🏆</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            学习任务系统
          </h1>
          <p className="text-gray-600 mt-2">
            {isLogin ? '欢迎回来！' : '开始你的学习之旅'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4" />
                用户名
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
                placeholder="输入用户名"
              />
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4" />
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
              placeholder="输入邮箱"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Lock className="w-4 h-4" />
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
              placeholder="输入密码（至少6位）"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? '处理中...' : isLogin ? '登录' : '注册'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {isLogin ? '没有账号？立即注册' : '已有账号？返回登录'}
          </button>
        </div>
      </div>
    </div>
  );
}

3. 创建数据服务层
创建 src/services/dataService.js：
javascriptimport { supabase } from '../lib/supabase';

export const dataService = {
  // ========== 用户相关 ==========
  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // ========== 任务相关 ==========
  async getTasks(userId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async addTask(userId, taskData) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          user_id: userId,
          title: taskData.title,
          description: taskData.description,
          points: taskData.points,
          estimated_minutes: taskData.estimatedMinutes,
          time_mode: taskData.timeMode,
          start_time: taskData.startTime,
          end_time: taskData.endTime,
          task_type: taskData.type || 'daily',
          task_date: taskData.date,
        },
      ])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteTask(taskId) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);
    
    if (error) throw error;
  },

  // ========== 完成记录相关 ==========
  async getCompletionRecords(userId, date = null) {
    let query = supabase
      .from('completion_records')
      .select('*')
      .eq('user_id', userId);
    
    if (date) {
      query = query.eq('completion_date', date);
    }
    
    const { data, error } = await query.order('completed_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async addCompletionRecord(userId, recordData) {
    const { data, error } = await supabase
      .from('completion_records')
      .insert([
        {
          user_id: userId,
          task_id: recordData.taskId,
          completion_date: recordData.date,
          actual_minutes: recordData.actualMinutes,
          points_earned: recordData.pointsEarned,
          proof_type: recordData.proof?.type,
          proof_data: recordData.proof?.data,
          proof_filename: recordData.proof?.fileName,
        },
      ])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // ========== 奖励相关 ==========
  async getRewards(userId) {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', userId)
      .order('points', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async addReward(userId, rewardData) {
    const { data, error } = await supabase
      .from('rewards')
      .insert([
        {
          user_id: userId,
          name: rewardData.name,
          points: rewardData.points,
          icon: rewardData.icon,
          reward_type: rewardData.type,
        },
      ])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteReward(rewardId) {
    const { error } = await supabase
      .from('rewards')
      .delete()
      .eq('id', rewardId);
    
    if (error) throw error;
  },

  // ========== 兑换记录相关 ==========
  async getRedemptionRecords(userId) {
    const { data, error } = await supabase
      .from('redemption_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async addRedemptionRecord(userId, redemptionData) {
    const { data, error } = await supabase
      .from('redemption_records')
      .insert([
        {
          user_id: userId,
          reward_id: redemptionData.rewardId,
          redemption_date: redemptionData.date,
          points_spent: redemptionData.pointsSpent,
        },
      ])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },
};

4. 改造主应用组件
修改 src/App.jsx：
javascriptimport React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { dataService } from './services/dataService';
import Auth from './components/Auth';
import LearningQuest from './components/LearningQuest';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查用户登录状态
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onAuthSuccess={setUser} />;
  }

  return <LearningQuest user={user} onLogout={() => supabase.auth.signOut()} />;
}

5. 改造LearningQuest组件（核心改动）
修改你的 LearningQuest 组件，主要改动点：
javascriptexport default function LearningQuest({ user, onLogout }) {
  const [data, setData] = useState({
    tasks: [],
    completionRecords: [],
    rewards: [],
    redemptionRecords: [],
    totalPoints: 0
  });
  const [loading, setLoading] = useState(true);

  // 🔄 初始化：从Supabase加载数据（替换getInitialData）
  useEffect(() => {
    loadAllData();
  }, [user]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [profile, tasks, records, rewards, redemptions] = await Promise.all([
        dataService.getUserProfile(user.id),
        dataService.getTasks(user.id),
        dataService.getCompletionRecords(user.id),
        dataService.getRewards(user.id),
        dataService.getRedemptionRecords(user.id),
      ]);

      setData({
        tasks: tasks || [],
        completionRecords: records || [],
        rewards: rewards || [],
        redemptionRecords: redemptions || [],
        totalPoints: profile?.total_points || 0,
      });
    } catch (error) {
      console.error('加载数据失败:', error);
      alert('加载数据失败，请刷新页面重试');
    } finally {
      setLoading(false);
    }
  };

  // 🔄 添加任务（调用Supabase）
  const addTask = async (task) => {
    try {
      const newTask = await dataService.addTask(user.id, task);
      setData(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
      setShowModal(null);
    } catch (error) {
      console.error('添加任务失败:', error);
      alert('添加任务失败，请重试');
    }
  };

  // 🔄 完成任务（调用Supabase）
  const completeTask = async (task, actualMinutes, proof) => {
    try {
      const today = formatDate(selectedDate);
      const newRecord = await dataService.addCompletionRecord(user.id, {
        taskId: task.id,
        date: today,
        actualMinutes,
        pointsEarned: task.points,
        proof,
      });

      // 重新加载用户积分
      const profile = await dataService.getUserProfile(user.id);
      
      setData(prev => ({
        ...prev,
        completionRecords: [...prev.completionRecords, newRecord],
        totalPoints: profile.total_points,
      }));

      showCompletionFeedback(task, actualMinutes);
    } catch (error) {
      console.error('完成任务失败:', error);
      alert('完成任务失败，请重试');
    }
  };

  // 🔄 兑换奖励（调用Supabase）
  const redeemReward = async (reward) => {
    if (data.totalPoints < reward.points) return;

    try {
      const newRedemption = await dataService.addRedemptionRecord(user.id, {
        rewardId: reward.id,
        date: formatDate(new Date()),
        pointsSpent: reward.points,
      });

      // 重新加载用户积分
      const profile = await dataService.getUserProfile(user.id);

      setData(prev => ({
        ...prev,
        redemptionRecords: [...prev.redemptionRecords, newRedemption],
        totalPoints: profile.total_points,
      }));

      setShowModal(null);
    } catch (error) {
      console.error('兑换奖励失败:', error);
      alert('兑换奖励失败，请重试');
    }
  };

  // 🔄 添加奖励
  const addReward = async (reward) => {
    try {
      const newReward = await dataService.addReward(user.id, reward);
      setData(prev => ({ ...prev, rewards: [...prev.rewards, newReward] }));
      setShowModal(null);
    } catch (error) {
      console.error('添加奖励失败:', error);
      alert('添加奖励失败，请重试');
    }
  };

  // ⚠️ 移除所有localStorage相关代码
  // useEffect(() => {
  //   localStorage.setItem('learningQuestData', JSON.stringify(data));
  // }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* 顶部导航添加登出按钮 */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* ...原有导航代码... */}
          
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
          >
            登出
          </button>
        </div>
      </div>

      {/* ...其余原有代码保持不变... */}
    </div>
  );
}

阶段四：部署上线（30分钟）
1. 提交代码到GitHub
bashgit init
git add .
git commit -m "Initial commit with Supabase integration"
git remote add origin https://github.com/你的用户名/learning-quest.git
git push -u origin main
```

#### 2. 部署到Vercel

1. 访问 [vercel.com](https://vercel.com)
2. 点击"Import Project"
3. 连接GitHub仓库
4. 配置环境变量：
```
   VITE_SUPABASE_URL=你的URL
   VITE_SUPABASE_ANON_KEY=你的密钥

点击"Deploy"

✅ 完成！ 你的网站会在几分钟内上线，获得一个域名如 your-app.vercel.app