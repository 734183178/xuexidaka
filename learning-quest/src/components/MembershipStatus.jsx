import React from 'react';
import { Crown, Clock, AlertCircle, Check, Ticket } from 'lucide-react';

/**
 * 会员状态显示组件
 * @param {Object} membershipInfo - 会员信息对象
 * @param {Function} onRedeemCode - 点击兑换码按钮的回调
 */
export default function MembershipStatus({ membershipInfo, onRedeemCode }) {
  if (!membershipInfo) {
    return (
      <div className="bg-gray-100 px-3 py-2 rounded-lg flex items-center gap-2">
        <Clock className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-500">加载中...</span>
      </div>
    );
  }

  const { status, label, color, canRedeem } = membershipInfo;

  const colorStyles = {
    gold: 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-md',
    purple: 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md',
    blue: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-md',
    red: 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-md',
    gray: 'bg-gray-200 text-gray-600',
  };

  const icons = {
    active: <Crown className="w-4 h-4" />,
    trial: <Clock className="w-4 h-4" />,
    expired: <AlertCircle className="w-4 h-4" />,
  };

  return (
    <div className={`${colorStyles[color] || colorStyles.gray} px-3 py-2 rounded-lg flex items-center justify-between gap-2 min-w-[140px]`}>
      <div className="flex items-center gap-2">
        {icons[status] || <Check className="w-4 h-4" />}
        <span className="text-xs sm:text-sm font-medium truncate">{label}</span>
      </div>
      {canRedeem && status !== 'expired' && (
        <button
          onClick={onRedeemCode}
          className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 shrink-0"
          title="输入兑换码"
        >
          <Ticket className="w-3 h-3" />
          <span className="hidden sm:inline">兑换</span>
        </button>
      )}
    </div>
  );
}
