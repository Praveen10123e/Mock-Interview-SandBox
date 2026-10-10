import React, { useState, useEffect } from 'react';
import {
  Mail,
  Building2,
  GraduationCap,
  BadgeCheck,
  ShieldCheck,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Key,
  Briefcase,
  IdCard,
} from 'lucide-react';
import { useFacultyProfile, useUpdateFacultyProfile } from '../../api/faculty';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';

export const FacultyProfile: React.FC = () => {
  const { data: profile, isLoading, isError, error, refetch, isFetching } = useFacultyProfile();
  const updateMutation = useUpdateFacultyProfile();

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [college, setCollege] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync form state when profile loads
  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setPhone(profile.phone || '');
      setDepartment(profile.department || 'CSE');
      setDesignation(profile.designation || '');
      setCollege(profile.college || '');
      setEmployeeId(profile.employeeId || '');
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    try {
      await updateMutation.mutateAsync({
        firstName,
        lastName,
        phone,
        department,
        designation,
        college,
        employeeId,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to update faculty profile:', err);
    }
  };

  const initials = profile?.fullName
    ? profile.fullName
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'FA';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 min-w-0">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
            Faculty Profile & Settings
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-semibold font-mono">
              Faculty Portal
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your academic affiliation, contact details, and faculty credentials.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="border-slate-200 hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-700 flex items-center gap-1.5 self-start sm:self-auto h-9"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* ── Loading / Error State ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="space-y-6">
          <Skeleton className="h-36 rounded-xl bg-slate-100 border border-slate-200" />
          <Skeleton className="h-80 rounded-xl bg-slate-100 border border-slate-200" />
        </div>
      )}

      {isError && (
        <div className="p-6 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
          <div>
            <p className="font-semibold">Failed to load profile details</p>
            <p className="text-xs text-rose-600 mt-0.5">{(error as any)?.message || 'An unexpected error occurred.'}</p>
          </div>
        </div>
      )}

      {!isLoading && profile && (
        <div className="space-y-6 md:space-y-8">
          {/* ── Profile Header Card ───────────────────────────────────────── */}
          <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-6 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar Badge */}
              <div className="h-20 w-20 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 text-2xl font-bold font-mono shadow-xs shrink-0">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.fullName}
                    className="h-full w-full object-cover rounded-xl"
                  />
                ) : (
                  initials
                )}
              </div>

              <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{profile.fullName}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase flex items-center gap-1">
                    <BadgeCheck className="h-3 w-3 text-emerald-600" />
                    {profile.accountStatus}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {profile.roles.join(', ')}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-blue-600 font-medium">{profile.designation}</p>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs sm:text-sm text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {profile.college}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                    Dept. of {profile.department}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono">
                    <IdCard className="h-3.5 w-3.5 text-slate-400" />
                    {profile.employeeId}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Main Edit Form & Credentials Grid ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Editable Information Form */}
            <div className="lg:col-span-2 bg-white border border-slate-200/80 shadow-2xs rounded-xl p-6 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-blue-600" />
                  Professional & Academic Information
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your personal academic profile details visible to students and reports.
                </p>
              </div>

              {saveSuccess && (
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs sm:text-sm flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Profile information updated and saved successfully!</span>
                </div>
              )}

              {updateMutation.isError && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-xs sm:text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>Failed to save profile updates. Please check your inputs.</span>
                </div>
              )}

              <form onSubmit={handleSave} className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-medium">First Name</label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-medium">Last Name</label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-medium">Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="e.g. Assistant Professor / Lead Faculty"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-medium">Department</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Computer Science & Engineering"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-medium">Institution / College</label>
                    <input
                      type="text"
                      value={college}
                      onChange={(e) => setCollege(e.target.value)}
                      placeholder="e.g. Naan Mudhalvan Partner College"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-slate-700 font-medium">Faculty / Employee ID</label>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="e.g. FAC-10293"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-700 font-medium">Contact Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={updateMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 px-4 py-2 rounded-lg h-10"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {updateMutation.isPending ? 'Saving Changes...' : 'Save Profile Updates'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Right 1 Col: Read-Only System Credentials & Security */}
            <div className="space-y-6">
              {/* Account Credentials Card */}
              <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 sm:p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" />
                    System Identity & Security
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Authoritative authentication credentials.
                  </p>
                </div>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div>
                    <span className="text-[11px] text-slate-500 block">Registered Email</span>
                    <div className="font-mono text-slate-900 font-semibold flex items-center gap-1.5 mt-0.5">
                      <Mail className="h-3.5 w-3.5 text-slate-400" />
                      {profile.email}
                    </div>
                    <span className="text-[11px] text-slate-400">Primary login credential (Read-Only)</span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">System Role</span>
                    <span className="inline-block mt-0.5 px-2.5 py-0.5 rounded font-mono font-semibold text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                      {profile.roles.join(' • ')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] text-slate-500 block">Identity ID</span>
                    <span className="font-mono text-[11px] text-slate-500 break-all">
                      {profile.identityId}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] text-slate-500 block">Member Since</span>
                    <span className="text-slate-900 text-xs sm:text-sm flex items-center gap-1.5 mt-0.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Password & Security Card */}
              <div className="bg-white border border-slate-200/80 shadow-2xs rounded-xl p-5 sm:p-6 space-y-3 text-xs sm:text-sm">
                <div className="flex items-center gap-2 font-semibold text-slate-900">
                  <Key className="h-4 w-4 text-amber-500" />
                  Security Notice
                </div>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Faculty access is authenticated via enterprise JWT credentials. For account authorization or role elevation, please contact your institutional administrator.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
