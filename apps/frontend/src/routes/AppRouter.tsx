import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
import React, { Suspense } from 'react';
import { AuthGuard } from './AuthGuard';
import { RoleGuard } from './RoleGuard';

// Public & Auth Pages
const LandingPage = React.lazy(() => import('../pages/public/LandingPage'));
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg text-text-primary p-6">
    <div className="text-center space-y-2">
      <h1 className="text-2xl font-bold text-rose-400">403 Unauthorized</h1>
      <p className="text-sm text-text-secondary">You do not have permission to access this portal.</p>
    </div>
  </div>
);
const NotFound = () => (
  <div className="min-h-screen flex items-center justify-center bg-bg text-text-primary p-6">
    <div className="text-center space-y-2">
      <h1 className="text-2xl font-bold text-text-primary">404 Not Found</h1>
      <p className="text-sm text-text-secondary">The requested page does not exist.</p>
    </div>
  </div>
);

// Layouts
import { PortalLayout } from '../layouts/PortalLayout';
const AuthLayout = () => (
  <div className="min-h-screen bg-bg">
    <Outlet />
  </div>
);

// Student Pages
import StudentDashboard from '../pages/dashboard/StudentDashboard';
const PracticeHome = React.lazy(() => import('../features/practice/pages/PracticeHome').then(m => ({ default: m.PracticeHome })));
const CategoriesList = React.lazy(() => import('../features/practice/pages/CategoriesList').then(m => ({ default: m.CategoriesList })));
const TopicsList = React.lazy(() => import('../features/practice/pages/TopicsList').then(m => ({ default: m.TopicsList })));
const QuestionList = React.lazy(() => import('../features/practice/pages/QuestionList').then(m => ({ default: m.QuestionList })));
const WorkspaceRouter = React.lazy(() => import('../features/practice/pages/WorkspaceRouter').then(m => ({ default: m.WorkspaceRouter })));
import {
  StudentRecommendationsPlaceholder,
} from '../pages/student/StudentPlaceholders';
import { StudentProfile } from '../pages/student/StudentProfile';
import { StudentSettings } from '../pages/student/StudentSettings';
import { StudentReports } from '../pages/student/StudentReports';

const InterviewDashboard = React.lazy(() => import('../features/interview/pages/InterviewDashboard').then(m => ({ default: m.InterviewDashboard })));
const ProgressDashboard = React.lazy(() => import('../features/progress/pages/ProgressDashboard').then(m => ({ default: m.ProgressDashboard })));

// Faculty Pages
import FacultyDashboard from '../pages/dashboard/FacultyDashboard';
import FacultyStudents from '../pages/faculty/FacultyStudents';
import FacultyStudentDetail from '../pages/faculty/FacultyStudentDetail';
import FacultyQuestionBank from '../pages/faculty/FacultyQuestionBank';
import FacultyTemplates from '../pages/faculty/FacultyTemplates';
import FacultyInterviews from '../pages/faculty/FacultyInterviews';
import { FacultyAnalytics } from '../pages/faculty/FacultyAnalytics';
import { FacultyReports } from '../pages/faculty/FacultyReports';
import { FacultyProfile } from '../pages/faculty/FacultyProfile';

// Admin Pages
import AdminDashboard from '../pages/dashboard/AdminDashboard';
import { AdminUsers } from '../pages/admin/AdminUsers';
import { AdminQuestionBank } from '../pages/admin/AdminQuestionBank';
import { AdminReports } from '../pages/admin/AdminReports';
import { AdminSettings } from '../pages/admin/AdminSettings';
import { AdminDatasets } from '../pages/admin/AdminDatasets';
import { AdminSystem } from '../pages/admin/AdminSystem';
import { AdminAnalytics } from '../pages/admin/AdminAnalytics';

// Interview Pages
import { InterviewLobby } from '../features/interview/pages/InterviewLobby';
import { InterviewConfiguration } from '../features/interview/pages/InterviewConfiguration';
import { InterviewInstructions } from '../features/interview/pages/InterviewInstructions';
import { InterviewSession } from '../features/interview/pages/InterviewSession';
import { InterviewSummary } from '../features/interview/pages/InterviewSummary';

