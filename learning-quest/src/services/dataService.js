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
