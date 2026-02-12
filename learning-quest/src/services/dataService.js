import { supabase } from '../lib/supabase';

export const dataService = {
  // ========== 用户相关 ==========
  async getUserProfile(userId) {
    let { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    // 如果 profile 不存在，创建一个默认的
    if (!data) {
      const { data: newData, error: insertError } = await supabase
        .from('user_profiles')
        .insert([
          {
            id: userId,
            username: '用户',
            total_points: 0,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;
      return newData;
    }

    if (error) throw error;
    return data;
  },

  // ========== 任务相关 ==========
  async getTasks(userId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addTask(userId, taskData) {
    const { data, error } = await supabase
      .from('tasks')
      .insert([
        {
          user_id: userId,
          title: taskData.title,
          description: taskData.description,
          points: taskData.points,
          estimated_minutes: taskData.estimatedMinutes,
          time_mode: taskData.timeMode,
          start_time: taskData.startTime,
          end_time: taskData.endTime,
          task_type: taskData.repeatType === 'once' ? 'once' : 'daily',
          repeat_type: taskData.repeatType || 'daily',
          start_date: taskData.startDate || taskData.date,
          task_date: taskData.date || taskData.startDate,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteTask(taskId) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  },

  // ========== 完成记录相关 ==========
  async getCompletionRecords(userId, date = null) {
    let query = supabase
      .from('completion_records')
      .select('*')
      .eq('user_id', userId);

    if (date) {
      query = query.eq('completion_date', date);
    }

    const { data, error } = await query.order('completed_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addCompletionRecord(userId, recordData) {
    const { data, error } = await supabase
      .from('completion_records')
      .insert([
        {
          user_id: userId,
          task_id: recordData.taskId,
          completion_date: recordData.date,
          actual_minutes: recordData.actualMinutes,
          points_earned: recordData.pointsEarned,
          proof_type: recordData.proof?.type,
          proof_data: recordData.proof?.data,
          proof_filename: recordData.proof?.fileName,
          proof_notes: recordData.proof?.notes, // 学习笔记
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // ========== 奖励相关 ==========
  async getRewards(userId) {
    const { data, error } = await supabase
      .from('rewards')
      .select('*')
      .eq('user_id', userId)
      .order('points', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async addReward(userId, rewardData) {
    const { data, error } = await supabase
      .from('rewards')
      .insert([
        {
          user_id: userId,
          name: rewardData.name,
          points: rewardData.points,
          icon: rewardData.icon,
          reward_type: rewardData.type,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteReward(rewardId) {
    const { error } = await supabase
      .from('rewards')
      .delete()
      .eq('id', rewardId);

    if (error) throw error;
  },

  // ========== 兑换记录相关 ==========
  async getRedemptionRecords(userId) {
    const { data, error } = await supabase
      .from('redemption_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async addRedemptionRecord(userId, redemptionData) {
    const { data, error } = await supabase
      .from('redemption_records')
      .insert([
        {
          user_id: userId,
          reward_id: redemptionData.rewardId,
          redemption_date: redemptionData.date,
          points_spent: redemptionData.pointsSpent,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

// ========== 会员订阅相关 ==========
export const subscriptionService = {
  // 获取用户订阅状态
  async getUserSubscription(userId) {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    // 如果没有订阅记录，创建一个
    if (!data) {
      const now = new Date();
      const trialExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1天后

      const { data: newData, error: insertError } = await supabase
        .from('user_subscriptions')
        .insert([
          {
            user_id: userId,
            trial_started_at: now.toISOString(),
            trial_expires_at: trialExpires.toISOString(),
            subscription_type: 'trial',
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;
      return newData;
    }

    return data;
  },

  // 检查用户是否有有效的会员资格
  async checkMembership(userId) {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription) {
      return { isValid: false, reason: 'no_subscription' };
    }

    const now = new Date();

    switch (subscription.subscription_type) {
      case 'permanent':
        return {
          isValid: true,
          type: 'permanent',
          subscription
        };

      case 'year':
        if (new Date(subscription.subscription_expires_at) > now) {
          return {
            isValid: true,
            type: 'year',
            expiresAt: subscription.subscription_expires_at,
            subscription
          };
        }
        return {
          isValid: false,
          reason: 'subscription_expired',
          subscription
        };

      case 'trial':
      default:
        if (new Date(subscription.trial_expires_at) > now) {
          const remainingMs = new Date(subscription.trial_expires_at) - now;
          const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
          return {
            isValid: true,
            type: 'trial',
            remainingHours,
            expiresAt: subscription.trial_expires_at,
            subscription
          };
        }
        return {
          isValid: false,
          reason: 'trial_expired',
          subscription
        };
    }
  },

  // 兑换激活码
  async redeemCode(userId, code) {
    // 标准化兑换码格式：转大写，去除多余空格
    const normalizedCode = code.trim().toUpperCase();

    // 1. 检查兑换码是否存在且未使用
    const { data: codeRecord, error: codeError } = await supabase
      .from('redemption_codes')
      .select('*')
      .eq('code', normalizedCode)
      .maybeSingle();

    if (codeError) throw codeError;

    if (!codeRecord) {
      return {
        success: false,
        message: '兑换码不存在，请检查后重试',
        code: null
      };
    }

    if (codeRecord.is_used) {
      return {
        success: false,
        message: '该兑换码已被使用',
        code: null
      };
    }

    // 2. 获取用户当前订阅状态
    const subscription = await this.getUserSubscription(userId);

    // 3. 计算新的订阅信息
    const now = new Date();
    let newSubscriptionType = codeRecord.code_type;
    let newExpiresAt = null;

    if (codeRecord.code_type === 'year') {
      // 如果当前有有效订阅，从当前过期时间延长；否则从现在开始
      let baseDate = now;
      if (subscription.subscription_expires_at && new Date(subscription.subscription_expires_at) > now) {
        baseDate = new Date(subscription.subscription_expires_at);
      } else if (subscription.trial_expires_at && new Date(subscription.trial_expires_at) > now) {
        baseDate = new Date(subscription.trial_expires_at);
      }
      newExpiresAt = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000);
    }

    // 4. 更新兑换码状态
    const { error: updateCodeError } = await supabase
      .from('redemption_codes')
      .update({
        is_used: true,
        used_by: userId,
        used_at: now.toISOString(),
      })
      .eq('id', codeRecord.id);

    if (updateCodeError) throw updateCodeError;

    // 5. 更新用户订阅
    const updateData = {
      subscription_type: newSubscriptionType,
      subscription_started_at: now.toISOString(),
      redemption_code_id: codeRecord.id,
    };

    if (newExpiresAt) {
      updateData.subscription_expires_at = newExpiresAt.toISOString();
    }

    const { data: updatedSubscription, error: updateSubError } = await supabase
      .from('user_subscriptions')
      .update(updateData)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateSubError) {
      // 回滚：恢复兑换码状态
      await supabase
        .from('redemption_codes')
        .update({
          is_used: false,
          used_by: null,
          used_at: null,
        })
        .eq('id', codeRecord.id);
      throw updateSubError;
    }

    return {
      success: true,
      subscriptionType: newSubscriptionType,
      expiresAt: newExpiresAt,
      message: newSubscriptionType === 'permanent'
        ? '恭喜！您已激活永久会员'
        : `会员有效期至：${newExpiresAt.toLocaleDateString('zh-CN')}`,
    };
  },

  // 获取会员状态显示信息
  async getMembershipDisplayInfo(userId) {
    const membership = await this.checkMembership(userId);

    if (!membership.isValid) {
      return {
        status: 'expired',
        label: membership.reason === 'trial_expired' ? '试用期已结束' : '会员已过期',
        color: 'red',
        canRedeem: true,
      };
    }

    switch (membership.type) {
      case 'permanent':
        return {
          status: 'active',
          label: '永久会员',
          color: 'gold',
          canRedeem: false,
        };

      case 'year':
        const daysLeft = Math.ceil(
          (new Date(membership.expiresAt) - new Date()) / (1000 * 60 * 60 * 24)
        );
        return {
          status: 'active',
          label: `年费会员 (${daysLeft}天)`,
          color: 'purple',
          expiresAt: membership.expiresAt,
          canRedeem: true,
        };

      case 'trial':
        return {
          status: 'trial',
          label: `试用中 (${membership.remainingHours}小时)`,
          color: 'blue',
          expiresAt: membership.expiresAt,
          canRedeem: true,
        };

      default:
        return {
          status: 'unknown',
          label: '未知状态',
          color: 'gray',
          canRedeem: true,
        };
    }
  },
};
