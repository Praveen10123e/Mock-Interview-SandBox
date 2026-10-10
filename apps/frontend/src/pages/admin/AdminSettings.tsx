import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Key,
  User,
  Sliders,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Save,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuthStore } from '../../store/AuthStore';
import { authApi } from '../../api/auth';
import { useAdminDashboard } from '../../api/admin';

export const AdminSettings: React.FC = () => {
  const { user } = useAuthStore();
  const { data: adminData } = useAdminDashboard();

  // Profile Form State
  const [firstName, setFirstName] = useState(user?.firstName || 'System');
  const [lastName, setLastName] = useState(user?.lastName || 'Administrator');
  const [email] = useState(user?.email || 'admin@nm.edu');
  const [designation, setDesignation] = useState('Super Administrator');
  const [department, setDepartment] = useState('System Operations');
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Preference Form State
  const [displayDensity, setDisplayDensity] = useState<'comfortable' | 'compact'>(
    (localStorage.getItem('nm_admin_density') as any) || 'compact'
  );
  const [codeEditorFontSize, setCodeEditorFontSize] = useState<number>(
    parseInt(localStorage.getItem('nm_admin_editor_fontsize') || '14', 10)
  );
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(
    parseInt(localStorage.getItem('nm_admin_refresh_interval') || '30', 10)
  );
  const [prefSuccess, setPrefSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (adminData?.adminProfile) {
      if (adminData.adminProfile.designation) setDesignation(adminData.adminProfile.designation);
      if (adminData.adminProfile.department) setDepartment(adminData.adminProfile.department);
    }
  }, [adminData]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    localStorage.setItem('nm_admin_custom_designation', designation);
    localStorage.setItem('nm_admin_custom_department', department);
    setProfileSuccess('Profile preferences updated successfully.');
    setTimeout(() => setProfileSuccess(null), 3500);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation password do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPasswordSuccess('Password successfully changed. Use your new credentials on your next login.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: any) {
      setPasswordError(
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        err.message ||
        'Failed to change password. Please verify your current password.'
      );
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSavePreferences = () => {
    setPrefSuccess(null);
    localStorage.setItem('nm_admin_density', displayDensity);
    localStorage.setItem('nm_admin_editor_fontsize', codeEditorFontSize.toString());
    localStorage.setItem('nm_admin_refresh_interval', autoRefreshInterval.toString());
    setPrefSuccess('Platform interface preferences saved.');
    setTimeout(() => setPrefSuccess(null), 3500);
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full pb-16 min-w-0">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Admin Settings
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-mono">
              Protected Account
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage administrative credentials, security preferences, and institutional platform configurations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Profile & Password Forms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Administrative Profile */}
          <Card className="p-5 sm:p-6 bg-white border border-slate-200/80 shadow-2xs rounded-xl space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Administrative Profile</h3>
                  <p className="text-xs text-slate-500">Identity details and institutional operational role</p>
                </div>
              </div>
            </div>

            {profileSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-semibold">First Name</label>
                  <Input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-9 text-xs border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-semibold">Last Name</label>
                  <Input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="h-9 text-xs border-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-semibold">Email Address (Authorized Identifier)</label>
                <Input
                  type="email"
                  disabled
                  value={email}
                  className="h-9 text-xs bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed font-mono"
                />
                <p className="text-[11px] text-slate-400">Primary authorized identity managed in auth_db cluster.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-semibold">Designation</label>
                  <Input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="h-9 text-xs border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-semibold">Department / Office</label>
                  <Input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="h-9 text-xs border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button type="submit" size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                  <Save className="h-3.5 w-3.5" />
                  Save Profile Info
                </Button>
              </div>
            </form>
          </Card>

          {/* Card 2: Security & Password Change */}
          <Card className="p-5 sm:p-6 bg-white border border-slate-200/80 shadow-2xs rounded-xl space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Security & Credentials</h3>
                  <p className="text-xs text-slate-500">Update account password with bcrypt salt encryption</p>
                </div>
              </div>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-semibold">Current Password</label>
                <Input
                  type="password"
                  required
                  placeholder="Enter your current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-9 text-xs border-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-semibold">New Password</label>
                  <Input
                    type="password"
                    required
                    placeholder="Min. 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-9 text-xs border-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-slate-700 font-semibold">Confirm New Password</label>
                  <Input
                    type="password"
                    required
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-9 text-xs border-slate-200"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={passwordLoading}
                  className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Lock className="h-3.5 w-3.5" />
                  {passwordLoading ? 'Updating Password...' : 'Update Password'}
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right 1 Col: Preferences & System Governance */}
        <div className="space-y-6">
          {/* Card 3: Interface & Display Preferences */}
          <Card className="p-5 sm:p-6 bg-white border border-slate-200/80 shadow-2xs rounded-xl space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
                  <Sliders className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Workspace Preferences</h3>
                  <p className="text-xs text-slate-500">Theme, density & polling settings</p>
                </div>
              </div>
            </div>

            {prefSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <span>{prefSuccess}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-700 font-semibold block">Table Display Density</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDisplayDensity('compact')}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors cursor-pointer ${
                      displayDensity === 'compact'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Compact (Default)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDisplayDensity('comfortable')}
                    className={`py-2 px-3 rounded-lg border text-center font-medium transition-colors cursor-pointer ${
                      displayDensity === 'comfortable'
                        ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Comfortable
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-semibold block">Code Editor Font Size</label>
                <select
                  value={codeEditorFontSize}
                  onChange={(e) => setCodeEditorFontSize(parseInt(e.target.value, 10))}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value={12}>12px (Small)</option>
                  <option value={14}>14px (Standard)</option>
                  <option value={16}>16px (Large)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-700 font-semibold block">Metrics Auto-Refresh (Seconds)</label>
                <select
                  value={autoRefreshInterval}
                  onChange={(e) => setAutoRefreshInterval(parseInt(e.target.value, 10))}
                  className="w-full h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value={15}>15 seconds</option>
                  <option value={30}>30 seconds (Default)</option>
                  <option value={60}>60 seconds</option>
                </select>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSavePreferences}
                  className="w-full text-xs border-slate-200"
                >
                  Save Workspace Preferences
                </Button>
              </div>
            </div>
          </Card>

          {/* Card 4: Platform Security & Governance */}
          <Card className="p-5 sm:p-6 bg-white border border-slate-200/80 shadow-2xs rounded-xl space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Security & Compliance</h3>
                  <p className="text-xs text-slate-500">Live platform governance guarantees</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Access Scope</span>
                <span className="font-semibold text-slate-900 font-mono">Platform-Wide</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">RBAC Engine</span>
                <span className="font-semibold text-emerald-700 font-mono">Enforced (JWT)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">PostgreSQL Status</span>
                <span className="font-semibold text-emerald-700 font-mono">Port 5432 (Active)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-slate-600">Super Admin Lock</span>
                <span className="font-semibold text-blue-700 font-mono">Protected</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
