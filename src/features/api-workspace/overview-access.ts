
/**
 * Màn Tổng quan có số liệu doanh thu toàn hợp tác xã chỉ dành cho Chủ hợp tác xã (SRS v6.2, BUG-82):
 * Kế toán xem số liệu qua các màn Báo cáo và khối "Việc tiền hôm nay", không qua màn này.
 */
export function canSeeOverview(identity: Readonly<{ subjectType: string }>): boolean {
  return identity.subjectType === "CooperativeOwner";
}
