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

    try {
      const result = await subscriptionService.redeemCode(userId, code);
      setSuccess(result);
      // 2秒后关闭并刷新状态
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || '兑换失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 自动格式化兑换码输入
  const formatCode = (value) => {
    // 去除非字母数字字符，转大写
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // 格式化为 VIP-XXXX-XXXX
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 7) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7, 11)}`;
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
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 sm:p-6">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle className="w-14 h-14 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-lg sm:text-xl font-bold text-gray-800 mb-2">兑换成功！</h4>
              <p className="text-sm sm:text-base text-gray-600">{success.message}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  请输入兑换码
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(formatCode(e.target.value))}
                  placeholder="VIP-XXXX-XXXX"
                  maxLength={13}
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-base sm:text-lg font-mono text-center border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none uppercase"
                  autoFocus
                />
                <p className="text-[10px] sm:text-xs text-gray-500 mt-2 text-center">
                  兑换码格式：VIP-A8X2-K9M3
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-lg p-3 text-red-600">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                  <span className="text-xs sm:text-sm">{error}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={loading || code.length < 13}
                  className="flex-1 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      兑换中...
                    </>
                  ) : (
                    '立即兑换'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
