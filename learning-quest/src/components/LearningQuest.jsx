import React, { useState, useEffect, useRef } from 'react';
import { dataService } from '../services/dataService';
import { Calendar, Plus, Gift, Play, Check, Clock, Upload, Mic, Edit2, X, Trophy, Target, BarChart3, ChevronLeft, ChevronRight, Zap, Award, Star, LogOut, User, ChevronDown, Pause, RotateCcw, Coffee, Timer, Settings, Lightbulb, ChevronUp } from 'lucide-react';

export default function LearningQuest({ user, onLogout }) {
  const [data, setData] = useState({
    tasks: [],
    completionRecords: [],
    rewards: [],
    redemptionRecords: [],
    totalPoints: 0
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState('home');
  const [showModal, setShowModal] = useState(null);
  const [modalData, setModalData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const menuRef = useRef(null);

  // 从 Supabase 加载数据
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

      setUserProfile(profile);
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

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatDateChinese = (date) => {
    const d = new Date(date);
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 周${days[d.getDay()]}`;
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}小时${m}分钟`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  };

  // 判断任务是否应该在指定日期显示
  const shouldShowTaskOnDate = (task, date) => {
    const targetDate = new Date(date);
    const startDate = new Date(task.start_date || task.created_at);
    const repeatType = task.repeat_type || task.task_type || 'daily';

    // 清除时间部分，只比较日期
    targetDate.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);

    // 如果目标日期在起始日期之前，不显示
    if (targetDate < startDate) return false;

    const diffDays = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24));

    switch (repeatType) {
      case 'once':
        // 仅当天 - 只在起始日期显示
        return diffDays === 0;

      case 'daily':
        // 每天 - 从起始日期开始每天都显示
        return true;

      case 'weekly':
        // 每周 - 从起始日期开始，每隔7天显示
        return diffDays % 7 === 0;

      case 'biweekly':
        // 每双周 - 从起始日期开始，每隔14天显示
        return diffDays % 14 === 0;

      case 'ebbinghaus':
        // 艾宾浩斯记忆曲线：1, 2, 4, 7, 15, 30 天后复习
        const ebbinghausDays = [0, 1, 2, 4, 7, 15, 30];
        return ebbinghausDays.includes(diffDays);

      case 'week_cross':
        // 本周1次跨日任务 - 本周内显示（周一到周日）
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - targetDate.getDay() + 1); // 本周一
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6); // 本周日
        return startDate >= weekStart && startDate <= weekEnd;

      case 'biweek_cross':
        // 本双周1次跨日任务
        // 简化实现：假设每两周一个周期
        const weekNumber = Math.floor(diffDays / 7);
        return weekNumber % 2 === 0;

      case 'month_cross':
        // 本月1次跨日任务 - 本月内显示
        return startDate.getMonth() === targetDate.getMonth() &&
               startDate.getFullYear() === targetDate.getFullYear();

      case 'weekly_cross':
        // 每周1次跨日任务 - 每周都显示（同一周内）
        const taskWeek = Math.floor(diffDays / 7);
        const currentWeek = Math.floor((targetDate - startDate) / (1000 * 60 * 60 * 24 * 7));
        return true; // 简化：每周都显示

      case 'biweekly_cross':
        // 每双周1次跨日任务
        const biweekNum = Math.floor(diffDays / 14);
        return true; // 简化：每双周都显示

      case 'monthly_cross':
        // 每月1次跨日任务
        return startDate.getDate() === targetDate.getDate(); // 每月同一天

      default:
        // 默认：每天显示
        return true;
    }
  };

  const getTodayTasks = () => {
    const today = formatDate(selectedDate);

    // 过滤出应该在当天显示的任务
    const todayTasks = data.tasks.filter(task => shouldShowTaskOnDate(task, selectedDate));

    const tasksWithStatus = todayTasks.map(task => {
      const completed = data.completionRecords.find(r =>
        r.task_id === task.id && r.completion_date === today
      );
      return {
        ...task,
        todayCompleted: !!completed,
        todayRecord: completed
      };
    });

    // 排序：时间段任务优先，按开始时间排序；然后是时长任务
    return tasksWithStatus.sort((a, b) => {
      // 时间段任务优先
      if (a.time_mode === 'timeSlot' && b.time_mode !== 'timeSlot') return -1;
      if (a.time_mode !== 'timeSlot' && b.time_mode === 'timeSlot') return 1;

      // 都是时间段任务，按开始时间排序
      if (a.time_mode === 'timeSlot' && b.time_mode === 'timeSlot') {
        return (a.start_time || '').localeCompare(b.start_time || '');
      }

      // 都是时长任务，保持原顺序
      return 0;
    });
  };

  const getTodayStats = () => {
    const tasks = getTodayTasks();
    const completed = tasks.filter(t => t.todayCompleted);
    const totalTime = completed.reduce((sum, t) => sum + (t.todayRecord?.actual_minutes || 0), 0);

    return {
      total: tasks.length,
      completed: completed.length,
      completionRate: tasks.length > 0 ? Math.round(completed.length / tasks.length * 100) : 0,
      totalMinutes: totalTime
    };
  };

  // 添加任务（调用 Supabase）
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

  const startTimer = (task) => {
    setModalData({ task });
    setShowModal('timer'); // 打开计时器模态框
  };

  const completeWithTimer = (proof, actualMinutes) => {
    const task = modalData.task;
    const minutes = actualMinutes || 30;
    completeTask(task, minutes, proof);
    setShowModal(null);
  };

  const quickComplete = (task, minutes, proof) => {
    completeTask(task, minutes, proof);
    setShowModal(null);
  };

  // 完成任务（调用 Supabase）
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

  const showCompletionFeedback = (task, minutes) => {
    setModalData({ task, minutes });
    setShowModal('completionFeedback');
    setTimeout(() => setShowModal(null), 3000);
  };

  // 兑换奖励（调用 Supabase）
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

  // 添加奖励
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

  const stats = getTodayStats();
  const todayTasks = getTodayTasks();
  const pendingTasks = todayTasks.filter(t => !t.todayCompleted);
  const completedTasks = todayTasks.filter(t => t.todayCompleted);

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
      {/* 顶部导航 */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              学习任务
            </h1>
          </div>
          <div className="flex gap-2 items-center relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-gray-800 hidden sm:inline">{userProfile?.username || '用户'}</span>
              <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {/* 下拉菜单 */}
            {showUserMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 sm:w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 animate-fadeIn">
                <div className="px-3 sm:px-4 py-2 border-b border-gray-100">
                  <div className="text-xs sm:text-sm text-gray-600">邮箱</div>
                  <div className="text-xs sm:text-sm font-medium text-gray-800 truncate">{user?.email}</div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    onLogout();
                  }}
                  className="w-full px-3 sm:px-4 py-2.5 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 text-red-600 text-sm sm:text-base"
                >
                  <LogOut className="w-4 h-4" />
                  <span>退出登录</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {currentPage === 'home' && (
          <>
            {/* 计划概览 */}
            <div className="bg-white rounded-2xl shadow-xl p-3 sm:p-4 mb-4 sm:mb-6 border-2 border-indigo-100">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h2 className="text-base sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                  计划概览
                </h2>
              </div>

              {/* 移动端：2列，平板：3列，桌面：5列 */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 mb-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border-2 border-blue-200">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                    <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                    <div className="text-[10px] sm:text-xs text-blue-700 font-medium">完成情况</div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-blue-600">{stats.completed}/{stats.total}</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border-2 border-purple-200">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                    <Award className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
                    <div className="text-[10px] sm:text-xs text-purple-700 font-medium">完成率</div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-purple-600">{stats.completionRate}%</div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg sm:rounded-xl p-2.5 sm:p-3 border-2 border-orange-200">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                    <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                    <div className="text-[10px] sm:text-xs text-orange-700 font-medium">用时</div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-orange-600">
                    {Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg sm:rounded-xl p-2.5 sm:p-3 border-2 border-indigo-300">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                    <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <div className="text-[10px] sm:text-xs opacity-90 font-medium">当前积分</div>
                  </div>
                  <div className="text-lg sm:text-2xl font-bold">{data.totalPoints}</div>
                </div>

                <button
                  onClick={() => setCurrentPage('rewards')}
                  className="col-span-2 sm:col-span-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg sm:rounded-xl p-2.5 sm:p-3 border-2 border-pink-300 hover:shadow-lg transition-all flex items-center justify-center gap-1.5 sm:flex-col sm:items-center sm:justify-center sm:gap-1"
                >
                  <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
                  <div className="text-xs sm:text-sm font-medium">奖励商店</div>
                </button>
              </div>

              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg sm:rounded-xl p-2 sm:p-2.5 border-2 border-pink-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-pink-600" />
                    <span className="text-[10px] sm:text-xs text-pink-700 font-medium">
                      {data.rewards.length > 0 && data.totalPoints < data.rewards[0].points
                        ? `距离 ${data.rewards[0].name} 还差 ${data.rewards[0].points - data.totalPoints} 分`
                        : '可以兑换奖励啦！'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 日期导航 */}
            <div className="bg-white rounded-xl shadow-md p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 sm:gap-3">
                  <button
                    onClick={() => {
                      setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000));
                    }}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  <div className="text-sm sm:text-lg font-semibold text-gray-800 min-w-[90px] sm:min-w-[120px] text-center">
                    {formatDate(selectedDate)}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
                    }}
                    className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
                <input
                  type="date"
                  value={formatDate(selectedDate)}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(new Date(e.target.value));
                    }
                  }}
                  className="px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-base bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium transition-colors"
                />
              </div>
            </div>

            {/* 任务列表 */}
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <h3 className="text-base sm:text-xl font-bold text-gray-800">📝 任务列表</h3>
                <button
                  onClick={() => setShowModal('newTask')}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-sm sm:text-base font-medium hover:shadow-lg transition-all flex items-center gap-1.5 sm:gap-2"
                >
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">新增任务</span>
                  <span className="sm:hidden">新增</span>
                </button>
              </div>

              {/* 待完成任务 */}
              {pendingTasks.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-600 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                    <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />
                    待完成任务 ({pendingTasks.length}个)
                  </h4>
                  <div className="space-y-2 sm:space-y-3">
                    {pendingTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onStartTimer={startTimer}
                        onQuickComplete={(task) => {
                          setModalData({ task });
                          setShowModal('quickComplete');
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 已完成任务 */}
              {completedTasks.length > 0 && (
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-gray-600 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2">
                    <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500" />
                    已完成 ({completedTasks.length}个)
                  </h4>
                  <div className="space-y-2">
                    {completedTasks.map(task => (
                      <CompletedTaskCard key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )}

              {todayTasks.length === 0 && (
                <div className="text-center py-8 sm:py-12 text-gray-400">
                  <Target className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 opacity-50" />
                  <p className="text-sm sm:text-base">今天还没有任务，点击上方按钮添加吧！</p>
                </div>
              )}
            </div>
          </>
        )}

        {currentPage === 'rewards' && (
          <RewardsPage
            rewards={data.rewards}
            totalPoints={data.totalPoints}
            redemptionRecords={data.redemptionRecords}
            onRedeem={(reward) => {
              setModalData({ reward });
              setShowModal('redeem');
            }}
            onAddReward={() => setShowModal('addReward')}
            onBack={() => setCurrentPage('home')}
          />
        )}
      </div>

      {/* 模态框 */}
      {showModal === 'newTask' && (
        <NewTaskModal onClose={() => setShowModal(null)} onAdd={addTask} />
      )}

      {showModal === 'quickComplete' && (
        <QuickCompleteModal
          task={modalData.task}
          onClose={() => setShowModal(null)}
          onComplete={quickComplete}
        />
      )}

      {showModal === 'timer' && (
        <TimerModal
          task={modalData.task}
          onComplete={completeWithTimer}
          onClose={() => setShowModal(null)}
        />
      )}

      {showModal === 'completionFeedback' && (
        <CompletionFeedback task={modalData.task} minutes={modalData.minutes} />
      )}

      {showModal === 'redeem' && (
        <RedeemModal
          reward={modalData.reward}
          currentPoints={data.totalPoints}
          onClose={() => setShowModal(null)}
          onConfirm={redeemReward}
        />
      )}

      {showModal === 'addReward' && (
        <AddRewardModal onClose={() => setShowModal(null)} onAdd={addReward} />
      )}
    </div>
  );
}

// 任务卡片组件
function TaskCard({ task, onStartTimer, onQuickComplete }) {
  const getRepeatTypeLabel = (repeatType) => {
    const labels = {
      'once': '仅当天',
      'daily': '每天',
      'weekly': '每周',
      'biweekly': '每双周',
      'ebbinghaus': '艾宾浩斯',
      'week_cross': '本周跨日',
      'biweek_cross': '本双周跨日',
      'month_cross': '本月跨日',
      'weekly_cross': '每周跨日',
      'biweekly_cross': '每双周跨日',
      'monthly_cross': '每月跨日',
    };
    return labels[repeatType] || '每天';
  };

  return (
    <div className="bg-gradient-to-br from-white to-indigo-50 border-2 border-indigo-200 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-lg transition-all">
      {/* 移动端：垂直布局，桌面端：水平布局 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base sm:text-lg text-gray-800 mb-1.5 sm:mb-2 truncate">{task.title}</div>
          <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600 flex-wrap">
            <span className="flex items-center gap-1 shrink-0">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" />
              {task.points}分
            </span>
            <span className="flex items-center gap-0.5 sm:gap-1 bg-indigo-100 text-indigo-700 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs shrink-0">
              <Target className="w-3 h-3" />
              {getRepeatTypeLabel(task.repeat_type || task.task_type)}
            </span>
            {task.time_mode === 'duration' ? (
              <span className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                <span className="hidden xs:inline">预计</span>{task.estimated_minutes}分钟
              </span>
            ) : (
              <span className="flex items-center gap-0.5 sm:gap-1 bg-purple-100 text-purple-700 px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs shrink-0">
                🕐 {task.start_time} - {task.end_time}
              </span>
            )}
            {task.description && (
              <span className="text-gray-500 text-[10px] sm:text-xs truncate max-w-[120px] sm:max-w-none">· {task.description}</span>
            )}
          </div>
        </div>
        {/* 按钮区域：移动端横向全宽，桌面端正常 */}
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onStartTimer(task)}
            className="flex-1 sm:flex-none bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            开始
          </button>
          <button
            onClick={() => onQuickComplete(task)}
            className="flex-1 sm:flex-none bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            快速完成
          </button>
        </div>
      </div>
    </div>
  );
}

// 🎯 新增任务模态框（支持时长/时间段选择）
function NewTaskModal({ onClose, onAdd }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [points, setPoints] = useState(20);
  const [timeMode, setTimeMode] = useState('duration'); // 'duration' 或 'timeSlot'

  // 时长模式
  const [minutes, setMinutes] = useState(30);

  // 时间段模式
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('19:30');

  // 新增：起始日期和重复类型
  const [startDate, setStartDate] = useState(new Date());
  const [repeatType, setRepeatType] = useState('daily');

  // 重复类型选项
  const repeatOptions = [
    { value: 'once', label: '仅当天', description: (date) => formatDateChinese(date) },
    { value: 'daily', label: '每天', description: () => '每天重复' },
    { value: 'weekly', label: '每周', description: () => '每周重复' },
    { value: 'biweekly', label: '每双周', description: () => '每双周重复' },
    { value: 'ebbinghaus', label: '艾宾浩斯', description: () => '记忆曲线复习' },
    { value: 'week_cross', label: '本周1次跨日任务', description: () => '本周内完成一次' },
    { value: 'biweek_cross', label: '本双周1次跨日任务', description: () => '本双周内完成一次' },
    { value: 'month_cross', label: '本月1次跨日任务', description: () => '本月内完成一次' },
    { value: 'weekly_cross', label: '每周1次跨日任务', description: () => '每周跨日任务' },
    { value: 'biweekly_cross', label: '每双周1次跨日任务', description: () => '每双周跨日任务' },
    { value: 'monthly_cross', label: '每月1次跨日任务', description: () => '每月跨日任务' },
  ];

  const formatDateChinese = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      points,
      timeMode,
      repeatType,
      startDate: formatDateChinese(startDate),
    };

    if (timeMode === 'duration') {
      taskData.estimatedMinutes = minutes;
    } else {
      taskData.startTime = startTime;
      taskData.endTime = endTime;
      // 计算时间段的分钟数用于显示
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);
      taskData.estimatedMinutes = durationMinutes > 0 ? durationMinutes : 30;
    }

    onAdd(taskData);
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-lg w-full shadow-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-10">
          <h3 className="text-base sm:text-xl font-bold">📋 新增学习计划</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {/* 计划名称 */}
          <div>
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
              <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
              计划名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：完成数学作业"
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
              <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
              备注 <span className="text-gray-400 text-[10px] sm:text-xs font-normal">(可选)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：完成练习册第10-15页的题目"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none min-h-[60px] sm:min-h-[80px] resize-none"
            />
          </div>

          {/* 起始日期 */}
          <div>
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
              起始日期 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formatDateChinese(startDate)}
              onChange={(e) => setStartDate(new Date(e.target.value))}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* 重复类型 */}
          <div>
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
              <Target className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600" />
              重复类型 <span className="text-red-500">*</span>
            </label>
            <select
              value={repeatType}
              onChange={(e) => setRepeatType(e.target.value)}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none bg-white"
            >
              {repeatOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label} - {option.description(startDate)}
                </option>
              ))}
            </select>
            <p className="text-[10px] sm:text-xs text-gray-500 mt-1">
              {repeatOptions.find(o => o.value === repeatType)?.description(startDate)}
            </p>
          </div>

          {/* 时间模式选择 */}
          <div>
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
              时间设置 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2 sm:gap-3 mb-3 sm:mb-4">
              <button
                onClick={() => setTimeMode('duration')}
                className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all border-2 ${
                  timeMode === 'duration'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>时长模式</span>
                </div>
              </button>
              <button
                onClick={() => setTimeMode('timeSlot')}
                className={`flex-1 px-2 sm:px-4 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-all border-2 ${
                  timeMode === 'timeSlot'
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="flex flex-col items-center gap-0.5 sm:gap-1">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>时间段模式</span>
                </div>
              </button>
            </div>

            {/* 时长模式输入 */}
            {timeMode === 'duration' && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3 sm:p-4">
                <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 block">预计时长</label>
                <div className="flex items-center gap-2 sm:gap-3">
                  <input
                    type="number"
                    value={minutes}
                    onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                    min="1"
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-sm sm:text-base text-gray-700 font-medium">分钟</span>
                </div>
              </div>
            )}

            {/* 时间段模式输入 */}
            {timeMode === 'timeSlot' && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-3 sm:p-4">
                <div className="grid grid-cols-2 gap-2 sm:gap-4">
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 block">开始时间</label>
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-white border-2 border-purple-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="flex-1 outline-none text-sm sm:text-base"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2 block">结束时间</label>
                    <div className="flex items-center gap-1.5 sm:gap-2 bg-white border-2 border-purple-300 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500" />
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="flex-1 outline-none text-sm sm:text-base"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] sm:text-xs text-purple-600 mt-2">
                  💡 设置固定的时间段，例如：19:00-19:30
                </p>
              </div>
            )}
          </div>

          {/* 积分奖励 */}
          <div>
            <label className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2">
              <Trophy className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500" />
              完成奖励积分
            </label>
            <div className="space-y-1.5 sm:space-y-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value))}
                  className="flex-1"
                />
                <div className="flex items-center gap-0.5 sm:gap-1 min-w-[60px] sm:min-w-[80px] bg-yellow-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">
                  <span className="text-base sm:text-lg font-bold text-yellow-600">{points}</span>
                  <span className="text-xs sm:text-sm text-gray-600">分</span>
                </div>
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500">
                拖动滑块调整积分（5-100分）
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200 sticky bottom-0 bg-white -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 sm:pb-0">
            <button
              onClick={onClose}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✅ 创建计划
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 快速完成模态框
function QuickCompleteModal({ task, onClose, onComplete }) {
  const [minutes, setMinutes] = useState(task.estimated_minutes || 30);
  const [proofType, setProofType] = useState('photo');
  const [proofData, setProofData] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProofData({
          type: proofType,
          data: reader.result,
          fileName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <Modal onClose={onClose} title="快速完成任务">
      <div className="space-y-3 sm:space-y-4">
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-3 sm:p-4">
          <div className="font-semibold text-base sm:text-lg text-gray-800 mb-0.5 sm:mb-1">{task.title}</div>
          <div className="text-xs sm:text-sm text-gray-600">奖励: {task.points}分</div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">实际用时（分钟）</label>
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value))}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">完成证明</label>
          <div className="flex gap-2 sm:gap-3 mb-2 sm:mb-3">
            <button
              onClick={() => setProofType('photo')}
              className={`flex-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                proofType === 'photo'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📷 上传照片
            </button>
            <button
              onClick={() => setProofType('audio')}
              className={`flex-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                proofType === 'audio'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🎤 录音
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={proofType === 'photo' ? 'image/*' : 'audio/*'}
            onChange={handleFileUpload}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-lg text-xs sm:text-sm text-gray-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-1.5 sm:gap-2"
          >
            {proofType === 'photo' ? <Upload className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
            {proofData ? proofData.fileName : `点击上传${proofType === 'photo' ? '照片' : '录音'}`}
          </button>
        </div>

        <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onComplete(task, minutes, proofData)}
            disabled={!proofData}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            完成任务
          </button>
        </div>
      </div>
    </Modal>
  );
}

// 计时器全屏页面（全新设计）
function TimerModal({ task, onComplete, onClose }) {
  const [mode, setMode] = useState('countup'); // 'countup' | 'countdown' | 'pomodoro'
  const [isActive, setIsActive] = useState(false);
  const [isStarted, setIsStarted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [countdownTarget, setCountdownTarget] = useState(25 * 60);
  const [pomodoroPhase, setPomodoroPhase] = useState('work');
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [proofData, setProofData] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const fileInputRef = useRef(null);
  const timerRef = useRef(null);

  // 计时逻辑
  useEffect(() => {
    if (isActive && isStarted) {
      timerRef.current = setInterval(() => {
        if (mode === 'countup') {
          setSeconds(s => s + 1);
        } else if (mode === 'countdown') {
          setSeconds(s => {
            if (s <= 1) {
              setIsActive(false);
              return 0;
            }
            return s - 1;
          });
        } else if (mode === 'pomodoro') {
          setSeconds(s => {
            if (s <= 1) {
              const newPhase = pomodoroPhase === 'work' ? 'break' : 'work';
              setPomodoroPhase(newPhase);
              if (newPhase === 'break') {
                setPomodoroCount(c => c + 1);
                return 5 * 60;
              } else {
                return 25 * 60;
              }
            }
            return s - 1;
          });
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isActive, isStarted, mode, pomodoroPhase]);

  // 格式化时间
  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return {
      hours: String(h).padStart(2, '0'),
      minutes: String(m).padStart(2, '0'),
      seconds: String(s).padStart(2, '0')
    };
  };

  // 开始学习
  const handleStartLearning = () => {
    if (!isStarted) {
      if (mode === 'countdown') {
        setSeconds(countdownTarget);
      } else if (mode === 'pomodoro') {
        setSeconds(25 * 60);
        setPomodoroPhase('work');
        setPomodoroCount(0);
      } else {
        setSeconds(0);
      }
      setIsStarted(true);
    }
    setIsActive(!isActive);
  };

  // 上传文件
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setProofData({
          type: file.type.startsWith('image/') ? 'photo' : 'audio',
          data: reader.result,
          fileName: file.name
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // 完成任务
  const handleComplete = () => {
    const actualMinutes = mode === 'countup'
      ? Math.ceil(seconds / 60)
      : Math.ceil((countdownTarget - seconds) / 60);
    onComplete(proofData, actualMinutes);
  };

  const time = formatTime(seconds);
  const statusText = !isStarted ? '未开始' : isActive ? '计时中...' : '已暂停';

  const getModeDescription = () => {
    if (mode === 'countup') return '正计时概况：自由计时，适合宽松定义学习时间';
    if (mode === 'countdown') return '倒计时概况：设定目标时长，督促按时完成';
    return '番茄时间概况：25分钟工作 + 5分钟休息循环';
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      {/* 白色卡片容器 */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col">
        {/* 顶部蓝色横幅 */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-3 sm:px-5 py-3 sm:py-5 shrink-0">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <button
              onClick={onClose}
              className="flex items-center gap-1 sm:gap-1.5 text-white hover:opacity-80 transition-opacity"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm sm:text-base font-medium">返回</span>
            </button>
            <button className="px-2 sm:px-4 py-1.5 sm:py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-xs sm:text-sm font-medium transition-colors">
              自定义
            </button>
          </div>
          <div className="text-center">
            <h1 className="text-white text-base sm:text-xl font-bold mb-0.5 sm:mb-1 truncate px-2">{task.title}</h1>
            {task.description && (
              <p className="text-white/85 text-xs sm:text-sm truncate">{task.description}</p>
            )}
          </div>
        </div>

        {/* 标签页导航 */}
        <div className="px-3 sm:px-5 pt-3 sm:pt-5 shrink-0">
          <div className="flex items-center justify-between border-b border-gray-200">
            <div className="flex gap-4 sm:gap-8">
              {[
                { id: 'countup', label: '正计' },
                { id: 'countdown', label: '倒计' },
                { id: 'pomodoro', label: '番茄' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setMode(tab.id);
                    setIsStarted(false);
                    setIsActive(false);
                    setSeconds(0);
                  }}
                  className={`pb-2 sm:pb-3.5 px-1 text-xs sm:text-sm font-medium transition-colors relative ${
                    mode === tab.id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab.label}
                  {mode === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>
                  )}
                </button>
              ))}
            </div>
            <button className="px-2 sm:px-4 py-1.5 sm:py-2 bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors mb-1 sm:mb-2">
              暂停
            </button>
          </div>
        </div>

        {/* 计时器主体 */}
        <div className="px-3 sm:px-5 py-4 sm:py-10 overflow-y-auto flex-1">
          {/* 标题 */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-8">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
            <span className="text-sm sm:text-lg font-semibold text-gray-700">
              {mode === 'countup' && '正计时'}
              {mode === 'countdown' && '倒计时'}
              {mode === 'pomodoro' && (pomodoroPhase === 'work' ? '🍅 工作时间' : '☕ 休息时间')}
            </span>
            {mode === 'pomodoro' && (
              <span className="text-xs sm:text-sm text-gray-400 ml-0.5 sm:ml-1">({pomodoroCount}个番茄)</span>
            )}
          </div>

          {/* 时间显示 - 核心区域 */}
          <div className="flex items-center justify-center gap-1.5 sm:gap-4 mb-2 sm:mb-4">
            {/* 小时方块 */}
            <div className="text-center">
              <div className="w-[52px] h-[64px] sm:w-[72px] sm:h-[88px] bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg mb-1.5 sm:mb-2.5">
                <span className="text-[28px] sm:text-[42px] font-bold text-white tracking-tight">{time.hours}</span>
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 font-medium">小时</div>
            </div>

            {/* 分隔符 */}
            <div className="text-[28px] sm:text-[42px] font-bold text-gray-300 leading-none mb-4 sm:mb-6">:</div>

            {/* 分钟方块 */}
            <div className="text-center">
              <div className="w-[52px] h-[64px] sm:w-[72px] sm:h-[88px] bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg mb-1.5 sm:mb-2.5">
                <span className="text-[28px] sm:text-[42px] font-bold text-white tracking-tight">{time.minutes}</span>
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 font-medium">分钟</div>
            </div>

            {/* 分隔符 */}
            <div className="text-[28px] sm:text-[42px] font-bold text-gray-300 leading-none mb-4 sm:mb-6">:</div>

            {/* 秒方块 */}
            <div className="text-center">
              <div className="w-[52px] h-[64px] sm:w-[72px] sm:h-[88px] bg-gradient-to-br from-orange-500 to-red-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg mb-1.5 sm:mb-2.5">
                <span className="text-[28px] sm:text-[42px] font-bold text-white tracking-tight">{time.seconds}</span>
              </div>
              <div className="text-[10px] sm:text-xs text-gray-500 font-medium">秒</div>
            </div>
          </div>

          {/* 状态 */}
          <div className="text-center text-xs sm:text-sm text-gray-400 mb-4 sm:mb-8 font-medium">{statusText}</div>

          {/* 倒计时设置 */}
          {mode === 'countdown' && !isStarted && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-4 sm:mb-8">
              <span className="text-xs sm:text-sm text-gray-600 mr-1 sm:mr-2 w-full text-center sm:w-auto">设置时长：</span>
              {[15, 25, 30, 45, 60].map(mins => (
                <button
                  key={mins}
                  onClick={() => setCountdownTarget(mins * 60)}
                  className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                    countdownTarget === mins * 60
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {mins}分
                </button>
              ))}
            </div>
          )}

          {/* 开始/暂停按钮 */}
          <div className="flex justify-center mb-4 sm:mb-8 px-2">
            <button
              onClick={handleStartLearning}
              className={`w-full sm:w-[280px] py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-base flex items-center justify-center gap-2 sm:gap-2.5 transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg hover:shadow-xl'
                  : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-xl'
              }`}
            >
              {isActive ? (
                <>
                  <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                  暂停计时
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                  开始学习
                </>
              )}
            </button>
          </div>

          {/* 提示信息 */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
            <Lightbulb className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-blue-600 leading-relaxed">{getModeDescription()}</p>
          </div>

          {/* 完成任务按钮 */}
          {isStarted && (
            <button
              onClick={handleComplete}
              className="w-full py-3 sm:py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl sm:rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
            >
              完成任务
            </button>
          )}
        </div>

        {/* 底部学习报告 */}
        <div className="border-t border-gray-100 shrink-0">
          <button
            onClick={() => setShowReport(!showReport)}
            className="w-full px-3 sm:px-5 py-3 sm:py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <span className="text-xs sm:text-sm text-gray-600 font-medium">学习报告 ({pomodoroCount})</span>
            <ChevronUp className={`w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 transition-transform ${showReport ? '' : 'rotate-180'}`} />
          </button>
        </div>
      </div>

      {/* 上传证明（隐藏） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}

// 完成反馈
function CompletionFeedback({ task, minutes }) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl p-6 sm:p-8 max-w-md w-full mx-2 sm:mx-4 text-center animate-scaleIn shadow-2xl">
        <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">🎉</div>
        <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-1.5 sm:mb-2">太棒了！</h3>
        <div className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
          <p className="text-sm sm:text-base text-gray-600">完成了：{task.title}</p>
          <p className="text-base sm:text-lg font-semibold text-indigo-600">获得积分：+{task.points} ⭐</p>
          <p className="text-xs sm:text-sm text-gray-500">用时：{minutes}分钟</p>
        </div>
        <div className="text-lg sm:text-2xl">✨ 继续加油！✨</div>
      </div>
    </div>
  );
}

// 已完成任务卡片（带展开详情）
function CompletedTaskCard({ task }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const record = task.todayRecord;
  const hasProof = record?.proof_type && record?.proof_data;

  return (
    <>
      <div className="bg-green-50 border-2 border-green-200 rounded-lg overflow-hidden">
        {/* 主内容 */}
        <div
          className="p-3 sm:p-4 cursor-pointer hover:bg-green-100 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-sm sm:text-base text-gray-800 truncate">{task.title}</div>
                <div className="text-xs sm:text-sm text-gray-600">
                  用时: {record?.actual_minutes || 0}分钟 • 获得 +{task.points}分
                  {hasProof && <span className="ml-1 sm:ml-2 text-blue-600">📷 有证明</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <Star className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 fill-yellow-500" />
              <ChevronDown className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </div>
          </div>
        </div>

        {/* 展开详情 */}
        {isExpanded && (
          <div className="border-t border-green-200 bg-green-100/50 p-3 sm:p-4">
            <div className="space-y-2 sm:space-y-3">
              {/* 准确用时 */}
              <div className="flex items-center gap-1.5 sm:gap-2 text-gray-700 text-sm sm:text-base">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                <span className="font-medium">准确用时：</span>
                <span>{record?.actual_minutes || 0} 分钟</span>
              </div>

              {/* 完成时间 */}
              {record?.completed_at && (
                <div className="flex items-center gap-1.5 sm:gap-2 text-gray-700 text-sm sm:text-base">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                  <span className="font-medium">完成时间：</span>
                  <span className="text-xs sm:text-sm">{new Date(record.completed_at).toLocaleString('zh-CN')}</span>
                </div>
              )}

              {/* 证明资料 */}
              {hasProof && (
                <div className="mt-2 sm:mt-3">
                  <div className="font-medium text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base">
                    <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                    上传的证明：
                  </div>

                  {record.proof_type === 'photo' ? (
                    <div
                      className="relative rounded-lg overflow-hidden border-2 border-green-300 cursor-pointer hover:border-green-400 transition-colors"
                      onClick={() => setShowImagePreview(true)}
                    >
                      <img
                        src={record.proof_data}
                        alt="完成证明"
                        className="w-full max-h-32 sm:max-h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="bg-white/90 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-700 opacity-0 hover:opacity-100 transition-opacity">
                          🔍 点击查看大图
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 bg-blue-50 border-2 border-blue-200 rounded-lg p-2.5 sm:p-3">
                      <Mic className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm sm:text-base text-gray-800">录音证明</div>
                        <div className="text-xs sm:text-sm text-gray-600 truncate">{record.proof_filename || 'audio-recording'}</div>
                      </div>
                      {record.proof_data && (
                        <audio controls className="w-full sm:w-auto sm:ml-auto h-8 shrink-0">
                          <source src={record.proof_data} type="audio/*" />
                        </audio>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 无证明提示 */}
              {!hasProof && (
                <div className="text-xs sm:text-sm text-gray-500 italic">
                  未上传完成证明
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 图片预览弹窗 */}
      {showImagePreview && hasProof && record.proof_type === 'photo' && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-2 sm:p-4"
          onClick={() => setShowImagePreview(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={record.proof_data}
              alt="完成证明"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setShowImagePreview(false)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/90 hover:bg-white rounded-full p-1.5 sm:p-2 transition-colors"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// 奖励页面
function RewardsPage({ rewards, totalPoints, redemptionRecords, onRedeem, onAddReward, onBack }) {
  const canAfford = (reward) => totalPoints >= reward.points;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 页面导航头部 */}
      <div className="bg-white rounded-xl shadow-md p-3 sm:p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-3 sm:mb-4 group"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm sm:text-base font-medium">返回首页</span>
        </button>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg sm:rounded-xl flex items-center justify-center">
            <Gift className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-800">奖励商店</h2>
            <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">使用积分兑换心仪的奖励</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
          <h3 className="text-base sm:text-lg font-semibold text-gray-700">可兑换奖励</h3>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg sm:rounded-xl shadow-lg">
              <div className="text-xs sm:text-sm opacity-90">当前积分</div>
              <div className="text-xl sm:text-2xl font-bold">{totalPoints}</div>
            </div>
            <button
              onClick={onAddReward}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium hover:shadow-lg transition-all flex items-center gap-1.5 sm:gap-2"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">添加奖励</span>
              <span className="sm:hidden">添加</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {rewards.map(reward => (
            <div
              key={reward.id}
              className={`border-2 rounded-lg sm:rounded-xl p-4 sm:p-6 transition-all ${
                canAfford(reward)
                  ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="text-3xl sm:text-4xl">{reward.icon}</div>
                  <div>
                    <div className="font-semibold text-base sm:text-lg text-gray-800">{reward.name}</div>
                    <div className="text-xs sm:text-sm text-gray-600">需要: {reward.points}分</div>
                  </div>
                </div>
                <div className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${
                  reward.reward_type === 'physical'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {reward.reward_type === 'physical' ? '实物' : '虚拟'}
                </div>
              </div>
              <button
                onClick={() => onRedeem(reward)}
                disabled={!canAfford(reward)}
                className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-sm sm:text-base font-medium transition-all ${
                  canAfford(reward)
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {canAfford(reward) ? '✅ 立即兑换' : `❌ 还差${reward.points - totalPoints}分`}
              </button>
            </div>
          ))}
        </div>

        {redemptionRecords.length > 0 && (
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-2 sm:mb-3">兑换记录</h3>
            <div className="space-y-2">
              {redemptionRecords.slice(0, 5).map(record => {
                const reward = rewards.find(r => r.id === record.reward_id);
                return (
                  <div key={record.id} className="bg-gray-50 border border-gray-200 rounded-lg p-2.5 sm:p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="text-xl sm:text-2xl">{reward?.icon}</div>
                      <div>
                        <div className="font-medium text-sm sm:text-base text-gray-800">{reward?.name}</div>
                        <div className="text-xs sm:text-sm text-gray-600">{record.redemption_date}</div>
                      </div>
                    </div>
                    <div className="text-red-600 font-semibold text-sm sm:text-base">-{record.points_spent}分</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 兑换确认模态框
function RedeemModal({ reward, currentPoints, onClose, onConfirm }) {
  return (
    <Modal onClose={onClose} title="确认兑换">
      <div className="space-y-3 sm:space-y-4">
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200 rounded-lg sm:rounded-xl p-4 sm:p-6 text-center">
          <div className="text-4xl sm:text-6xl mb-2 sm:mb-3">{reward.icon}</div>
          <div className="font-semibold text-lg sm:text-xl text-gray-800 mb-1 sm:mb-2">{reward.name}</div>
          <div className="text-base sm:text-lg text-gray-600">需要: {reward.points}分</div>
        </div>

        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between mb-1.5 sm:mb-2 text-sm sm:text-base">
            <span className="text-gray-700">当前积分</span>
            <span className="font-bold text-indigo-600">{currentPoints}分</span>
          </div>
          <div className="flex items-center justify-between mb-1.5 sm:mb-2 text-sm sm:text-base">
            <span className="text-gray-700">兑换消耗</span>
            <span className="font-bold text-red-600">-{reward.points}分</span>
          </div>
          <div className="border-t-2 border-indigo-300 pt-1.5 sm:pt-2 mt-1.5 sm:mt-2">
            <div className="flex items-center justify-between text-sm sm:text-base">
              <span className="font-semibold text-gray-800">剩余积分</span>
              <span className="font-bold text-green-600">{currentPoints - reward.points}分</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(reward)}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
          >
            确认兑换
          </button>
        </div>
      </div>
    </Modal>
  );
}

// 添加奖励模态框
function AddRewardModal({ onClose, onAdd }) {
  const [name, setName] = useState('');
  const [points, setPoints] = useState(50);
  const [icon, setIcon] = useState('🎁');
  const [type, setType] = useState('virtual');

  const iconOptions = ['🎮', '📺', '🧸', '🎁', '🍕', '🍦', '🎨', '⚽', '🎸', '📚', '🎬', '🎪'];

  return (
    <Modal onClose={onClose} title="添加奖励">
      <div className="space-y-3 sm:space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">奖励名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
            placeholder="例如：看电影一次"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">选择图标</label>
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {iconOptions.map(ico => (
              <button
                key={ico}
                onClick={() => setIcon(ico)}
                className={`text-2xl sm:text-3xl p-1.5 sm:p-2 rounded-lg border-2 transition-all ${
                  icon === ico
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {ico}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">奖励类型</label>
          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setType('virtual')}
              className={`flex-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                type === 'virtual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              虚拟奖励
            </button>
            <button
              onClick={() => setType('physical')}
              className={`flex-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all ${
                type === 'physical'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              实物奖励
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
            所需积分: {points}分
          </label>
          <input
            type="range"
            min="10"
            max="1000"
            step="10"
            value={points}
            onChange={(e) => setPoints(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="flex gap-2 sm:gap-3 pt-3 sm:pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              if (name.trim()) {
                onAdd({ name, points, icon, type });
              }
            }}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
          >
            添加奖励
          </button>
        </div>
      </div>
    </Modal>
  );
}

// 通用模态框组件
function Modal({ onClose, title, children }) {
  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl max-w-md w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between z-10">
          <h3 className="text-base sm:text-xl font-bold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
          </button>
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
