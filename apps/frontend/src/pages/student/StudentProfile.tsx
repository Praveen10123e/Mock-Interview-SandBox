import React, { useEffect, useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PageHeader } from '../../components/shared/PageHeader';
import { profileApi } from '../../api/profile';
import { useAuthStore } from '../../store/AuthStore';
import {
  User as UserIcon,
  Mail,
  Building,
  CheckCircle2,
  AlertCircle,
  Edit3,
  X,
  Code2,
  Calendar,
  Phone,
  GraduationCap,
  Sparkles,
  BarChart2,
} from 'lucide-react';
import { Skeleton } from '../../components/ui/skeleton';
import { useQueryClient } from '@tanstack/react-query';

export const StudentProfile: React.FC = () => {
  const { user, updateUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Canonical Profile State (Single Source of Truth)
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Temporary Edit Form Data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    institution: '',
    department: '',
    batch: '',
  });

  const loadData = async () => {
    try {
      setIsLoading(true);
      const userEmail = user?.email || '';
      const [profileData, statsData] = await Promise.all([
        profileApi.getProfile(userEmail),
        profileApi.getStats().catch(() => null),
      ]);

      setProfile(profileData);
      setStats(statsData);

      let first = profileData.firstName || '';
      let last = profileData.lastName || '';

      if ((first === 'New' && last === 'User') || (!first && !last)) {
        if (userEmail && userEmail.includes('@')) {
          const prefixParts = userEmail.split('@')[0].split(/[._-]/).filter((p: string) => p && !/^\d+$/.test(p));
          if (prefixParts.length >= 1) {
            first = prefixParts[0].charAt(0).toUpperCase() + prefixParts[0].slice(1);
          }
          if (prefixParts.length >= 2) {
            last = prefixParts.slice(1).map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
          }
        }
      }

      setFormData({
        firstName: first,
        lastName: last,
        phone: profileData.phone || '',
        institution:
          profileData.studentProfile?.college ||
          profileData.nmProfile?.institution ||
          'Naan Mudhalvan Partner College',
        department:
          profileData.studentProfile?.department ||
          profileData.nmProfile?.department ||
          'Computer Science & Engineering',
        batch: profileData.studentProfile?.batch || profileData.nmProfile?.batch || '2025',
      });
    } catch (err) {
      console.error('Failed to load profile data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSaveSuccess(false);
    setSaveError(null);
  };

  const handleCancel = () => {
    if (profile) {
      let first = profile.firstName || '';
      let last = profile.lastName || '';
      if (first === 'New' && last === 'User') {
        first = '';
        last = '';
      }
      setFormData({
        firstName: first,
        lastName: last,
        phone: profile.phone || '',
        institution:
          profile.studentProfile?.college ||
          profile.nmProfile?.institution ||
          'Naan Mudhalvan Partner College',
        department:
          profile.studentProfile?.department ||
          profile.nmProfile?.department ||
          'Computer Science & Engineering',
        batch: profile.studentProfile?.batch || profile.nmProfile?.batch || '2025',
      });
    }
    setIsEditing(false);
    setSaveError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim()) {
      setSaveError('First name is required.');
      return;
    }

    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const updatedProfile = await profileApi.updateProfile({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
        college: formData.institution.trim(),
        department: formData.department.trim(),
        batch: formData.batch.trim(),
      });

      // 1. Immediately update canonical profile state (Single Source of Truth)
      setProfile(updatedProfile);

      // 2. Synchronize global user/auth store for global UI consistency
      if (updateUser) {
        updateUser({
          firstName: updatedProfile.firstName,
          lastName: updatedProfile.lastName,
        });
      }

      // 3. Immediately update React Query cache for Header & Sidebar components
      queryClient.setQueryData(['profile'], updatedProfile);
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      // 4. Synchronize temporary form state
      setFormData({
        firstName: updatedProfile.firstName || '',
        lastName: updatedProfile.lastName || '',
        phone: updatedProfile.phone || '',
        institution:
          updatedProfile.studentProfile?.college ||
          updatedProfile.nmProfile?.institution ||
          'Naan Mudhalvan Partner College',
        department:
          updatedProfile.studentProfile?.department ||
          updatedProfile.nmProfile?.department ||
          'Computer Science & Engineering',
        batch: updatedProfile.studentProfile?.batch || updatedProfile.nmProfile?.batch || '2025',
      });

      setSaveSuccess(true);
      setIsEditing(false);
    } catch (err: any) {
      console.error('Save profile failed:', err);
      setSaveError(
        err.response?.data?.message || 'Failed to update profile. Please try again.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto w-full">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const email = user?.email || profile?.email || 'student@nm.edu';

  // ── Dynamic Name Resolution from Canonical Profile State ──
  const rawFirst = (profile?.firstName || '').trim();
  const rawLast = (profile?.lastName || '').trim();
  const first = (rawFirst === 'New' && rawLast === 'User') ? '' : rawFirst;
  const last = (rawFirst === 'New' && rawLast === 'User') ? '' : rawLast;

  const combinedName = [first, last].filter(Boolean).join(' ');
  const emailPrefixName = email ? email.split('@')[0].replace(/[._-]/g, ' ') : '';
  const formattedEmailName = emailPrefixName
    .split(' ')
    .filter(Boolean)
    .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');

  const displayName = combinedName || user?.firstName || formattedEmailName || 'Candidate';

  // ── Dynamic Multi-Character Initials Generator ──
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  let initials = 'C';
  if (nameParts.length >= 2) {
    initials = `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
  } else if (nameParts.length === 1 && nameParts[0].length >= 2) {
    initials = `${nameParts[0][0]}${nameParts[0][1]}`.toUpperCase();
  } else if (nameParts.length === 1) {
    initials = nameParts[0][0].toUpperCase();
  }

  const role = (user?.roles && user.roles[0]) || 'Student / Candidate';
  const createdAtFormatted = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Aug 2026';

  const completionPct = profile?.completionPercentage || 85;

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl mx-auto w-full pb-12">
      <PageHeader
        title="Candidate Profile"
        description="Manage your verified personal details, academic background, and platform preferences."
        breadcrumbs={[
          { label: 'Dashboard', href: '/student/dashboard' },
          { label: 'Profile' },
        ]}
      />

      {/* Profile Header Card */}
      <Card className="p-6 md:p-8 relative overflow-hidden bg-gradient-to-r from-surface-card via-surface-elevated to-surface-card border border-border-card">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            {/* Avatar Initials Badge */}
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-accent to-indigo-600 flex items-center justify-center text-white font-bold text-xl md:text-2xl shadow-lg shadow-accent/20 border border-white/10 shrink-0">
              {initials}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-xl md:text-2xl font-bold text-text-primary tracking-tight">
                  {displayName}
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-accent/10 border border-accent/20 text-accent rounded-full uppercase tracking-wider">
                  {role}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-text-secondary">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-text-muted" />
                  {email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-text-muted" />
                  Member since {createdAtFormatted}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {!isEditing ? (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                className="gap-2 text-xs"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit Profile
              </Button>
            ) : (
              <Button onClick={handleCancel} variant="ghost" className="gap-2 text-xs">
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        {/* Profile Completion Indicator */}
        <div className="mt-6 pt-4 border-t border-border-subtle flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-text-secondary">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Profile Completion</span>
          </div>
          <div className="flex items-center gap-3 flex-1 max-w-xs">
            <div className="w-full bg-surface-hover h-2 rounded-full overflow-hidden border border-border/40">
              <div
                className="bg-accent h-full rounded-full transition-all duration-300"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-text-primary shrink-0">
              {completionPct}%
            </span>
          </div>
        </div>
      </Card>

      {/* Status Alerts */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Profile information updated and saved successfully.</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Personal & Academic Details Form / View */}
      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary uppercase tracking-wider">
            <UserIcon className="h-4 w-4 text-accent" />
            <span>Personal & Contact Information</span>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                First Name
              </label>
              {isEditing ? (
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder="First name"
                  required
                />
              ) : (
                <div className="p-2.5 rounded-xl border border-border bg-surface-elevated text-xs font-medium text-text-primary">
                  {profile?.firstName || 'Not specified'}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary">Last Name</label>
              {isEditing ? (
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Last name"
                />
              ) : (
                <div className="p-2.5 rounded-xl border border-border bg-surface-elevated text-xs font-medium text-text-primary">
                  {profile?.lastName || 'Not specified'}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-text-muted" />
                Email Address
              </label>
              <div className="p-2.5 rounded-xl border border-border bg-surface-elevated/50 text-xs font-medium text-text-muted flex items-center justify-between">
                <span>{email}</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Verified
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-text-secondary flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-text-muted" />
                Phone Number
              </label>
              {isEditing ? (
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 98765 43210"
                />
              ) : (
                <div className="p-2.5 rounded-xl border border-border bg-surface-elevated text-xs font-medium text-text-primary">
                  {profile?.phone || 'Not provided'}
                </div>
              )}
            </div>
          </div>

          {/* Academic & Institutional Details */}
          <div className="pt-4 border-t border-border-subtle space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary uppercase tracking-wider">
              <Building className="h-4 w-4 text-accent" />
              <span>Academic Parameters</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary flex items-center gap-1">
                  <GraduationCap className="h-3.5 w-3.5 text-text-muted" />
                  College / Institution
                </label>
                {isEditing ? (
                  <Input
                    name="institution"
                    value={formData.institution}
                    onChange={handleChange}
                    placeholder="Institution Name"
                  />
                ) : (
                  <div className="p-2.5 rounded-xl border border-border bg-surface-elevated text-xs font-medium text-text-primary truncate">
                    {profile?.studentProfile?.college || profile?.nmProfile?.institution || 'Not specified'}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Department</label>
                {isEditing ? (
                  <Input
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="Department"
                  />
                ) : (
                  <div className="p-2.5 rounded-xl border border-border bg-surface-elevated text-xs font-medium text-text-primary truncate">
                    {profile?.studentProfile?.department || profile?.nmProfile?.department || 'Not specified'}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-text-secondary">Graduation Batch</label>
                {isEditing ? (
                  <Input
                    name="batch"
                    value={formData.batch}
                    onChange={handleChange}
                    placeholder="e.g. 2025"
                  />
                ) : (
                  <div className="p-2.5 rounded-xl border border-border bg-surface-elevated text-xs font-medium text-text-primary">
                    {profile?.studentProfile?.batch || profile?.nmProfile?.batch || 'Not specified'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle">
              <Button type="button" variant="outline" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isSaving}>
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* Coding Profile & Assessment Performance Summary */}
      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary uppercase tracking-wider">
            <Code2 className="h-4 w-4 text-accent" />
            <span>Assessment & Coding Performance</span>
          </div>
          <span className="text-[11px] text-text-muted flex items-center gap-1">
            <BarChart2 className="h-3.5 w-3.5" />
            Verifiable Metrics Only
          </span>
        </div>

        {stats?.hasEnoughData ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border bg-surface-elevated space-y-1">
              <div className="text-[11px] font-medium text-text-secondary">Problems Solved</div>
              <div className="text-xl font-bold text-text-primary">{stats.problemsSolved}</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface-elevated space-y-1">
              <div className="text-[11px] font-medium text-text-secondary">Total Submissions</div>
              <div className="text-xl font-bold text-text-primary">{stats.totalSubmissions}</div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface-elevated space-y-1">
              <div className="text-[11px] font-medium text-text-secondary">Acceptance Rate</div>
              <div className="text-xl font-bold text-emerald-400">
                {stats.acceptanceRate.toFixed(1)}%
              </div>
            </div>
            <div className="p-4 rounded-xl border border-border bg-surface-elevated space-y-1">
              <div className="text-[11px] font-medium text-text-secondary">Preferred Stack</div>
              <div className="text-xl font-bold text-accent capitalize">
                {stats.preferredLanguage}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl border border-dashed border-border bg-surface-elevated/40 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto">
              <Code2 className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold text-text-primary">
              Not enough assessment data
            </div>
            <p className="text-xs text-text-muted max-w-md mx-auto">
              Complete mock interview sessions or practice coding problems to generate verified
              analytics, submission acceptance rates, and performance breakdown.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default StudentProfile;
