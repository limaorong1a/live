// 每日签到规则：连续签到奖励递增，断签重置。

export const CHECKIN_BASE = 2; // 基础奖励
export const CHECKIN_MAX_BONUS = 5; // 连续加成上限（第6天起固定 base+5）

/** 按本地自然日返回 YYYY-MM-DD（用于判断是否同日已签） */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** 根据上次签到时间与当前连续天数，计算本次签到结果 */
export function computeCheckIn(
  now: Date,
  lastCheckInAt: Date | null,
  streak: number
): { alreadyDone: boolean; reward: number; newStreak: number } {
  if (lastCheckInAt && dayKey(lastCheckInAt) === dayKey(now)) {
    return { alreadyDone: true, reward: 0, newStreak: streak };
  }

  // 判断是否连续：上次签到是"昨天"则 streak+1，否则从 1 重新开始
  let newStreak = 1;
  if (lastCheckInAt) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dayKey(lastCheckInAt) === dayKey(yesterday)) {
      newStreak = streak + 1;
    }
  }

  const bonus = Math.min(newStreak - 1, CHECKIN_MAX_BONUS);
  const reward = CHECKIN_BASE + bonus;
  return { alreadyDone: false, reward, newStreak };
}
