import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select } from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../../components/ui/dialog';
import { PageHeader } from '../../components/shared/PageHeader';
import { useAuthStore } from '../../store/AuthStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';
import { profileApi } from '../../api/profile';
import { authApi } from '../../api/auth';
import {
  Bell,
  Moon,
  Sun,
  Shield,
  Code,
  CheckCircle2,
  AlertCircle,
  LogOut,
  User,
  Key,
  Monitor,
  Trash2,
  Lock,
} from 'lucide-react';

export const StudentSettings: React.FC = () => {
  const { user, clearAuth } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const workspaceStore = useWorkspaceStore();

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Editor Settings local state (syncs with workspaceStore & profileApi)
  const [editorFontSize, setEditorFontSize] = useState<number>(workspaceStore.fontSize || 14);
  const [editorTabSize, setEditorTabSize] = useState<number>(
    parseInt(localStorage.getItem('nm_editor_tab_size') || '4', 10)
  );
  const [editorWordWrap, setEditorWordWrap] = useState<'on' | 'off'>(
    workspaceStore.wordWrap || 'on'
  );
  const [preferredLang, setPreferredLang] = useState<string>('python');
  const [isSavingEditor, setIsSavingEditor] = useState(false);

  // Notifications state
  const [platformNotifs, setPlatformNotifs] = useState(true);
  const [assessmentNotifs, setAssessmentNotifs] = useState(true);

  // Password state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Danger Zone state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    // Load preferred language from profile API
    profileApi
      .getProfile()
      .then((p) => {
        if (p?.interviewPreference?.preferredProgrammingLanguage) {
          setPreferredLang(p.interviewPreference.preferredProgrammingLanguage);
        }
      })
      .catch(() => {});
  }, []);

  const showNotice = (text: string, type: 'success' | 'error' = 'success') => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // ── Appearance Toggle ──────────────────────────────
  const handleSelectTheme = (mode: string) => {
    setTheme(mode);
    showNotice(`Theme set to ${mode} mode.`);
  };

  // ── Save Editor Settings ───────────────────────────
  const handleSaveEditorSettings = async () => {
    setIsSavingEditor(true);
    try {
      workspaceStore.setFontSize(editorFontSize);
      workspaceStore.setWordWrap(editorWordWrap);
      localStorage.setItem('nm_editor_tab_size', String(editorTabSize));

      await profileApi.updatePreferences({
        preferredProgrammingLanguage: preferredLang,
      });

      showNotice('Editor preferences updated and applied across workspace.');
    } catch (err: any) {
      showNotice(err.response?.data?.message || 'Failed to save editor preferences', 'error');
    } finally {
      setIsSavingEditor(false);
    }
  };

  // ── Password Change Handler ────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.currentPassword) {
      showNotice('Please enter your current password.', 'error');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      showNotice('New password must be at least 8 characters long.', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showNotice('New password and confirm password do not match.', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showNotice('Password changed successfully.');
    } catch (err: any) {
      showNotice(
        err.response?.data?.message || 'Failed to change password. Verify your current password.',
        'error'
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ── Delete Account Handler ─────────────────────────
  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== 'DELETE') {
      setDeleteError('Please type DELETE to confirm account removal.');
      return;
    }

    setIsDeletingAccount(true);
    setDeleteError(null);
    try {
      await authApi.deleteAccount();
      clearAuth();
      window.location.href = '/login';
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete account.');
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-4xl mx-auto w-full pb-16">
      <PageHeader
        title="Settings & Preferences"
        description="Manage portal account credentials, code editor parameters, appearance, and platform security."
        breadcrumbs={[
          { label: 'Dashboard', href: '/student/dashboard' },
          { label: 'Settings' },
        ]}
      />

      {statusMessage && (
        <div
          className={`p-3.5 border text-xs rounded-xl flex items-center gap-2.5 shadow-sm transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* A. ACCOUNT SECTION */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-primary uppercase tracking-wider">
          <User className="h-4 w-4 text-accent" />
          <span>Account Overview</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 rounded-xl border border-border bg-surface-elevated space-y-1">
            <div className="text-[11px] font-medium text-text-secondary">Email Address</div>
            <div className="text-sm font-semibold text-text-primary">{user?.email || 'N/A'}</div>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-surface-elevated space-y-1">
            <div className="text-[11px] font-medium text-text-secondary">Account Role</div>
            <div className="text-sm font-semibold text-accent capitalize">
              {user?.roles?.[0] || 'Student'}
            </div>
          </div>
        </div>
      </Card>

      {/* B. APPEARANCE SECTION */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-primary uppercase tracking-wider">
          <Monitor className="h-4 w-4 text-accent" />
          <span>Appearance & Portal Theme</span>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleSelectTheme('light')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all ${
              theme === 'light'
                ? 'border-accent bg-accent/10 text-accent font-semibold'
                : 'border-border bg-surface-elevated text-text-primary hover:bg-surface-hover'
            }`}
          >
            <Sun className="h-5 w-5 text-amber-400" />
            <span>Light</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectTheme('dark')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all ${
              theme === 'dark'
                ? 'border-accent bg-accent/10 text-accent font-semibold'
                : 'border-border bg-surface-elevated text-text-primary hover:bg-surface-hover'
            }`}
          >
            <Moon className="h-5 w-5 text-indigo-400" />
            <span>Dark</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelectTheme('system')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-xs font-medium transition-all ${
              theme === 'system'
                ? 'border-accent bg-accent/10 text-accent font-semibold'
                : 'border-border bg-surface-elevated text-text-primary hover:bg-surface-hover'
            }`}
          >
            <Monitor className="h-5 w-5 text-text-muted" />
            <span>System</span>
          </button>
        </div>
      </Card>

      {/* C. EDITOR SETTINGS SECTION */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary uppercase tracking-wider">
            <Code className="h-4 w-4 text-accent" />
            <span>Code Workspace Preferences</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Font Size (px)</label>
            <Select
              value={String(editorFontSize)}
              onChange={(e) => setEditorFontSize(parseInt(e.target.value, 10))}
            >
              <option value="12">12 px (Small)</option>
              <option value="14">14 px (Standard)</option>
              <option value="16">16 px (Medium)</option>
              <option value="18">18 px (Large)</option>
              <option value="20">20 px (Extra Large)</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Tab Size (Spaces)</label>
            <Select
              value={String(editorTabSize)}
              onChange={(e) => setEditorTabSize(parseInt(e.target.value, 10))}
            >
              <option value="2">2 spaces</option>
              <option value="4">4 spaces</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Word Wrap</label>
            <Select
              value={editorWordWrap}
              onChange={(e) => setEditorWordWrap(e.target.value as 'on' | 'off')}
            >
              <option value="on">On (Wrap long lines)</option>
              <option value="off">Off (Horizontal scroll)</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">
              Preferred Language
            </label>
            <Select value={preferredLang} onChange={(e) => setPreferredLang(e.target.value)}>
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript (Node.js)</option>
              <option value="c">C (GCC)</option>
              <option value="cpp">C++ (G++)</option>
              <option value="java">Java (OpenJDK)</option>
            </Select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSaveEditorSettings} isLoading={isSavingEditor} size="sm">
            Save Workspace Preferences
          </Button>
        </div>
      </Card>

      {/* D. NOTIFICATIONS SECTION */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary uppercase tracking-wider">
            <Bell className="h-4 w-4 text-accent" />
            <span>Notification Controls</span>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-elevated">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-text-primary">In-App Alerts</div>
              <p className="text-[11px] text-text-muted">
                Reminders for scheduled interview sessions and progress alerts
              </p>
            </div>
            <Button
              variant={platformNotifs ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => {
                setPlatformNotifs(!platformNotifs);
                showNotice(`In-app alerts ${!platformNotifs ? 'enabled' : 'disabled'}.`);
              }}
            >
              {platformNotifs ? 'Enabled' : 'Disabled'}
            </Button>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface-elevated">
            <div className="space-y-0.5">
              <div className="text-xs font-semibold text-text-primary">Assessment Updates</div>
              <p className="text-[11px] text-text-muted">
                Notifications when report evaluations are generated
              </p>
            </div>
            <Button
              variant={assessmentNotifs ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => {
                setAssessmentNotifs(!assessmentNotifs);
                showNotice(`Assessment updates ${!assessmentNotifs ? 'enabled' : 'disabled'}.`);
              }}
            >
              {assessmentNotifs ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </div>

        <p className="text-[11px] text-text-muted italic">
          Note: Email notification services are currently in preview. All notifications are
          delivered directly in-app.
        </p>
      </Card>

      {/* E. SECURITY SECTION (CHANGE PASSWORD) */}
      <Card className="p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-text-primary uppercase tracking-wider">
            <Shield className="h-4 w-4 text-accent" />
            <span>Security & Change Password</span>
          </div>
          <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 font-medium">
            RS256 JWT Encrypted
          </span>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Current Password</label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
              }
              placeholder="••••••••"
              leftIcon={<Key className="h-3.5 w-3.5" />}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">New Password</label>
            <Input
              type="password"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              placeholder="Min 8 characters"
              leftIcon={<Lock className="h-3.5 w-3.5" />}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-text-secondary">Confirm New Password</label>
            <Input
              type="password"
              value={passwordForm.confirmPassword}
              onChange={(e) =>
                setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })
              }
              placeholder="Repeat new password"
              leftIcon={<Lock className="h-3.5 w-3.5" />}
              required
            />
          </div>

          <div className="pt-2">
            <Button type="submit" isLoading={isChangingPassword} size="sm">
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* F. DANGER ZONE */}
      <Card className="p-6 rounded-2xl border border-rose-500/30 bg-rose-500/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-rose-400 flex items-center gap-2">
              <LogOut className="h-4 w-4" /> Danger Zone
            </div>
            <p className="text-xs text-text-muted">
              Irreversible account actions. Please exercise caution.
            </p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setDeleteConfirmText('');
              setDeleteError(null);
              setIsDeleteModalOpen(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete Account
          </Button>
        </div>
      </Card>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      <Dialog open={isDeleteModalOpen}>
        <DialogContent className="sm:max-w-md bg-surface-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-rose-400 flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5" /> Confirm Account Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary pt-2">
              This action will deactivate your candidate profile and invalidate active authentication
              sessions. Saved progress and interview transcripts will be safely archived according
              to data retention policies.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs font-semibold text-text-primary">
              To confirm, type <span className="text-rose-400 select-all font-mono">DELETE</span> below:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="font-mono text-sm"
            />
            {deleteError && (
              <p className="text-xs text-rose-400 font-medium">{deleteError}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteAccount}
              isLoading={isDeletingAccount}
            >
              Confirm Deletion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentSettings;
