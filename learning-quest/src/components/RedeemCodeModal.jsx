import React, { useState } from 'react';
import { X, Gift, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { subscriptionService } from '../services/dataService';

/**
 * 兑换码输入弹窗组件
 * @param {String} userId - 用户ID
 * @param {Function} onClose - 关闭弹窗回调
 * @param {Function} onSuccess - 兑换成功回调
 */
export default function RedeemCodeModal({ userId, onClose, onSuccess }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('请输入兑换码');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const result = await subscriptionService.redeemCode(userId, code);
      setLoading(false);

      // 处理兑换结果
      if (!result.success) {
        // 兑换失败
        setError(result.message || '兑换失败，请重试');
      } else {
        // 兑换成功 - 设置成功状态
        setSuccess(result);

        // 2.5秒后自动关闭并刷新
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 2500);
      }
    } catch (err) {
      setLoading(false);
      setError(err.message || '兑换失败，请重试');
    }
  };

  // 直接返回大写
  const formatCode = (value) => {
    return value.toUpperCase();
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-scaleIn">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
            <h3 className="text-base sm:text-xl font-bold">兑换会员码</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 sm:p-6">
          {success ? (
            /* 成功状态 - 庆祝效果 */
            <div className="text-center py-8">
              {/* 成功图标 */}
              <div className="relative inline-block mb-6">
                <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
                <CheckCircle className="w-20 h-20 sm:w-24 sm:h-24 text-green-500 relative z-10 mx-auto" />
              </div>

              {/* 成功标题 */}
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 animate-bounce">
                🎉 兑换成功！
              </h3>

              {/* 成功信息 */}
              <p className="text-base sm:text-lg text-gray-700 mb-6 font-medium">
                {success.message}
              </p>

              {/* 确定按钮 */}
              <button
                onClick={() => {
                  if (onSuccess) onSuccess();
                  onClose();
                }}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
              >
                确定
              </button>
            </div>
          ) : (
            /* 输入表单 */
            <>
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4 animate-shake">
                  <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-2" />
                  <p className="text-center text-red-800 font-bold text-base sm:text-lg mb-1">兑换失败</p>
                  <p className="text-center text-sm sm:text-base text-red-600">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    请输入兑换码
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(formatCode(e.target.value))}
                    placeholder="VIP-A8X2-K9M3"
                    maxLength={13}
                    disabled={loading}
                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-base sm:text-lg font-mono text-center border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 uppercase disabled:bg-gray-100 disabled:cursor-not-allowed"
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-xs text-red-500 text-center mt-1">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || code.length < 13}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transform hover:scale-105 active:scale-95"
                >
                  {loading ? (
                    <>
                      <Loader className="w-5 h-5 sm:w-6 sm:h-6 animate-spin" />
                      <span className="ml-2">兑换中...</span>
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5 sm:w-6 sm:h-6" />
                      <span>立即兑换</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
