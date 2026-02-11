import React, { useState, useEffect, useRef } from 'react';
import { Calendar, Plus, Gift, Play, Check, Clock, Upload, Mic, Edit2, Trash2, X, Trophy, Target, BarChart3, ChevronLeft, ChevronRight, Zap, Award, Star } from 'lucide-react';

// 初始化默认数据
const getInitialData = () => {
  const saved = localStorage.getItem('learningQuestData');
  if (saved) return JSON.parse(saved);
  
  return {
    tasks: [
      { id: '1', title: '完成数学作业', points: 20, estimatedMinutes: 30, type: 'daily', status: 'pending', timeMode: 'duration' },
      { id: '2', title: '阅读课外书', points: 15, estimatedMinutes: 30, type: 'daily', status: 'pending', timeMode: 'duration' },
      { id: '3', title: '背单词20个', points: 10, startTime: '19:00', endTime: '19:30', type: 'daily', status: 'pending', timeMode: 'timeSlot' },
    ],
    completionRecords: [],
    rewards: [
      { id: 'r1', name: '玩游戏30分钟', points: 50, icon: '🎮', type: 'virtual' },
      { id: 'r2', name: '看电视1小时', points: 100, icon: '📺', type: 'virtual' },
      { id: 'r3', name: '乐高玩具套装', points: 500, icon: '🧸', type: 'physical' },
    ],
    redemptionRecords: [],
    totalPoints: 0
  };
};

