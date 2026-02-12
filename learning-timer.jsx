import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, Clock, TrendingUp, Timer, Target, Mic, ChevronDown, Volume2, Check, Upload } from 'lucide-react';

export default function LearningTimer({ task, onBack, onComplete }) {
  const [activeTab, setActiveTab] = useState('forward'); // forward, countdown, pomodoro
  const [timerStatus, setTimerStatus] = useState('idle'); // idle, running, paused
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [showRecordingPanel, setShowRecordingPanel] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  // 完成任务相关
  const [showCompletePanel, setShowCompletePanel] = useState(false);
  const [proofData, setProofData] = useState(null);
  const fileInputRef = useRef(null);

  // 倒计时设置
  const [countdownHours, setCountdownHours] = useState(0);
  const [countdownMinutes, setCountdownMinutes] = useState(task?.estimated_minutes || 25);
  const [countdownSeconds, setCountdownSeconds] = useState(0);

  // 番茄钟状态
  const [pomodoroMode, setPomodoroMode] = useState('work'); // work or break
  const [pomodoroCount, setPomodoroCount] = useState(0);

  const timerRef = useRef(null);
  const recordingRef = useRef(null);

  // 切换标签时重置计时器
  useEffect(() => {
    resetTimer();
  }, [activeTab]);

  // 初始化时设置番茄钟时间
  useEffect(() => {
    if (activeTab === 'pomodoro' && timerStatus === 'idle') {
      setMinutes(25);
    }
  }, []);

  // 计时器逻辑
  useEffect(() => {
    if (timerStatus === 'running') {
      timerRef.current = setInterval(() => {
        if (activeTab === 'forward') {
          // 正计时：向上计数
          setSeconds(s => {
            if (s === 59) {
              setMinutes(m => {
                if (m === 59) {
                  setHours(h => h + 1);
                  return 0;
                }
                return m + 1;
              });
              return 0;
            }
            return s + 1;
          });
        } else if (activeTab === 'countdown') {
          // 倒计时：向下计数
          setSeconds(s => {
            if (s === 0) {
              setMinutes(m => {
                if (m === 0) {
                  setHours(h => {
                    if (h === 0) {
                      // 倒计时结束
                      setTimerStatus('idle');
                      alert('⏰ 倒计时结束！');
                      return 0;
                    }
                    return h - 1;
                  });
                  return 59;
                }
                return m - 1;
              });
              return 59;
            }
            return s - 1;
          });
        } else if (activeTab === 'pomodoro') {
          // 番茄钟：向下计数
          setSeconds(s => {
            if (s === 0) {
              setMinutes(m => {
                if (m === 0) {
                  // 番茄钟阶段结束
                  if (pomodoroMode === 'work') {
                    // 工作结束，开始休息
                    setPomodoroMode('break');
                    setMinutes(4);
                    setSeconds(59);
                    setPomodoroCount(c => c + 1);
                    alert('🍅 工作时间结束！开始休息5分钟');
                  } else {
                    // 休息结束，开始工作
                    setPomodoroMode('work');
                    setMinutes(24);
                    setSeconds(59);
                    alert('💪 休息结束！开始新的番茄钟');
                  }
                  return m;
                }
                return m - 1;
              });
              return 59;
            }
            return s - 1;
          });
        }
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerStatus, activeTab, pomodoroMode]);

  // 录音计时逻辑
  useEffect(() => {
    if (isRecording) {
      recordingRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } else {
      clearInterval(recordingRef.current);
    }
    return () => clearInterval(recordingRef.current);
  }, [isRecording]);

  const toggleTimer = () => {
    if (timerStatus === 'idle') {
      // 开始前检查倒计时是否设置了时间
      if (activeTab === 'countdown' && hours === 0 && minutes === 0 && seconds === 0) {
        alert('⚠️ 请先设置倒计时时长！');
        return;
      }
      setTimerStatus('running');
    } else if (timerStatus === 'running') {
      setTimerStatus('paused');
    } else {
      setTimerStatus('running');
    }
  };

  const resetTimer = () => {
    setTimerStatus('idle');
    if (activeTab === 'forward') {
      setHours(0);
      setMinutes(0);
      setSeconds(0);
    } else if (activeTab === 'countdown') {
      setHours(countdownHours);
      setMinutes(countdownMinutes);
      setSeconds(countdownSeconds);
    } else if (activeTab === 'pomodoro') {
      setPomodoroMode('work');
      setPomodoroCount(0);
      setHours(0);
      setMinutes(25);
      setSeconds(0);
    }
  };

  const formatRecordingTime = () => {
    const mins = Math.floor(recordingTime / 60);
    const secs = recordingTime % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getStatusText = () => {
    if (timerStatus === 'idle') return '未开始';
    if (timerStatus === 'running') return '进行中...';
    return '已暂停';
  };

  // 处理文件上传
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
    const actualMinutes = hours * 60 + minutes + Math.ceil(seconds / 60);
    onComplete(proofData, actualMinutes);
  };

  // 获取总用时（秒）
  const getTotalSeconds = () => hours * 3600 + minutes * 60 + seconds;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 relative overflow-hidden">
      {/* 顶部导航栏 */}
      <div className="relative z-10 px-6 py-4">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-white hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm font-medium">返回</span>
          </button>
          <button className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm">
            自定义
          </button>
        </div>

        <div className="text-center text-white mb-8">
          <h1 className="text-3xl font-bold mb-2">{task?.title || '学习任务'}</h1>
          {task?.description && <p className="text-sm opacity-90">{task.description}</p>}
        </div>
      </div>

      {/* 主内容卡片 */}
      <div className="relative z-10 px-4 pb-20">
        <div className="bg-white rounded-3xl shadow-2xl max-w-4xl mx-auto overflow-hidden">
          {/* 标签页和暂定按钮 */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('forward')}
                className={`relative pb-3 transition-colors ${
                  activeTab === 'forward' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">正计</span>
                </div>
                {activeTab === 'forward' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
                )}
              </button>

              <button
                onClick={() => setActiveTab('countdown')}
                className={`relative pb-3 transition-colors ${
                  activeTab === 'countdown' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4" />
                  <span className="font-medium">倒计</span>
                </div>
                {activeTab === 'countdown' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
                )}
              </button>

              <button
                onClick={() => setActiveTab('pomodoro')}
                className={`relative pb-3 transition-colors ${
                  activeTab === 'pomodoro' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  <span className="font-medium">番茄</span>
                </div>
                {activeTab === 'pomodoro' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
                )}
              </button>
            </div>

            <button className="bg-green-50 hover:bg-green-100 text-green-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              暂定
            </button>
          </div>

          {/* 计时器主体 */}
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-2 mb-6">
                {activeTab === 'forward' && <TrendingUp className="w-6 h-6 text-blue-600" />}
                {activeTab === 'countdown' && <Timer className="w-6 h-6 text-purple-600" />}
                {activeTab === 'pomodoro' && <Target className="w-6 h-6 text-orange-600" />}
                <h2 className="text-2xl font-bold text-gray-800">
                  {activeTab === 'forward' && '正计时'}
                  {activeTab === 'countdown' && '倒计时'}
                  {activeTab === 'pomodoro' && '番茄钟'}
                </h2>
              </div>

              {/* 番茄钟状态显示 */}
              {activeTab === 'pomodoro' && (
                <div className="mb-4 space-y-2">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
                    pomodoroMode === 'work' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {pomodoroMode === 'work' ? '💼 工作时间' : '☕ 休息时间'}
                  </div>
                  <div className="text-sm text-gray-600">
                    已完成 {pomodoroCount} 个番茄钟
                  </div>
                </div>
              )}

              {/* 倒计时设置 */}
              {activeTab === 'countdown' && timerStatus === 'idle' && (
                <div className="mb-6 bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                  <p className="text-sm text-purple-700 mb-3 font-semibold">设置倒计时时长：</p>
                  <div className="flex items-center justify-center gap-4">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">小时</label>
                      <input
                        type="number"
                        min="0"
                        max="23"
                        value={countdownHours}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setCountdownHours(val);
                          setHours(val);
                        }}
                        className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg text-center font-semibold focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div className="text-2xl text-gray-400 mt-6">:</div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">分钟</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={countdownMinutes}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setCountdownMinutes(val);
                          setMinutes(val);
                        }}
                        className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg text-center font-semibold focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div className="text-2xl text-gray-400 mt-6">:</div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">秒</label>
                      <input
                        type="number"
                        min="0"
                        max="59"
                        value={countdownSeconds}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setCountdownSeconds(val);
                          setSeconds(val);
                        }}
                        className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg text-center font-semibold focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 时间显示 */}
              <div className="flex items-center justify-center gap-4 mb-6">
                {/* 小时 */}
                <div className="relative group">
                  <div className={`w-32 h-32 rounded-3xl shadow-lg flex items-center justify-center transform transition-transform group-hover:scale-105 ${
                    activeTab === 'forward' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                    activeTab === 'countdown' ? 'bg-gradient-to-br from-purple-500 to-purple-600' :
                    pomodoroMode === 'work' ? 'bg-gradient-to-br from-orange-500 to-red-500' : 'bg-gradient-to-br from-green-500 to-emerald-600'
                  }`}>
                    <span className="text-8xl font-bold text-white">
                      {String(hours).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-2 font-medium text-center">小时</div>
                </div>

                <div className="text-6xl text-gray-400 font-bold mb-6">:</div>

                {/* 分钟 */}
                <div className="relative group">
                  <div className={`w-32 h-32 rounded-3xl shadow-lg flex items-center justify-center transform transition-transform group-hover:scale-105 ${
                    activeTab === 'forward' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                    activeTab === 'countdown' ? 'bg-gradient-to-br from-pink-500 to-rose-500' :
                    pomodoroMode === 'work' ? 'bg-gradient-to-br from-red-500 to-pink-500' : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                  }`}>
                    <span className="text-8xl font-bold text-white">
                      {String(minutes).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-2 font-medium text-center">分钟</div>
                </div>

                <div className="text-6xl text-gray-400 font-bold mb-6">:</div>

                {/* 秒 */}
                <div className="relative group">
                  <div className={`w-32 h-32 rounded-3xl shadow-lg flex items-center justify-center transform transition-transform group-hover:scale-105 ${
                    activeTab === 'forward' ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                    activeTab === 'countdown' ? 'bg-gradient-to-br from-rose-500 to-red-500' :
                    pomodoroMode === 'work' ? 'bg-gradient-to-br from-pink-500 to-purple-500' : 'bg-gradient-to-br from-teal-500 to-cyan-600'
                  }`}>
                    <span className="text-8xl font-bold text-white">
                      {String(seconds).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-2 font-medium text-center">秒</div>
                </div>
              </div>

              {/* 状态文字 */}
              <div className="text-sm text-gray-400 mb-8">{getStatusText()}</div>

              {/* 开始学习按钮 */}
              <button
                onClick={toggleTimer}
                className={`px-24 py-4 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center gap-3 mx-auto text-white ${
                  activeTab === 'forward' ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700' :
                  activeTab === 'countdown' ? 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700' :
                  pomodoroMode === 'work' ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700' :
                  'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700'
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  {timerStatus === 'running' ? (
                    <>
                      <rect x="6" y="4" width="4" height="16" />
                      <rect x="14" y="4" width="4" height="16" />
                    </>
                  ) : (
                    <path d="M8 5v14l11-7z" />
                  )}
                </svg>
                {timerStatus === 'running' ? '暂停学习' : timerStatus === 'paused' ? '继续学习' : '开始学习'}
              </button>

              {timerStatus !== 'idle' && (
                <button
                  onClick={resetTimer}
                  className="mt-4 text-gray-500 hover:text-gray-700 text-sm font-medium"
                >
                  重置计时器
                </button>
              )}
            </div>

            {/* 提示信息 */}
            <div className={`border-2 rounded-xl p-4 flex items-start gap-3 ${
              activeTab === 'forward' ? 'bg-blue-50 border-blue-200' :
              activeTab === 'countdown' ? 'bg-purple-50 border-purple-200' :
              'bg-orange-50 border-orange-200'
            }`}>
              <div className={
                activeTab === 'forward' ? 'text-blue-600' :
                activeTab === 'countdown' ? 'text-purple-600' :
                'text-orange-600'
              }>💡</div>
              <p className={`text-sm ${
                activeTab === 'forward' ? 'text-blue-700' :
                activeTab === 'countdown' ? 'text-purple-700' :
                'text-orange-700'
              }`}>
                {activeTab === 'forward' && (
                  <>
                    <span className="font-semibold">正计时概况：</span>自由计时，适合宽松定义学习时间
                  </>
                )}
                {activeTab === 'countdown' && (
                  <>
                    <span className="font-semibold">倒计时概况：</span>设定目标时间，倒数计时提醒学习进度
                  </>
                )}
                {activeTab === 'pomodoro' && (
                  <>
                    <span className="font-semibold">番茄钟概况：</span>25分钟专注学习 + 5分钟休息，高效学习法
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* 学习报告按钮 */}
        <div className="mt-6 flex justify-center gap-4">
          <button
            onClick={() => setShowRecordingPanel(!showRecordingPanel)}
            className="bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
          >
            <Mic className="w-4 h-4 text-green-600" />
            <span className="font-medium">学习报告 ({pomodoroCount})</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showRecordingPanel ? 'rotate-180' : ''}`} />
          </button>

          {/* 完成任务按钮 */}
          {timerStatus !== 'idle' && (
            <button
              onClick={() => setShowCompletePanel(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
            >
              <Check className="w-4 h-4" />
              <span className="font-medium">完成任务</span>
            </button>
          )}
        </div>
      </div>

      {/* 录音面板 - 从底部弹出 */}
      {showRecordingPanel && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20"
            onClick={() => setShowRecordingPanel(false)}
          ></div>

          {/* 录音面板 */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl shadow-2xl animate-slideUp">
            <div className="p-8">
              <div className="flex items-center justify-between max-w-2xl mx-auto">
                {/* 左侧：录音时间显示 */}
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <div className="text-3xl font-bold text-gray-800 font-mono">
                    {formatRecordingTime()}
                  </div>
                </div>

                {/* 中间：录音按钮 */}
                <button
                  onClick={() => {
                    setIsRecording(!isRecording);
                    if (!isRecording) {
                      setRecordingTime(0);
                    }
                  }}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105 flex items-center gap-3"
                >
                  <Mic className="w-5 h-5" />
                  {isRecording ? '停止录音' : '开始录音'}
                </button>

                {/* 右侧：用时显示 */}
                <div className="flex items-center gap-2 text-gray-500">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">用时 {Math.floor((hours * 60 + minutes))} 分钟</span>
                </div>
              </div>

              {/* 准备录音提示 */}
              {!isRecording && recordingTime === 0 && (
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-500">准备录音</p>
                </div>
              )}

              {/* 录音中提示 */}
              {isRecording && (
                <div className="text-center mt-4">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <p className="text-sm text-red-500 font-medium">正在录音中...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* 完成任务面板 */}
      {showCompletePanel && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20"
            onClick={() => setShowCompletePanel(false)}
          ></div>

          {/* 完成面板 */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white rounded-t-3xl shadow-2xl animate-slideUp">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4 text-center">完成任务</h3>

              {/* 任务信息 */}
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4 mb-4">
                <div className="font-semibold text-lg text-gray-800 mb-1">{task?.title}</div>
                <div className="text-sm text-gray-600">
                  已用时: {hours}小时{minutes}分钟 • 奖励: +{task?.points || 0}分
                </div>
              </div>

              {/* 上传证明 */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">完成证明（可选）</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-3 border-2 border-dashed border-gray-300 hover:border-indigo-500 rounded-xl text-gray-600 hover:text-indigo-600 transition-all flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  {proofData ? proofData.fileName : '点击上传照片或录音'}
                </button>
              </div>

              {/* 按钮组 */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCompletePanel(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                >
                  继续学习
                </button>
                <button
                  onClick={handleComplete}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  确认完成
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,audio/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      <style jsx>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}