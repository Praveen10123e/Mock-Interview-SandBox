import { PremiumEmptyPage } from '../../components/shared/PremiumEmptyPage';
import { Rocket, BookOpen, LineChart, FileText, BrainCircuit, User, Settings as SettingsIcon, Calendar } from 'lucide-react';

export const StudentInterviewsPlaceholder = () => (
  <PremiumEmptyPage
    title="My Interviews"
    description="Manage your upcoming and completed mock interviews."
    breadcrumbs={[{ label: 'Dashboard', href: '/student/dashboard' }, { label: 'Interviews' }]}
    emptyStateIcon={<Calendar className="h-5 w-5" />}
    emptyStateTitle="No interviews yet"
    emptyStateDescription="You haven't scheduled any interviews."
    actionLabel="Start Mock Interview"
  />
);

export const StudentPracticePlaceholder = () => (
  <PremiumEmptyPage
    title="Practice & Mock Exams"
    description="Hone your coding skills with our extensive question bank."
    breadcrumbs={[{ label: 'Dashboard', href: '/student/dashboard' }, { label: 'Practice' }]}
    emptyStateIcon={<Rocket className="h-5 w-5" />}
    emptyStateTitle="Ready to practice"
    emptyStateDescription="Start solving coding questions to improve your skills."
    actionLabel="Start Practice"
  />
);

export const StudentQuestionBankPlaceholder = () => (
  <PremiumEmptyPage
    title="Question Bank"
    description="Browse and search through available interview questions."
    breadcrumbs={[{ label: 'Dashboard', href: '/student/dashboard' }, { label: 'Question Bank' }]}
    emptyStateIcon={<BookOpen className="h-5 w-5" />}
    emptyStateTitle="Question bank empty"
    emptyStateDescription="Questions will appear here after datasets are imported."
  />
);

export const StudentProgressPlaceholder = () => (
  <PremiumEmptyPage
    title="My Progress"
    description="Track your performance across practice sessions and interviews."
    breadcrumbs={[{ label: 'Dashboard', href: '/student/dashboard' }, { label: 'Progress' }]}
    emptyStateIcon={<LineChart className="h-5 w-5" />}
    emptyStateTitle="Progress analytics"
    emptyStateDescription="Analytics will become available after completing interviews and practice sessions."
  />
);

export const StudentReportsPlaceholder = () => (
  <PremiumEmptyPage
    title="Reports"
    description="View detailed feedback from your technical interviews."
    breadcrumbs={[{ label: 'Dashboard', href: '/student/dashboard' }, { label: 'Reports' }]}
    emptyStateIcon={<FileText className="h-5 w-5" />}
    emptyStateTitle="Reports"
    emptyStateDescription="Reports will be generated after completing interviews."
  />
);

export const StudentRecommendationsPlaceholder = () => (
  <PremiumEmptyPage
    title="Recommendations"
    description="AI-driven suggestions for your learning roadmap."
    breadcrumbs={[{ label: 'Dashboard', href: '/student/dashboard' }, { label: 'Recommendations' }]}
    emptyStateIcon={<BrainCircuit className="h-5 w-5" />}
    emptyStateTitle="AI Recommendation engine coming soon"
    emptyStateDescription="This feature will provide a personalized learning roadmap, weak topic analysis, and AI-generated practice schedules."
  />
);

export const StudentProfilePlaceholder = () => (
  <PremiumEmptyPage
    title="Profile"
    description="Manage your personal information and career goals."
    breadcrumbs={[{ label: 'Dashboard', href: '/student/dashboard' }, { label: 'Profile' }]}
    emptyStateIcon={<User className="h-5 w-5" />}
    emptyStateTitle="Profile local only"
    emptyStateDescription="Settings are available locally. Complete profile editing will be unlocked when the backend is connected."
  />
);

export const StudentSettingsPlaceholder = () => (
  <PremiumEmptyPage
    title="Settings"
    description="Configure your portal preferences."
    breadcrumbs={[{ label: 'Dashboard', href: '/student/dashboard' }, { label: 'Settings' }]}
    emptyStateIcon={<SettingsIcon className="h-5 w-5" />}
    emptyStateTitle="Settings local only"
    emptyStateDescription="Settings are available locally. Full persistence will be supported soon."
  />
);
