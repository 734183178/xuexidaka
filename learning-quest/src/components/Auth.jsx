import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Mail, Lock, User, X } from 'lucide-react';

export default function Auth({ onAuthSuccess, mode = 'login', onCancel, userList = [] }) {
  const [isLogin, setIsLogin] = useState(mode !== 'add');
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

  // 快速选择已保存的账号
  const handleSelectUser = (selectedEmail) => {
    setEmail(selectedEmail);
    setIsLogin(true);
  };

  const getTitle = () => {
    if (mode === 'add') return '添加新用户';
    if (mode === 'switch') return '切换账号';
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
        {/* 取消按钮（添加用户模式） */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <span className="text-3xl">🏆</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {getTitle() || '学习小助手'}
          </h1>
          <p className="text-gray-600 mt-2">
            {mode === 'add' ? '添加新账号' : mode === 'switch' ? '登录其他账号' : isLogin ? '欢迎回来！' : '开始你的学习之旅'}
          </p>
        </div>

        {/* 已保存账号列表 - 只在有保存用户且未输入邮箱时显示 */}
        {userList.length > 0 && isLogin && !email && (
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-3">快速选择账号：</p>
            <div className="space-y-2">
              {userList.slice(0, 4).map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleSelectUser(u.email)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg text-left transition-colors flex items-center gap-3"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-gray-700 truncate">{u.email}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 text-center">
              <button
                onClick={() => setEmail(' ')}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                使用其他账号登录
              </button>
            </div>
          </div>
        )}

        {/* 登录/注册表单 - 没有保存用户时直接显示，或者有邮箱输入时显示 */}
        {(!isLogin || email || userList.length === 0) && (
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
        )}

        {/* 切换登录/注册 - 表单显示时都显示切换按钮 */}
        {(!isLogin || email || userList.length === 0) && (
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
        )}
      </div>
    </div>
  );
}
