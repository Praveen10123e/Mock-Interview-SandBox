import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  RefreshCw,
  ArrowRight,
  Code2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import { useFacultyStudents } from '../../api/faculty';
import type { StudentFilterParams } from '../../api/faculty';

export const FacultyStudents: React.FC = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [batch, setBatch] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  const filterParams: StudentFilterParams = {
    search: search.trim() || undefined,
    department: department !== 'ALL' ? department : undefined,
    batch: batch !== 'ALL' ? batch : undefined,
    status: status !== 'ALL' ? status : undefined,
  };

  const { data, isLoading, isError, error, refetch, isFetching } = useFacultyStudents(filterParams);

  // Helper for 2-letter initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return `${parts[0][0]}${parts[0][1]}`.toUpperCase();
    }
    return (name[0] || 'S').toUpperCase();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 min-w-0">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Students
            </h1>
            {data && (
              <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-mono">
                Total: {data.totalCount}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitor and review student interview and coding performance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-blue-600' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── 2. Search & Filters Bar ─────────────────────────────────────────── */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-xl w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 w-full">
          {/* Search Input (2 cols on lg) */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by student name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-[13px] w-full border-slate-200 bg-white"
            />
          </div>

          {/* Department Filter */}
          <div className="lg:col-span-1">
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option value="ALL">Department: All</option>
              {data?.departments?.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Batch Filter */}
          <div className="lg:col-span-1">
            <select
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option value="ALL">Batch: All</option>
              {data?.batches?.map((b) => (
                <option key={b} value={b}>
                  Batch {b}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-1">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option value="ALL">Status: All</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="NEEDS_ATTENTION">Needs Attention</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ── 3. Loading State ──────────────────────────────────────────────── */}
      {isLoading && (
        <Card className="p-6 space-y-4 bg-white border border-slate-200 rounded-xl">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </Card>
      )}

      {/* ── 4. Error State ────────────────────────────────────────────────── */}
      {isError && (
        <div className="p-8 text-center space-y-3 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="h-6 w-6 text-rose-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900">Failed to load student roster</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {(error as any)?.response?.data?.message || (error as any)?.message}
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* ── 5. Students Table ─────────────────────────────────────────────── */}
      {!isLoading && !isError && data && (
        <>
          {data.students.length > 0 ? (
            <Card className="overflow-hidden border border-slate-200 bg-white shadow-2xs rounded-xl w-full">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase text-[11px] sm:text-[12px] tracking-wider font-mono">
                      <th className="py-3.5 px-4 font-semibold w-[22%] min-w-[200px]">Student</th>
                      <th className="py-3.5 px-4 font-semibold w-[11%] min-w-[100px]">Department</th>
                      <th className="py-3.5 px-4 font-semibold w-[8%] min-w-[70px]">Batch</th>
                      <th className="py-3.5 px-4 font-semibold w-[16%] min-w-[140px]">Coding Activity</th>
                      <th className="py-3.5 px-4 font-semibold w-[16%] min-w-[140px]">Interview Activity</th>
                      <th className="py-3.5 px-4 font-semibold w-[12%] min-w-[100px]">Performance</th>
                      <th className="py-3.5 px-4 font-semibold w-[10%] min-w-[90px]">Status</th>
                      <th className="py-3.5 px-4 font-semibold w-[5%] min-w-[70px] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.students.map((student) => {
                      const initials = getInitials(student.fullName);

                      return (
                        <tr
                          key={student.id}
                          className="hover:bg-slate-50/70 transition-colors group cursor-pointer h-[56px]"
                          onClick={() => navigate(`/faculty/students/${student.id}`)}
                        >
                          {/* Student Info (~22%) */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <div className="text-[14px] font-semibold text-slate-900 truncate">
                                  {student.fullName}
                                </div>
                                <div className="text-[12px] text-slate-500 truncate">
                                  {student.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Department (~11%) */}
                          <td className="py-3.5 px-4 text-[13px] text-slate-700 font-medium">
                            {student.department}
                          </td>

                          {/* Batch */}
                          <td className="py-3.5 px-4 text-[13px] text-slate-700 font-mono">
                            {student.batch}
                          </td>

                          {/* Coding Activity */}
                          <td className="py-3.5 px-4">
                            {student.codingActivity.hasData ? (
                              <div className="flex items-center gap-1.5 text-[13px] text-slate-700 font-medium">
                                <Code2 className="h-3.5 w-3.5 text-blue-600" />
                                <span>{student.codingActivity.totalSubmissions} submissions</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[12px]">No data</span>
                            )}
                          </td>

                          {/* Interview Activity */}
                          <td className="py-3.5 px-4">
                            {student.interviewActivity.hasData ? (
                              <div className="flex items-center gap-1.5 text-[13px] text-slate-700 font-medium">
                                <Calendar className="h-3.5 w-3.5 text-blue-600" />
                                <span>
                                  {student.interviewActivity.completedInterviews} /{' '}
                                  {student.interviewActivity.totalInterviews} sessions
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-[12px]">No data</span>
                            )}
                          </td>

                          {/* Performance */}
                          <td className="py-3.5 px-4">
                            {student.performance.hasEnoughData ? (
                              <span className="text-[13px] font-bold text-blue-600 font-mono">
                                {student.performance.averageScore}%
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[12px]">Not enough data</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 text-[12px] font-semibold rounded-full uppercase tracking-wider border ${
                                student.status === 'ACTIVE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : student.status === 'NEEDS_ATTENTION'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {student.status.replace('_', ' ')}
                            </span>
                          </td>

                          {/* View Action */}
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 text-[13px] font-medium text-slate-600 group-hover:text-blue-600 group-hover:bg-blue-50 rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/faculty/students/${student.id}`);
                              }}
                            >
                              <span>View</span>
                              <ArrowRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center bg-white border border-slate-200 rounded-xl">
              {data.unfilteredCount === 0 ? (
                <EmptyState
                  icon={<Users className="h-6 w-6" />}
                  title="No students are currently available"
                  description="Students registered in your department or cohort will be listed here automatically."
                />
              ) : (
                <div className="space-y-3 max-w-sm mx-auto">
                  <Search className="h-8 w-8 text-slate-400 mx-auto opacity-50" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    No students match your filters
                  </h3>
                  <p className="text-xs text-slate-500">
                    Try adjusting your search keyword, department, or batch filters to view students.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setDepartment('ALL');
                      setBatch('ALL');
                      setStatus('ALL');
                    }}
                    className="text-xs"
                  >
                    Reset Filters
                  </Button>
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default FacultyStudents;
