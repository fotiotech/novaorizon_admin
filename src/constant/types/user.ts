// types/user.ts
export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  created_at: Date;
  updated_at?: Date;
}

export interface UsersByStatus {
  active: number;
  inactive: number;
}

export interface UsersByRole {
  [key: string]: number;
}

export interface UserAnalytics {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
  usersByStatus: UsersByStatus;
  usersByRole: UsersByRole;
  monthlySignups: number[];
  recentUsers: (User & {
    joinDate: string;
    lastActive: string;
  })[];
}