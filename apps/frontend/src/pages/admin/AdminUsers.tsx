import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  RefreshCw,
  Eye,
  Edit2,
  ShieldCheck,
  ShieldAlert,
  Award,
  GraduationCap,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  Lock,
  UserPlus,
  ExternalLink,
  KeyRound,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import {
  useAdminUsersOverview,
  useAdminUsers,
  useAdminUserDetail,
  useUpdateAdminUserProfile,
  useUpdateAdminUserStatus,
  useCreateAdminUser,
  useResetAdminUserPassword,
} from '../../api/admin';
import type { AdminUserItem, AdminUserListParams } from '../../api/admin';
import { useAuthStore } from '../../store/AuthStore';

export const AdminUsers: React.FC = () => {
  const navigate = useNavigate();
  const { user: authUser } = useAuthStore();

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [department, setDepartment] = useState('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Modals state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [statusChangingUser, setStatusChangingUser] = useState<AdminUserItem | null>(null);
  const [newStatusValue, setNewStatusValue] = useState('ACTIVE');
  const [actionError, setActionError] = useState<string | null>(null);

  // Reset Password Modal State
  const [resettingUser, setResettingUser] = useState<AdminUserItem | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  // Create User modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createRole, setCreateRole] = useState<'STUDENT' | 'FACULTY'>('FACULTY');
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    department: '',
    designation: '',
    college: '',
  });

  const queryParams: AdminUserListParams = {
    search: search.trim() || undefined,
    role: role !== 'ALL' ? role : undefined,
    status: status !== 'ALL' ? status : undefined,
    department: department !== 'ALL' ? department : undefined,
    page,
    limit: pageSize,
  };

  const { data: overview, isLoading: isOverviewLoading, refetch: refetchOverview } = useAdminUsersOverview();
  const {
    data: userListData,
    isLoading: isUsersLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useAdminUsers(queryParams);

  const { data: userDetail, isLoading: isDetailLoading } = useAdminUserDetail(selectedUserId);
  const updateProfileMutation = useUpdateAdminUserProfile();
  const updateStatusMutation = useUpdateAdminUserStatus();
  const createAdminUserMutation = useCreateAdminUser();
  const resetPasswordMutation = useResetAdminUserPassword();

  const users = userListData?.users || [];
  const pagination = userListData?.pagination || {
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 1,
    hasMore: false,
  };

  // Helper for 2-letter initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return `${parts[0][0]}${parts[0][1]}`.toUpperCase();
    }
    return (name[0] || 'U').toUpperCase();
  };

  const handleOpenEdit = (user: AdminUserItem) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      department: user.department !== 'N/A' ? user.department : '',
      designation: user.designation || '',
      college: user.college !== 'Naan Mudhalvan Partner Institution' ? user.college : '',
    });
    setActionError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      setActionError(null);
      await updateProfileMutation.mutateAsync({
        id: editingUser.id,
        data: editForm,
      });
      setEditingUser(null);
    } catch (err: any) {
      setActionError(err.response?.data?.error?.message || err.message || 'Failed to update profile');
    }
  };

  const handleOpenStatus = (user: AdminUserItem) => {
    setStatusChangingUser(user);
    setNewStatusValue(user.status);
    setActionError(null);
  };

  const handleSaveStatus = async () => {
    if (!statusChangingUser) return;
    try {
      setActionError(null);
      await updateStatusMutation.mutateAsync({
        id: statusChangingUser.id,
        status: newStatusValue,
      });
      setStatusChangingUser(null);
    } catch (err: any) {
      setActionError(err.response?.data?.error?.message || err.message || 'Failed to update account status');
    }
  };

  const handleOpenResetPassword = (user: AdminUserItem) => {
    setResettingUser(user);
    setNewPasswordValue('');
    setResetSuccessMsg(null);
    setActionError(null);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    try {
      setActionError(null);
      await resetPasswordMutation.mutateAsync({
        id: resettingUser.id,
        password: newPasswordValue || '123456',
      });
      setResetSuccessMsg(`Password successfully reset for ${resettingUser.email}`);
      setTimeout(() => {
        setResettingUser(null);
        setResetSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setActionError(err.response?.data?.error?.message || err.message || 'Failed to reset password');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateError(null);

    try {
      await createAdminUserMutation.mutateAsync({
        email: createForm.email.trim(),
        password: createForm.password || '123456',
        firstName: createForm.firstName.trim(),
        lastName: createForm.lastName.trim(),
        role: createRole,
      });

      setIsCreateModalOpen(false);
      setCreateForm({ firstName: '', lastName: '', email: '', password: '' });
      refetch();
      refetchOverview();
    } catch (err: any) {
      setCreateError(err.response?.data?.error?.message || err.message || 'Failed to register account');
    } finally {
      setCreateLoading(false);
    }
  };

  const isSelf = (targetId: string) => {
    return authUser?.id === targetId;
  };

  const isProtectedAccount = (user: AdminUserItem | { isProtected?: boolean }) =>
    (user as any).isProtected === true;

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full pb-16">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Users
            </h1>
            {overview && (
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-mono">
                {overview.totalUsers} Total Accounts
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage students, faculty, and authorized platform accounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              refetch();
              refetchOverview();
            }}
            disabled={isFetching}
            className="gap-1.5 text-xs sm:text-sm font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setCreateError(null);
              setIsCreateModalOpen(true);
            }}
            className="gap-1.5 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs h-9"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add User</span>
          </Button>
        </div>
      </div>

      {/* ── 2. Top Overview KPI Cards (5 Cards) ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Users */}
        <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all min-h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            {isOverviewLoading ? (
              <Skeleton className="h-7 w-12 rounded" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {overview?.totalUsers ?? 0}
              </div>
            )}
            <p className="text-[12px] text-slate-500 mt-0.5 font-medium truncate">Platform identities</p>
          </div>
        </Card>

        {/* Students */}
        <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all min-h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            {isOverviewLoading ? (
              <Skeleton className="h-7 w-12 rounded" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-emerald-600 tracking-tight">
                {overview?.totalStudents ?? 0}
              </div>
            )}
            <p className="text-[12px] text-slate-500 mt-0.5 font-medium truncate">Enrolled candidates</p>
          </div>
        </Card>

        {/* Faculty */}
        <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all min-h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Faculty</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            {isOverviewLoading ? (
              <Skeleton className="h-7 w-12 rounded" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-purple-600 tracking-tight">
                {overview?.totalFaculty ?? 0}
              </div>
            )}
            <p className="text-[12px] text-slate-500 mt-0.5 font-medium truncate">Academic leads</p>
          </div>
        </Card>

        {/* Super Admin */}
        <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all min-h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Super Admin</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            {isOverviewLoading ? (
              <Skeleton className="h-7 w-12 rounded" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-amber-600 tracking-tight">
                {overview?.totalSuperAdmins ?? 0}
              </div>
            )}
            <p className="text-[12px] text-slate-500 mt-0.5 font-medium truncate">Protected accounts</p>
          </div>
        </Card>

        {/* Active Accounts */}
        <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all min-h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active</span>
            <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            {isOverviewLoading ? (
              <Skeleton className="h-7 w-12 rounded" />
            ) : (
              <div className="text-2xl sm:text-3xl font-bold text-cyan-600 tracking-tight">
                {overview?.activeUsers ?? 0}
              </div>
            )}
            <p className="text-[12px] text-slate-500 mt-0.5 font-medium truncate">Verified status</p>
          </div>
        </Card>
      </div>

      {/* ── 3. Search & Filters Bar (Unified, Clean 40px Height) ────────────────── */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
            />
          </div>

          {/* Role Filter */}
          <div>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer transition-colors"
            >
              <option value="ALL">Role: All Roles</option>
              <option value="STUDENT">Role: Students</option>
              <option value="FACULTY">Role: Faculty</option>
              <option value="ADMINISTRATOR">Role: Administrators</option>
              <option value="SUPER_ADMIN">Role: Super Admins</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer transition-colors"
            >
              <option value="ALL">Status: All Statuses</option>
              <option value="ACTIVE">Status: Active</option>
              <option value="INACTIVE">Status: Inactive</option>
              <option value="LOCKED">Status: Locked</option>
              <option value="BANNED">Status: Banned</option>
              <option value="PENDING_VERIFICATION">Status: Pending</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:border-blue-500 focus:outline-none cursor-pointer transition-colors"
            >
              <option value="ALL">Department: All Departments</option>
              {overview?.departments.map((dept) => (
                <option key={dept} value={dept}>
                  Department: {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Summary Tags */}
        {(search || role !== 'ALL' || status !== 'ALL' || department !== 'ALL') && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-400 font-medium">Active Filters:</span>
            {search && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-xs">
                Search: "{search}"
              </span>
            )}
            {role !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-medium">
                {role}
              </span>
            )}
            {status !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 border border-cyan-200 text-xs font-medium">
                {status}
              </span>
            )}
            {department !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-medium">
                {department}
              </span>
            )}
            <button
              onClick={() => {
                setSearch('');
                setRole('ALL');
                setStatus('ALL');
                setDepartment('ALL');
                setPage(1);
              }}
              className="text-xs text-rose-600 hover:underline ml-auto font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </Card>

      {/* ── 4. Error State ─────────────────────────────────────────────────── */}
      {isError && (
        <div className="p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <div>
              <p className="font-semibold text-rose-800">Failed to load platform users</p>
              <p className="text-xs text-rose-600 mt-0.5">
                {(error as any)?.response?.data?.error?.message ||
                  (error as any)?.message ||
                  'An unexpected error occurred.'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="text-xs border-rose-300 text-rose-700 hover:bg-rose-100">
            Try Again
          </Button>
        </div>
      )}

      {/* ── 5. User Table (Proportional Column Widths & Wrap) ────────────────── */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left table-fixed text-sm">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold tracking-wider text-slate-500 uppercase font-mono">
              <tr>
                <th className="py-3 px-4 w-[22%]">User</th>
                <th className="py-3 px-4 w-[12%]">Role</th>
                <th className="py-3 px-4 w-[23%]">Department & College</th>
                <th className="py-3 px-4 w-[10%]">Status</th>
                <th className="py-3 px-4 w-[15%]">Activity / Score</th>
                <th className="py-3 px-4 w-[10%]">Created Date</th>
                <th className="py-3 px-4 w-[8%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isUsersLoading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-4 px-4">
                      <Skeleton className="h-7 w-full rounded" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <EmptyState
                      icon={<Users className="h-8 w-8 text-slate-400" />}
                      title={search || role !== 'ALL' || status !== 'ALL' || department !== 'ALL' ? 'No users match filters' : 'No users found'}
                      description="No platform user accounts meet the specified criteria."
                    />
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSuperAdmin = user.role === 'SUPER_ADMIN';
                  const isStudent = user.role === 'STUDENT';
                  const isFaculty = user.role === 'FACULTY';
                  const isAdmin = user.role === 'ADMINISTRATOR';
                  const protected_ = isProtectedAccount(user);

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-slate-50/70 transition-colors group cursor-pointer"
                      onClick={() => setSelectedUserId(user.id)}
                    >
                      {/* 1. User: Avatar, Name, Email (22%) */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              isSuperAdmin
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : isAdmin
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : isFaculty
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {protected_ ? <Lock className="h-3.5 w-3.5" /> : getInitials(user.name)}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[14px] font-semibold text-slate-900 truncate block group-hover:text-blue-600 transition-colors">
                              {user.name}
                            </span>
                            <span className="text-[12px] text-slate-500 font-mono truncate block">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Role Badge (12%) */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold inline-flex items-center gap-1 border ${
                            isSuperAdmin
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : isAdmin
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : isFaculty
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {isSuperAdmin && <Lock className="h-3 w-3" />}
                          {user.role}
                        </span>
                      </td>

                      {/* 3. Department & College (23% - Natural Two-Line Wrap) */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="text-[13px] font-medium text-slate-900 leading-snug truncate">
                            {user.department !== 'N/A' ? user.department : 'General Cohort'}
                          </div>
                          <div className="text-[12px] text-slate-500 leading-snug truncate">
                            {user.designation ? `${user.designation} • ` : ''}
                            {user.college}
                          </div>
                        </div>
                      </td>

                      {/* 4. Status Badge (10%) */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-semibold inline-block border ${
                            user.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : user.status === 'LOCKED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : user.status === 'BANNED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>

                      {/* 5. Activity / Score (15% - Prominent Percentage) */}
                      <td className="py-3.5 px-4">
                        {isStudent ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {user.averageScore !== null ? (
                                <span className="text-sm font-bold text-blue-600 font-mono">
                                  {user.averageScore}%
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 font-mono">—</span>
                              )}
                              <span className="text-xs text-slate-500">avg</span>
                            </div>
                            <span className="text-[11px] text-slate-500 block">
                              {user.completedAssessmentsCount} completed
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[12px] font-mono">
                            {user.lastActivity ? new Date(user.lastActivity).toLocaleDateString() : 'Active'}
                          </span>
                        )}
                      </td>

                      {/* 6. Created Date (10%) */}
                      <td className="py-3.5 px-4 text-[13px] text-slate-500 font-mono">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>

                      {/* 7. Actions (8%) */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setSelectedUserId(user.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Profile"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {protected_ ? (
                            <span
                              title="Protected: Super Admin accounts cannot be status-modified"
                              className="p-1.5 text-amber-500 cursor-not-allowed"
                            >
                              <Lock className="h-4 w-4" />
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenResetPassword(user)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                title="Reset User Password"
                              >
                                <KeyRound className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenStatus(user)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 transition-colors cursor-pointer"
                                title="Change Account Status"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {!isUsersLoading && users.length > 0 && (
          <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold text-slate-900">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-semibold text-slate-900">
                {Math.min(page * pageSize, pagination.total)}
              </span>{' '}
              of <span className="font-semibold text-slate-900">{pagination.total}</span> platform accounts
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-2.5 text-xs border-slate-200 bg-white"
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
              </Button>
              <span className="px-2.5 font-mono text-slate-700 font-medium">
                {page} / {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="h-8 px-2.5 text-xs border-slate-200 bg-white"
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ── 6. User Detail Modal / Drawer (Light Institutional Design) ────────── */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-sm">
                  {userDetail ? getInitials(`${userDetail.firstName} ${userDetail.lastName}`) : 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {userDetail ? `${userDetail.firstName} ${userDetail.lastName}` : 'User Profile'}
                    </h2>
                    {userDetail && (
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {userDetail.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">{userDetail?.email}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserId(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {isDetailLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <Skeleton className="h-40 w-full rounded-xl" />
                </div>
              ) : userDetail ? (
                <>
                  {/* Account Information Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div>
                      <span className="text-[11px] text-slate-500 block uppercase font-mono">Account Status</span>
                      <span className="font-semibold text-emerald-600 text-xs">{userDetail.status}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block uppercase font-mono">Department</span>
                      <span className="font-medium text-slate-900">{userDetail.profile.department}</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block uppercase font-mono">College</span>
                      <span className="font-medium text-slate-900">{userDetail.profile.college}</span>
                    </div>
                    {userDetail.profile.designation && (
                      <div>
                        <span className="text-[11px] text-slate-500 block uppercase font-mono">Designation</span>
                        <span className="font-medium text-slate-900">{userDetail.profile.designation}</span>
                      </div>
                    )}
                    {userDetail.profile.rollNumber && (
                      <div>
                        <span className="text-[11px] text-slate-500 block uppercase font-mono">Roll / Reg Number</span>
                        <span className="font-mono text-slate-900">{userDetail.profile.rollNumber}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[11px] text-slate-500 block uppercase font-mono">Registered On</span>
                      <span className="font-mono text-slate-600">
                        {new Date(userDetail.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* If Student: Assessment History */}
                  {userDetail.role === 'STUDENT' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                          <Award className="h-4 w-4 text-blue-600" />
                          Candidate Assessment Sessions
                        </h3>
                        <span className="font-mono text-slate-500 text-xs">
                          {userDetail.assessmentSummary.completedAssessments}/{userDetail.assessmentSummary.totalAssessments} Completed
                          {userDetail.assessmentSummary.averageScore !== null && (
                            <strong className="text-blue-600 ml-1.5 font-bold">
                              ({userDetail.assessmentSummary.averageScore}% Avg)
                            </strong>
                          )}
                        </span>
                      </div>

                      {userDetail.interviewsHistory.length === 0 ? (
                        <div className="p-6 text-center text-slate-400 rounded-xl bg-slate-50 border border-slate-200">
                          No assessment sessions initiated yet.
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase font-mono text-[11px]">
                              <tr>
                                <th className="py-2.5 px-3">Session Title</th>
                                <th className="py-2.5 px-3">State</th>
                                <th className="py-2.5 px-3">Score</th>
                                <th className="py-2.5 px-3">Date</th>
                                <th className="py-2.5 px-3 text-right">Report</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-mono">
                              {userDetail.interviewsHistory.map((iv) => (
                                <tr key={iv.id} className="hover:bg-slate-50/70">
                                  <td className="py-2.5 px-3 text-slate-900 font-sans font-medium">
                                    {iv.title}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                        iv.state === 'COMPLETED'
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                                      }`}
                                    >
                                      {iv.state}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    {iv.score !== null ? (
                                      <span
                                        className={`font-bold ${
                                          iv.score >= 60
                                            ? 'text-emerald-600'
                                            : iv.score >= 40
                                            ? 'text-amber-600'
                                            : 'text-rose-600'
                                        }`}
                                      >
                                        {iv.score}%
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-slate-500">
                                    {new Date(iv.startedAt).toLocaleDateString()}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    {iv.state === 'COMPLETED' ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedUserId(null);
                                          navigate('/admin/reports');
                                        }}
                                        className="text-blue-600 hover:text-blue-800 font-sans font-medium text-xs inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <span>View</span>
                                        <ExternalLink className="h-3 w-3" />
                                      </button>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">In-Progress</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedUserId(null)}
                className="text-xs border-slate-200 bg-white"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. Edit Profile Modal (Clean Light Styling) ──────────────────────── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Edit2 className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Edit User Profile</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-5 space-y-4 text-xs">
              {actionError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">First Name</label>
                  <input
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    required
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Last Name</label>
                  <input
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">Phone</label>
                <input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+91 98400 00000"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">Department</label>
                <input
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  placeholder="e.g. Computer Science & Engineering"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {editingUser.role === 'FACULTY' && (
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Designation</label>
                  <input
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                    placeholder="e.g. Associate Professor"
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">College / Institution</label>
                <input
                  value={editForm.college}
                  onChange={(e) => setEditForm({ ...editForm, college: e.target.value })}
                  placeholder="e.g. Government Engineering College"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingUser(null)}
                  className="text-xs border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateProfileMutation.isPending}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 8. Account Status Management Modal (Light Institutional Design) ─── */}
      {statusChangingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                <h2 className="text-sm font-bold text-slate-900">Account Status</h2>
              </div>
              <button
                type="button"
                onClick={() => setStatusChangingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {actionError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {actionError}
                </div>
              )}

              <div>
                <p className="text-slate-900 font-medium mb-1">
                  Manage status for: <strong>{statusChangingUser.name}</strong>
                </p>
                <p className="text-slate-500 font-mono text-[11px]">
                  {statusChangingUser.email}
                </p>
              </div>

              {isProtectedAccount(statusChangingUser) && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong>Self-Protection Notice:</strong> You are currently logged in as this administrator. Modifying to non-active status is restricted to prevent self-lockout.
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-slate-700 font-medium">Select Target Status</label>
                <select
                  value={newStatusValue}
                  onChange={(e) => setNewStatusValue(e.target.value)}
                  disabled={isProtectedAccount(statusChangingUser)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-md px-3 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                >
                  <option value="ACTIVE">ACTIVE (Authorized access)</option>
                  <option value="INACTIVE" disabled={isSelf(statusChangingUser.id) || isProtectedAccount(statusChangingUser)}>
                    INACTIVE (Login disabled)
                  </option>
                  <option value="LOCKED" disabled={isSelf(statusChangingUser.id) || isProtectedAccount(statusChangingUser)}>
                    LOCKED (Security lock)
                  </option>
                  <option value="BANNED" disabled={isSelf(statusChangingUser.id) || isProtectedAccount(statusChangingUser)}>
                    BANNED (Suspended permanently)
                  </option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusChangingUser(null)}
                  className="text-xs border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveStatus}
                  disabled={updateStatusMutation.isPending || isProtectedAccount(statusChangingUser)}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {updateStatusMutation.isPending ? 'Updating...' : isProtectedAccount(statusChangingUser) ? '🔒 Protected' : 'Update Status'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 9. Add User Modal ──────────────────────────────────────────────── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <UserPlus className="h-4 w-4 text-blue-600" />
                <h2 className="text-sm font-bold text-slate-900">Add Platform Account</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4 text-xs">
              {createError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {createError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">Account Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['FACULTY', 'STUDENT'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setCreateRole(r)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold border text-center transition-colors cursor-pointer ${
                        createRole === r
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {r === 'FACULTY' ? 'Faculty Member' : 'Student Candidate'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">First Name</label>
                  <input
                    type="text"
                    required
                    value={createForm.firstName}
                    onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                    placeholder="e.g. Arun"
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-slate-700 font-medium">Last Name</label>
                  <input
                    type="text"
                    value={createForm.lastName}
                    onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                    placeholder="e.g. Kumar"
                    className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">Email Address</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="user@nm.edu"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">Temporary Password</label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Defaults to: 123456"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[11px] text-slate-400">Leave blank to use default (123456)</p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createLoading}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {createLoading ? 'Creating...' : 'CREATE ACCOUNT'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 10. Admin Reset Password Modal ─────────────────────────────────── */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <KeyRound className="h-4 w-4 text-amber-600" />
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Reset User Password</h2>
                  <p className="text-[11px] text-slate-500">{resettingUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveResetPassword} className="p-5 space-y-4 text-xs">
              {actionError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {actionError}
                </div>
              )}

              {resetSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{resetSuccessMsg}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-700 font-medium">New Password</label>
                <input
                  type="password"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="Enter new password (or leave blank for: 123456)"
                  className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-slate-400">
                  This will immediately update the password and invalidate all active user sessions.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setResettingUser(null)}
                  className="text-xs border-slate-200"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={resetPasswordMutation.isPending}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