export default function LearningQuest() {
  const [data, setData] = useState(getInitialData());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentPage, setCurrentPage] = useState('home');
  const [showModal, setShowModal] = useState(null);
  const [modalData, setModalData] = useState({});
  const [timerActive, setTimerActive] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [showDateDetails, setShowDateDetails] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('learningQuestData', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    if (timerActive) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerActive]);

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

  const getTodayTasks = () => {
    const today = formatDate(selectedDate);
    const dailyTasks = data.tasks.filter(t => t.type === 'daily');
    const onceTasks = data.tasks.filter(t => t.type === 'once' && t.date === today);
    
    const tasksWithStatus = [...dailyTasks, ...onceTasks].map(task => {
      const completed = data.completionRecords.find(r => 
        r.taskId === task.id && r.date === today
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
      if (a.timeMode === 'timeSlot' && b.timeMode !== 'timeSlot') return -1;
      if (a.timeMode !== 'timeSlot' && b.timeMode === 'timeSlot') return 1;
      
      // 都是时间段任务，按开始时间排序
      if (a.timeMode === 'timeSlot' && b.timeMode === 'timeSlot') {
        return (a.startTime || '').localeCompare(b.startTime || '');
      }
      
      // 都是时长任务，保持原顺序
      return 0;
    });
  };

  const getTodayStats = () => {
    const tasks = getTodayTasks();
    const completed = tasks.filter(t => t.todayCompleted);
    const totalTime = completed.reduce((sum, t) => sum + (t.todayRecord?.actualMinutes || 0), 0);
    
    return {
      total: tasks.length,
      completed: completed.length,
      completionRate: tasks.length > 0 ? Math.round(completed.length / tasks.length * 100) : 0,
      totalMinutes: totalTime
    };
  };

  const addTask = (task) => {
    const newTask = {
      ...task,
      id: Date.now().toString(),
      status: 'pending',
      type: 'daily'
    };
    setData(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
    setShowModal(null);
  };

  const startTimer = (task) => {
    setModalData({ task });
    setTimerSeconds(0);
    setTimerActive(true);
    setShowModal('timer');
  };

  const completeWithTimer = (proof) => {
    const task = modalData.task;
    const minutes = Math.round(timerSeconds / 60);
    completeTask(task, minutes, proof);
    setTimerActive(false);
    setTimerSeconds(0);
    setShowModal(null);
  };

  const quickComplete = (task, minutes, proof) => {
    completeTask(task, minutes, proof);
    setShowModal(null);
  };

  const completeTask = (task, actualMinutes, proof) => {
    const today = formatDate(selectedDate);
    const newRecord = {
      id: Date.now().toString(),
      taskId: task.id,
      date: today,
      completedAt: new Date().toISOString(),
      actualMinutes,
      pointsEarned: task.points,
      proof
    };
    
    setData(prev => ({
      ...prev,
      completionRecords: [...prev.completionRecords, newRecord],
      totalPoints: prev.totalPoints + task.points
    }));
    
    showCompletionFeedback(task, actualMinutes);
  };

  const showCompletionFeedback = (task, minutes) => {
    setModalData({ task, minutes });
    setShowModal('completionFeedback');
    setTimeout(() => setShowModal(null), 3000);
  };

  const redeemReward = (reward) => {
    if (data.totalPoints < reward.points) return;
    
    const newRedemption = {
      id: Date.now().toString(),
      rewardId: reward.id,
      date: formatDate(new Date()),
      pointsSpent: reward.points
    };
    
    setData(prev => ({
      ...prev,
      redemptionRecords: [...prev.redemptionRecords, newRedemption],
      totalPoints: prev.totalPoints - reward.points
    }));
    
    setShowModal(null);
  };

  const addReward = (reward) => {
    const newReward = {
      ...reward,
      id: Date.now().toString()
    };
    setData(prev => ({ ...prev, rewards: [...prev.rewards, newReward] }));
    setShowModal(null);
  };

  const stats = getTodayStats();
  const todayTasks = getTodayTasks();
  const pendingTasks = todayTasks.filter(t => !t.todayCompleted);
  const completedTasks = todayTasks.filter(t => t.todayCompleted);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* 顶部导航 */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              学习任务
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage('home')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentPage === 'home' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              首页
            </button>
            <button
              onClick={() => setCurrentPage('rewards')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentPage === 'rewards' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              奖励商店
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {currentPage === 'home' && (
          <>
            {/* 计划概览 */}
            <div className="bg-white rounded-2xl shadow-xl p-4 mb-6 border-2 border-indigo-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                  计划概览
                </h2>
                <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl shadow-lg">
                  <Trophy className="w-5 h-5" />
                  <div>
                    <div className="text-xs opacity-90">当前积分</div>
                    <div className="text-xl font-bold">{data.totalPoints}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mb-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border-2 border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-blue-600" />
                    <div className="text-xs text-blue-700 font-medium">计划数量</div>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{stats.total} 个</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="w-4 h-4 text-green-600" />
                    <div className="text-xs text-green-700 font-medium">完成数量</div>
                  </div>
                  <div className="text-2xl font-bold text-green-600">{stats.completed} 个</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border-2 border-purple-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-purple-600" />
                    <div className="text-xs text-purple-700 font-medium">完成率</div>
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{stats.completionRate}%</div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 border-2 border-orange-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <div className="text-xs text-orange-700 font-medium">用时</div>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.floor(stats.totalMinutes / 60)}h {stats.totalMinutes % 60}m
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-2 border-2 border-pink-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-pink-600" />
                    <span className="text-xs text-pink-700 font-medium">
                      {data.rewards.length > 0 && data.totalPoints < data.rewards[0].points
                        ? `距离 ${data.rewards[0].name} 还差 ${data.rewards[0].points - data.totalPoints} 分`
                        : '可以兑换奖励啦！'}
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentPage('rewards')}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:shadow-lg transition-all flex items-center gap-1"
                  >
                    <Gift className="w-3 h-3" />
                    去兑换
                  </button>
                </div>
              </div>
            </div>

            {/* 日期导航 */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000));
                      setShowDateDetails(true);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="text-lg font-semibold text-gray-800 min-w-[200px] text-center">
                    {showDateDetails ? (
                      <span>{formatDate(selectedDate)} ({formatDateChinese(selectedDate)})</span>
                    ) : (
                      <span>
                        {formatDate(selectedDate) === formatDate(new Date()) ? '今天' : formatDateChinese(selectedDate)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000));
                      setShowDateDetails(true);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                <button
                  onClick={() => setShowModal('calendar')}
                  className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  选择日期
                </button>
              </div>
            </div>

            {/* 任务列表 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">📝 任务列表</h3>
                <button
                  onClick={() => setShowModal('newTask')}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  新增任务
                </button>
              </div>

              {/* 待完成任务 */}
              {pendingTasks.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    待完成任务 ({pendingTasks.length}个)
                  </h4>
                  <div className="space-y-3">
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
                  <h4 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    已完成 ({completedTasks.length}个)
                  </h4>
                  <div className="space-y-2">
                    {completedTasks.map(task => (
                      <div key={task.id} className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                              <Check className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-800">{task.title}</div>
                              <div className="text-sm text-gray-600">
                                用时: {task.todayRecord.actualMinutes}分钟 • 获得 +{task.points}分
                              </div>
                            </div>
                          </div>
                          <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {todayTasks.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Target className="w-16 h-16 mx-auto mb-3 opacity-50" />
                  <p>今天还没有任务，点击上方按钮添加吧！</p>
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
          seconds={timerSeconds}
          isActive={timerActive}
          onToggle={() => setTimerActive(!timerActive)}
          onComplete={completeWithTimer}
          onClose={() => {
            setTimerActive(false);
            setShowModal(null);
          }}
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
      
      {showModal === 'calendar' && (
        <CalendarModal
          selectedDate={selectedDate}
          onClose={() => setShowModal(null)}
          onSelectDate={(date) => {
            setSelectedDate(date);
            setShowDateDetails(false);
            setShowModal(null);
          }}
        />
      )}
    </div>
  );
}

// 任务卡片组件
function TaskCard({ task, onStartTimer, onQuickComplete }) {
  return (
    <div className="bg-gradient-to-br from-white to-indigo-50 border-2 border-indigo-200 rounded-xl p-4 hover:shadow-lg transition-all">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="font-semibold text-lg text-gray-800 mb-2">{task.title}</div>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              {task.points}分
            </span>
            {task.timeMode === 'duration' ? (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-blue-500" />
                预计{task.estimatedMinutes}分钟
              </span>
            ) : (
              <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                🕐 {task.startTime} - {task.endTime}
              </span>
            )}
            {task.description && (
              <span className="text-gray-500 text-xs">· {task.description}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => onStartTimer(task)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2.5 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            开始
          </button>
          <button
            onClick={() => onQuickComplete(task)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2.5 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
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

  const handleSubmit = () => {
    if (!title.trim()) return;
    
    const taskData = {
      title: title.trim(),
      description: description.trim(),
      points,
      timeMode
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="text-xl font-bold">📋 新增学习计划</h3>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-5">
          {/* 计划名称 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Star className="w-4 h-4 text-purple-600" />
              计划名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如：完成数学作业"
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* 备注 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Edit2 className="w-4 h-4 text-green-600" />
              备注 <span className="text-gray-400 text-xs font-normal">(可选)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例如：完成练习册第10-15页的题目"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:outline-none min-h-[80px] resize-none"
            />
          </div>

          {/* 时间模式选择 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Clock className="w-4 h-4 text-orange-600" />
              时间设置 <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setTimeMode('duration')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all border-2 ${
                  timeMode === 'duration'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <Clock className="w-5 h-5" />
                  <span>时长模式</span>
                </div>
              </button>
              <button
                onClick={() => setTimeMode('timeSlot')}
                className={`flex-1 px-4 py-3 rounded-lg font-medium transition-all border-2 ${
                  timeMode === 'timeSlot'
                    ? 'bg-purple-500 text-white border-purple-500'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="flex flex-col items-center gap-1">
                  <Calendar className="w-5 h-5" />
                  <span>时间段模式</span>
                </div>
              </button>
            </div>

            {/* 时长模式输入 */}
            {timeMode === 'duration' && (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">预计时长</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    value={minutes}
                    onChange={(e) => setMinutes(parseInt(e.target.value) || 0)}
                    min="1"
                    className="flex-1 px-4 py-2.5 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  />
                  <span className="text-gray-700 font-medium">分钟</span>
                </div>
              </div>
            )}

            {/* 时间段模式输入 */}
            {timeMode === 'timeSlot' && (
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">开始时间</label>
                    <div className="flex items-center gap-2 bg-white border-2 border-purple-300 rounded-lg px-3 py-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        className="flex-1 outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">结束时间</label>
                    <div className="flex items-center gap-2 bg-white border-2 border-purple-300 rounded-lg px-3 py-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        className="flex-1 outline-none"
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  💡 设置固定的时间段，例如：19:00-19:30
                </p>
              </div>
            )}
          </div>

          {/* 积分奖励 */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              完成奖励积分
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={points}
                  onChange={(e) => setPoints(parseInt(e.target.value))}
                  className="flex-1"
                />
                <div className="flex items-center gap-1 min-w-[80px] bg-yellow-100 px-3 py-1.5 rounded-lg">
                  <span className="text-lg font-bold text-yellow-600">{points}</span>
                  <span className="text-sm text-gray-600">分</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                拖动滑块调整积分（5-100分）
              </div>
            </div>
          </div>

          {/* 底部按钮 */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
  const [minutes, setMinutes] = useState(task.estimatedMinutes || 30);
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
      <div className="space-y-4">
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
          <div className="font-semibold text-lg text-gray-800 mb-1">{task.title}</div>
          <div className="text-sm text-gray-600">奖励: {task.points}分</div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">实际用时（分钟）</label>
          <input
            type="number"
            value={minutes}
            onChange={(e) => setMinutes(parseInt(e.target.value))}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">完成证明</label>
          <div className="flex gap-3 mb-3">
            <button
              onClick={() => setProofType('photo')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                proofType === 'photo'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              📷 上传照片
            </button>
            <button
              onClick={() => setProofType('audio')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
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
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-lg text-gray-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
          >
            {proofType === 'photo' ? <Upload className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {proofData ? proofData.fileName : `点击上传${proofType === 'photo' ? '照片' : '录音'}`}
          </button>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onComplete(task, minutes, proofData)}
            disabled={!proofData}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            完成任务
          </button>
        </div>
      </div>
    </Modal>
  );
}

// 计时器模态框
function TimerModal({ task, seconds, isActive, onToggle, onComplete, onClose }) {
  const [proofData, setProofData] = useState(null);
  const fileInputRef = useRef(null);

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

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <Modal onClose={onClose} title="计时器">
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6 text-center">
          <div className="font-semibold text-xl text-gray-800 mb-4">{task.title}</div>
          <div className="text-6xl font-bold text-indigo-600 mb-6 font-mono">
            {formatTime(seconds)}
          </div>
          <button
            onClick={onToggle}
            className={`px-8 py-3 rounded-xl font-medium text-lg transition-all ${
              isActive
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-lg text-white'
            }`}
          >
            {isActive ? '⏸️ 暂停' : '▶️ 开始'}
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">完成证明</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,audio/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-lg text-gray-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            {proofData ? proofData.fileName : '点击上传照片或录音'}
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onComplete(proofData)}
            disabled={!proofData}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            完成任务
          </button>
        </div>
      </div>
    </Modal>
  );
}

// 完成反馈
function CompletionFeedback({ task, minutes }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center animate-scaleIn">
        <div className="text-6xl mb-4">🎉</div>
        <h3 className="text-2xl font-bold text-gray-800 mb-2">太棒了！</h3>
        <div className="space-y-2 mb-6">
          <p className="text-gray-600">完成了：{task.title}</p>
          <p className="text-lg font-semibold text-indigo-600">获得积分：+{task.points} ⭐</p>
          <p className="text-sm text-gray-500">用时：{minutes}分钟</p>
        </div>
        <div className="text-2xl">✨ 继续加油！✨</div>
      </div>
    </div>
  );
}

// 奖励页面
function RewardsPage({ rewards, totalPoints, redemptionRecords, onRedeem, onAddReward }) {
  const canAfford = (reward) => totalPoints >= reward.points;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Gift className="w-7 h-7 text-pink-600" />
            奖励商店
          </h2>
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl shadow-lg">
              <div className="text-sm opacity-90">当前积分</div>
              <div className="text-2xl font-bold">{totalPoints}</div>
            </div>
            <button
              onClick={onAddReward}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              添加奖励
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {rewards.map(reward => (
            <div
              key={reward.id}
              className={`border-2 rounded-xl p-6 transition-all ${
                canAfford(reward)
                  ? 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">{reward.icon}</div>
                  <div>
                    <div className="font-semibold text-lg text-gray-800">{reward.name}</div>
                    <div className="text-sm text-gray-600">需要: {reward.points}分</div>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  reward.type === 'physical'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {reward.type === 'physical' ? '实物' : '虚拟'}
                </div>
              </div>
              <button
                onClick={() => onRedeem(reward)}
                disabled={!canAfford(reward)}
                className={`w-full px-4 py-2.5 rounded-lg font-medium transition-all ${
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
            <h3 className="text-lg font-bold text-gray-800 mb-3">兑换记录</h3>
            <div className="space-y-2">
              {redemptionRecords.slice(-5).reverse().map(record => {
                const reward = rewards.find(r => r.id === record.rewardId);
                return (
                  <div key={record.id} className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{reward?.icon}</div>
                      <div>
                        <div className="font-medium text-gray-800">{reward?.name}</div>
                        <div className="text-sm text-gray-600">{record.date}</div>
                      </div>
                    </div>
                    <div className="text-red-600 font-semibold">-{record.pointsSpent}分</div>
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
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 border-2 border-pink-200 rounded-xl p-6 text-center">
          <div className="text-6xl mb-3">{reward.icon}</div>
          <div className="font-semibold text-xl text-gray-800 mb-2">{reward.name}</div>
          <div className="text-lg text-gray-600">需要: {reward.points}分</div>
        </div>

        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700">当前积分</span>
            <span className="font-bold text-indigo-600">{currentPoints}分</span>
          </div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-700">兑换消耗</span>
            <span className="font-bold text-red-600">-{reward.points}分</span>
          </div>
          <div className="border-t-2 border-indigo-300 pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">剩余积分</span>
              <span className="font-bold text-green-600">{currentPoints - reward.points}分</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => onConfirm(reward)}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
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
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">奖励名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-indigo-500 focus:outline-none"
            placeholder="例如：看电影一次"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">选择图标</label>
          <div className="grid grid-cols-6 gap-2">
            {iconOptions.map(ico => (
              <button
                key={ico}
                onClick={() => setIcon(ico)}
                className={`text-3xl p-2 rounded-lg border-2 transition-all ${
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
          <label className="block text-sm font-medium text-gray-700 mb-2">奖励类型</label>
          <div className="flex gap-3">
            <button
              onClick={() => setType('virtual')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                type === 'virtual'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              虚拟奖励
            </button>
            <button
              onClick={() => setType('physical')}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
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

        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => {
              if (name.trim()) {
                onAdd({ name, points, icon, type });
              }
            }}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg font-medium hover:shadow-lg transition-all"
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// 日历选择器组件
function CalendarModal({ selectedDate, onClose, onSelectDate }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const days = getDaysInMonth(currentMonth);
  const monthYear = `${currentMonth.getFullYear()}年${currentMonth.getMonth() + 1}月`;
  
  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };
  
  const isSelected = (date) => {
    if (!date) return false;
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  return (
    <Modal onClose={onClose} title="选择日期">
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-lg font-semibold text-gray-800">{monthYear}</div>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['日', '一', '二', '三', '四', '五', '六'].map(day => (
            <div key={day} className="text-center text-sm font-medium text-gray-600 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => (
            <button
              key={index}
              onClick={() => date && onSelectDate(date)}
              disabled={!date}
              className={`
                aspect-square p-2 rounded-lg text-sm font-medium transition-all
                ${!date ? 'invisible' : ''}
                ${isSelected(date) ? 'bg-indigo-600 text-white' : ''}
                ${isToday(date) && !isSelected(date) ? 'bg-indigo-100 text-indigo-700' : ''}
                ${date && !isSelected(date) && !isToday(date) ? 'hover:bg-gray-100 text-gray-700' : ''}
              `}
            >
              {date?.getDate()}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => onSelectDate(new Date())}
            className="flex-1 px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg font-medium transition-colors"
          >
            今天
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    </Modal>
  );
}