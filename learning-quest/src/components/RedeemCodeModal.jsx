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

    // 兑换会员码 - 处理不存在情况
    setLoading(true);

    try {
      const result = await subscriptionService.redeemCode(userId, code);

      // 处理兑换失败或不存在的各种情况
      if (!result.success) {
        setLoading(false);

        // 根据不同的失败原因显示不同提示
        if (result.code === null) {
          // 兑换码不存在
          setError('兑换码不存在，请检查后重试');
          alert('兑换码不存在，请检查后重试');
        } else if (result.code) {
          // 兑换码已被使用
          setError('该兑换码已被使用');
          alert('该兑换码已被使用');
        } else if (result.message) {
          // 其他错误（会员已过期等）
          setError(result.message);
          alert(result.message);
        }

        // 2秒后关闭
        setTimeout(() => {
          if (result.success) {
            // 兑换成功，需要关闭弹窗并刷新
            if (onSuccess) onRefresh();
            onClose();
            alert('会员激活成功！');
          } else {
            // 失败，只关闭弹窗
            onClose();
          }
        }, 2000);
      } else {
        // 兑换成功
        setLoading(false);
        setError('');

        // 2秒后关闭并显示成功提示
        setTimeout(() => {
          if (onSuccess) onRefresh();
          onClose();
          alert('会员激活成功！');
        }, 2000);
      }
    } catch (err) {
      setLoading(false);
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
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 sm:p-6">
        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="w-14 h-14 sm:w-16 sm:h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">兑换成功！</h3>
            <p className="text-sm sm:text-base text-gray-600">{success.message}</p>
            <button
              onClick={() => {
                if (onSuccess) onRefresh();
                onClose();
              }}
              className="mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2 rounded-lg font-medium hover:shadow-lg transition-all"
            >
              确定
            </button>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <AlertTriangle className="w-10 h-10 sm:w-12 sm:h-12 text-red-500 mx-auto mb-3" />
                <p className="text-center text-red-800 font-semibold">兑换失败</p>
                <p className="text-center text-sm text-red-600 mt-1">{error}</p>
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
                  className="w-full px-3 sm:px-4 py-2 sm:py-3 text-base sm:text-lg font-mono text-center border-2 border-gray-200 rounded-lg focus:border-amber-500 focus:outline-none uppercase"
                  autoFocus
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 text-center mt-1">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading || code.length < 13}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
