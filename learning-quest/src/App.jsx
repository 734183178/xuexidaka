import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import LearningQuest from './components/LearningQuest';

// 用户列表存储键
const USER_LIST_KEY = 'learning_quest_users';

// 获取用户列表
const getStoredUsers = () => {
  try {
    const stored = localStorage.getItem(USER_LIST_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// 保存用户列表
const saveStoredUsers = (users) => {
  localStorage.setItem(USER_LIST_KEY, JSON.stringify(users));
};

// 添加/更新用户到列表（包含 session 信息）
const addUserToList = (user, session = null) => {
  const users = getStoredUsers();
  const existingIndex = users.findIndex(u => u.id === user.id);

  const userData = {
    id: user.id,
    email: user.email,
    lastLogin: new Date().toISOString(),
    // 存储 access token 和 refresh token 用于快速切换
    accessToken: session?.access_token || (existingIndex >= 0 ? users[existingIndex].accessToken : null),
    refreshToken: session?.refresh_token || (existingIndex >= 0 ? users[existingIndex].refreshToken : null),
    expiresAt: session?.expires_at || (existingIndex >= 0 ? users[existingIndex].expiresAt : null)
  };

  if (existingIndex >= 0) {
    // 更新现有用户，保留已有token（如果新session没有）
    users[existingIndex] = {
      ...users[existingIndex],
      ...userData,
      // 如果新session有token就用新的，否则保留旧的
      accessToken: session?.access_token || users[existingIndex].accessToken,
      refreshToken: session?.refresh_token || users[existingIndex].refreshToken
    };
  } else {
    // 添加新用户
    users.push(userData);
  }

  saveStoredUsers(users);
  return getStoredUsers();
};

// 从列表移除用户
const removeUserFromList = (userId) => {
  const users = getStoredUsers().filter(u => u.id !== userId);
  saveStoredUsers(users);
  return users;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userList, setUserList] = useState([]);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  useEffect(() => {
    // 检查用户登录状态
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const updatedList = addUserToList(session.user, session);
        setUserList(updatedList);
      }
      setLoading(false);
    });

    // 监听认证状态变化
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const updatedList = addUserToList(session.user, session);
        setUserList(updatedList);
      }
    });

    // 加载用户列表
    setUserList(getStoredUsers());

    return () => subscription.unsubscribe();
  }, []);

  // 处理添加新用户
  const handleAddUser = () => {
    setAuthMode('add');
    setShowAuth(true);
  };

  // 处理切换用户（直接切换，无需重新登录）
  const handleSwitchUser = async (targetUser) => {
    if (targetUser.id === user?.id) {
      return; // 已经是当前用户
    }

    // 检查是否有保存的 token
    if (targetUser.accessToken && targetUser.refreshToken) {
      try {
        // 使用存储的 token 恢复会话
        const { data, error } = await supabase.auth.setSession({
          access_token: targetUser.accessToken,
          refresh_token: targetUser.refreshToken
        });

        if (error) {
          // 如果 token 失效，尝试刷新
          console.log('Token invalid, trying to refresh...');
          const { error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError) {
            // 刷新也失败，需要重新登录
            console.error('Session expired, need to re-login');
            setAuthMode('switch');
            setShowAuth(true);
          }
        } else {
          // 成功切换，更新存储的 token
          const newSession = data.session;
          if (newSession) {
            const users = getStoredUsers();
            const idx = users.findIndex(u => u.id === targetUser.id);
            if (idx >= 0) {
              users[idx] = {
                ...users[idx],
                accessToken: newSession.access_token,
                refreshToken: newSession.refresh_token,
                expiresAt: newSession.expires_at
              };
              saveStoredUsers(users);
              setUserList(users);
            }
          }
        }
        // onAuthStateChange 会自动更新 user 状态
      } catch (err) {
        console.error('Switch user error:', err);
        setAuthMode('switch');
        setShowAuth(true);
      }
    } else {
      // 没有 token，需要重新登录
      setAuthMode('switch');
      setShowAuth(true);
    }
  };

  // 处理登出
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 处理认证成功
  const handleAuthSuccess = (newUser) => {
    // 获取当前 session 来保存 token
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(newUser);
      const updatedList = addUserToList(newUser, session);
      setUserList(updatedList);
      setShowAuth(false);
    });
  };

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

  // 显示认证页面（首次登录或添加新用户）
  if (!user || showAuth) {
    return (
      <Auth
        onAuthSuccess={handleAuthSuccess}
        mode={authMode}
        onCancel={user ? () => setShowAuth(false) : null}
        userList={userList}
      />
    );
  }

  return (
    <LearningQuest
      user={user}
      userList={userList}
      onLogout={handleLogout}
      onAddUser={handleAddUser}
      onSwitchUser={handleSwitchUser}
    />
  );
}