const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[50vh] text-text-muted text-xs">
    Loading...
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <LandingPage />
      </Suspense>
    ),
  },
  {
    element: <AuthLayout />,
    children: [
      { path: 'login', element: <Login /> },
      { path: 'register', element: <Register /> },
    ],
  },
  {
    element: <AuthGuard />,
    children: [
      // ----------------------------------------------------
      // STUDENT PORTAL
      // ----------------------------------------------------
      {
        path: 'student',
        element: <RoleGuard allowedRoles={['STUDENT']} />,
        children: [
          {
            element: <PortalLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <StudentDashboard /> },
              { path: 'interviews', element: <Suspense fallback={<LoadingFallback />}><InterviewDashboard /></Suspense> },
              { path: 'interviews/lobby/:id', element: <InterviewLobby /> },
              { path: 'interviews/session/:id', element: <InterviewSession /> },
              { path: 'interviews/summary/:id', element: <InterviewSummary /> },
              { path: 'practice', element: <Suspense fallback={<LoadingFallback />}><PracticeHome /></Suspense> },
              { path: 'practice/categories', element: <Suspense fallback={<LoadingFallback />}><CategoriesList /></Suspense> },
              { path: 'practice/topics', element: <Suspense fallback={<LoadingFallback />}><TopicsList /></Suspense> },
              { path: 'practice/questions', element: <Suspense fallback={<LoadingFallback />}><QuestionList /></Suspense> },
              { path: 'practice/questions/:id', element: <Suspense fallback={<LoadingFallback />}><WorkspaceRouter /></Suspense> },
              { path: 'questions', element: <Suspense fallback={<LoadingFallback />}><QuestionList /></Suspense> },
              { path: 'progress', element: <Suspense fallback={<LoadingFallback />}><ProgressDashboard /></Suspense> },
              { path: 'reports', element: <StudentReports /> },
              { path: 'recommendations', element: <StudentRecommendationsPlaceholder /> },
              { path: 'profile', element: <StudentProfile /> },
              { path: 'settings', element: <StudentSettings /> },
            ],
          }
        ],
      },
      // ----------------------------------------------------
      // FACULTY PORTAL
      // ----------------------------------------------------
      {
        path: 'faculty',
        element: <RoleGuard allowedRoles={['FACULTY']} />,
        children: [
          {
            element: <PortalLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <FacultyDashboard /> },
              { path: 'students', element: <FacultyStudents /> },
              { path: 'students/:studentId', element: <FacultyStudentDetail /> },
              { path: 'questions', element: <FacultyQuestionBank /> },
              { path: 'templates', element: <FacultyTemplates /> },
              { path: 'interviews', element: <FacultyInterviews /> },
              { path: 'interviews/summary/:id', element: <InterviewSummary /> },
              { path: 'analytics', element: <FacultyAnalytics /> },
              { path: 'reports', element: <FacultyReports /> },
              { path: 'profile', element: <FacultyProfile /> },
              { path: 'settings', element: <FacultyProfile /> },
            ],
          }
        ],
      },
      // ----------------------------------------------------
      // ADMIN PORTAL
      // ----------------------------------------------------
      {
        path: 'admin',
        element: <RoleGuard allowedRoles={['ADMINISTRATOR', 'ADMIN']} />,
        children: [
          {
            element: <PortalLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <AdminDashboard /> },
              { path: 'users', element: <AdminUsers /> },
              { path: 'questions', element: <AdminQuestionBank /> },
              { path: 'question-bank', element: <AdminQuestionBank /> },
              { path: 'reports', element: <AdminReports /> },
              { path: 'interviews/summary/:id', element: <InterviewSummary /> },
              { path: 'students/:studentId', element: <FacultyStudentDetail /> },
              { path: 'datasets', element: <AdminDatasets /> },
              { path: 'system', element: <AdminSystem /> },
              { path: 'analytics', element: <AdminAnalytics /> },
              { path: 'settings', element: <AdminSettings /> },
            ],
          }
        ],
      },
      // ----------------------------------------------------
      // INTERVIEW RUNTIME
      // ----------------------------------------------------
      {
        path: 'interview',
        children: [
          { path: 'lobby', element: <InterviewLobby /> },
          { path: 'config/:type', element: <InterviewConfiguration /> },
          { path: ':id/instructions', element: <InterviewInstructions /> },
        ],
      },
      // Legacy Dashboard Redirect (Keep old /dashboard route functional)
      {
        path: 'dashboard',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'dashboard/student',
        element: <Navigate to="/student/dashboard" replace />,
      },
      {
        path: 'dashboard/faculty',
        element: <Navigate to="/faculty/dashboard" replace />,
      },
      {
        path: 'dashboard/admin',
        element: <Navigate to="/admin/dashboard" replace />,
      }
    ],
  },
  { path: 'unauthorized', element: <Unauthorized /> },
  { path: '*', element: <NotFound /> },
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
