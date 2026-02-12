import React, { useState } from 'react';
import { Crown, Lock, Gift, X, Star, Sparkles, Check, ExternalLink } from 'lucide-react';

/**
 * 会员功能锁定提示弹窗
 * @param {Function} onRedeemCode - 点击兑换码按钮的回调
 * @param {Function} onClose - 关闭弹窗回调
 */
export default function MembershipLockModal({ onRedeemCode, onClose }) {
  const [selectedPlan, setSelectedPlan] = useState('lifetime');

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-scaleIn my-4">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-white/80 hover:bg-white rounded-full shadow-md transition-colors"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        <div className="p-6 sm:p-8">
          {/* 标题区域 */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl sm:rounded-3xl mb-4 shadow-lg">
              <Crown className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">解锁高级功能</h2>
            <p className="text-sm sm:text-base text-gray-600">升级会员，享受更多专属特权</p>
          </div>

          {/* 当前状态 */}
          <div className="bg-white rounded-2xl p-4 mb-6 border-2 border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-800 text-sm sm:text-base">试用用户</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">会员已过期，请续费使用进阶功能</p>
                </div>
              </div>
              <span className="bg-red-500 text-white px-3 py-1 rounded-lg text-xs sm:text-sm font-medium">
                已过期
              </span>
            </div>
          </div>

          {/* 套餐选择 */}
          <div className="mb-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-800 mb-3">选择您的套餐</h3>
            <div className="grid grid-cols-2 gap-3">
              {/* 年度会员 */}
              <div
                onClick={() => setSelectedPlan('annual')}
                className={`relative bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-all border-2 ${
                  selectedPlan === 'annual'
                    ? 'border-orange-400 shadow-lg'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                    <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-800 text-xs sm:text-sm">年度会员</h4>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">全功能 · 12个月</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                    超值
                  </span>
                </div>
              </div>

              {/* 永久会员 */}
              <div
                onClick={() => setSelectedPlan('lifetime')}
                className={`relative bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 cursor-pointer transition-all border-2 ${
                  selectedPlan === 'lifetime'
                    ? 'border-purple-400 shadow-lg'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                {/* 推荐标签 */}
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold shadow-lg">
                  推荐
                </div>

                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-800 text-xs sm:text-sm">永久会员</h4>
                    <p className="text-[10px] sm:text-xs text-gray-500 truncate">终身 · 一次购买</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                    永久服务
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 获取会员区域 */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 sm:p-5 mb-6">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              获取会员
            </h3>

            {/* 两种获取方式 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 方式一：小红书购买 */}
              <div className="bg-white rounded-xl p-4 border-2 border-gray-100">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-xl mb-3">
                    <span className="text-white text-lg">📕</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2 text-sm">方式一</h4>
                  <p className="text-xs text-gray-500 mb-3">小红书购买</p>
                  <a
                    href="https://www.xiaohongshu.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-all w-full"
                  >
                    <ExternalLink className="w-4 h-4" />
                    去小红书购买
                  </a>
                </div>
              </div>

              {/* 方式二：微信客服 */}
              <div className="bg-white rounded-xl p-4 border-2 border-gray-100">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-xl mb-3">
                    <span className="text-white text-lg">💬</span>
                  </div>
                  <h4 className="font-semibold text-gray-800 mb-2 text-sm">方式二</h4>
                  <p className="text-xs text-gray-500 mb-3">微信客服</p>

                  {/* 二维码图片 */}
                  <div className="mb-3">
                    <img
                      src="/wechat-qr.jpg"
                      alt="微信客服二维码"
                      className="w-24 h-24 mx-auto rounded-lg border border-gray-200"
                    />
                  </div>

                  <p className="text-[10px] sm:text-xs text-gray-500 leading-relaxed">
                    扫码添加客服微信购买<br/>
                    <span className="text-orange-600">备注"购买会员"</span>
                  </p>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={onRedeemCode}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Crown className="w-4 h-4 sm:w-5 sm:h-5" />
                立即兑换
              </button>
              <button className="px-4 sm:px-6 py-2.5 sm:py-3 bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 transition-all flex items-center justify-center gap-2 text-sm">
                <ExternalLink className="w-4 h-4" />
                了解详情
              </button>
            </div>
          </div>

          {/* 会员特权列表 */}
          <div>
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm sm:text-base">
              <Star className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 fill-yellow-500" />
              会员特权
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
              <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2 sm:p-2.5">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                </div>
                <span className="text-xs sm:text-sm text-gray-700">解锁积分兑换功能</span>
              </div>

              <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2 sm:p-2.5">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                </div>
                <span className="text-xs sm:text-sm text-gray-700">解锁全部高级功能</span>
              </div>

              <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2 sm:p-2.5">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                </div>
                <span className="text-xs sm:text-sm text-gray-700">详细数据统计分析</span>
              </div>

              <div className="flex items-center gap-2 bg-white/60 rounded-lg p-2 sm:p-2.5">
                <div className="w-5 h-5 sm:w-6 sm:h-6 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" />
                </div>
                <span className="text-xs sm:text-sm text-gray-700">优先技术支持</span>
              </div>
            </div>
          </div>

          {/* 稍后再说按钮 */}
          <button
            onClick={onClose}
            className="w-full mt-6 py-2.5 text-gray-500 hover:text-gray-700 text-xs sm:text-sm hover:bg-white/50 rounded-lg transition-colors"
          >
            稍后再说
          </button>
        </div>
      </div>
    </div>
  );
}
