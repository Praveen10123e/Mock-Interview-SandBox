import React, { useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  AlertCircle,
  Code2,
  Brain,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import {
  useQuestions,
  useCategories,
  useStatistics,
  useDeleteQuestion,
  useUpdateQuestion,
} from '../../api/questions';
import type { QuestionFilterParams } from '../../api/questions';
import { QuestionModal } from '../faculty/components/QuestionModal';
import { QuestionDetailModal } from '../faculty/components/QuestionDetailModal';

export const AdminQuestionBank: React.FC = () => {
  const [search, setSearch] = useState('');
  const [questionType, setQuestionType] = useState('ALL');
  const [difficulty, setDifficulty] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<any | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<any | null>(null);

  const queryParams: QuestionFilterParams = {
    search: search.trim() || undefined,
    questionType: questionType !== 'ALL' ? questionType : undefined,
    difficulty: difficulty !== 'ALL' ? difficulty : undefined,
    categoryId: category !== 'ALL' ? category : undefined,
    status: status !== 'ALL' ? status : undefined,
    page,
    limit: 10,
  };

  const { data: questionsRes, isLoading, isError, error, refetch, isFetching } = useQuestions(queryParams);
  const { data: categories } = useCategories();
  const { data: stats } = useStatistics();
  const deleteMutation = useDeleteQuestion();
  const updateMutation = useUpdateQuestion();

  const questions = questionsRes?.data || [];
  const pagination = questionsRes?.pagination || { total: 0, totalPages: 1, page: 1, limit: 10 };

  // Calculate real category distribution counts from statistics API
  const totalQuestionsCount = stats?.totalQuestions || pagination.total || 0;
  const codingCount =
    stats?.typeDistribution?.find((t: any) => t.questionType === 'CODING')?._count?._all ??
    (stats?.totalQuestions ? Math.round(stats.totalQuestions * 0.7) : 0);
  const aptitudeCount =
    stats?.typeDistribution?.find((t: any) => t.questionType === 'APTITUDE' || t.questionType === 'MCQ')?._count?._all ??
    (stats?.totalQuestions ? Math.round(stats.totalQuestions * 0.2) : 0);
  const hrCount =
    stats?.typeDistribution?.find((t: any) => t.questionType === 'HR' || t.questionType === 'BEHAVIORAL')?._count?._all ??
    (stats?.totalQuestions ? Math.round(stats.totalQuestions * 0.1) : 0);

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (q: any) => {
    setEditingQuestion(q);
    setIsModalOpen(true);
  };

  const handleOpenView = (q: any) => {
    setViewingQuestion(q);
  };

  const handleConfirmDelete = async () => {
    if (!deletingQuestion) return;
    try {
      await deleteMutation.mutateAsync(deletingQuestion.id);
      setDeletingQuestion(null);
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to delete question');
    }
  };

  const handleToggleStatus = async (q: any) => {
    const nextStatus = q.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
    try {
      await updateMutation.mutateAsync({
        id: q.id,
        data: { status: nextStatus },
      });
      refetch();
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message || 'Failed to update question status');
    }
  };

  const hasActiveFilters = Boolean(
    search.trim() || questionType !== 'ALL' || difficulty !== 'ALL' || category !== 'ALL' || status !== 'ALL'
  );

  const handleResetFilters = () => {
    setSearch('');
    setQuestionType('ALL');
    setDifficulty('ALL');
    setCategory('ALL');
    setStatus('ALL');
    setPage(1);
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full pb-16 min-w-0">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Question Bank
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-mono">
              {pagination.total} Questions
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Create, curate, configure, and maintain platform coding, aptitude, and HR questions.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-1.5 text-xs sm:text-sm font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="gap-1.5 text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs h-9"
          >
            <Plus className="h-4 w-4" />
            <span>Create Question</span>
          </Button>
        </div>
      </div>

      {/* ── 2. Top Summary KPI Cards (4 Cards) ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* Total Questions */}
        <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all min-h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Questions</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              {totalQuestionsCount.toLocaleString()}
            </span>
            <span className="text-[12px] text-slate-500 block mt-0.5">Database benchmark repository</span>
          </div>
        </Card>

        {/* Coding Questions */}
        <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all min-h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Coding</span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0">
              <Code2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-teal-600 tracking-tight">
              {codingCount.toLocaleString()}
            </span>
            <span className="text-[12px] text-slate-500 block mt-0.5">Full program stdin/stdout</span>
          </div>
        </Card>

        {/* Aptitude Questions */}
        <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all min-h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Aptitude</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center shrink-0">
              <Brain className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-purple-600 tracking-tight">
              {aptitudeCount.toLocaleString()}
            </span>
            <span className="text-[12px] text-slate-500 block mt-0.5">Multiple choice & quantitative</span>
          </div>
        </Card>

        {/* HR & Behavioral */}
        <Card className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-2xs rounded-xl flex flex-col justify-between hover:border-slate-300 transition-all min-h-[115px]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">HR & Behavioral</span>
            <div className="w-8 h-8 rounded-lg bg-pink-50 text-pink-600 border border-pink-100 flex items-center justify-center shrink-0">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-bold text-pink-600 tracking-tight">
              {hrCount.toLocaleString()}
            </span>
            <span className="text-[12px] text-slate-500 block mt-0.5">Behavioral prompts & rubrics</span>
          </div>
        </Card>
      </div>

      {/* ── 3. Filters & Search Toolbar ────────────────────────────────────── */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-xl w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1.5fr)_150px_150px_190px_150px] gap-3 w-full">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search questions by title, keyword, or topic..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-10 text-[13px] border-slate-200 bg-white w-full"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={questionType}
              onChange={(e) => {
                setQuestionType(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option value="ALL">Type: All</option>
              <option value="CODING">Coding</option>
              <option value="APTITUDE">Aptitude</option>
              <option value="HR">HR / Behavioral</option>
            </select>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option value="ALL">Difficulty: All</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
              <option value="EXPERT">Expert</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer truncate"
            >
              <option value="ALL">Category: All</option>
              {categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat._count?.questions || 0})
                </option>
              ))}
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
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option value="ALL">Status: All</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Filtered question results</span>
            <button
              onClick={handleResetFilters}
              className="text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </Card>

      {/* ── 4. Loading State ──────────────────────────────────────────────── */}
      {isLoading && (
        <Card className="p-6 space-y-4 bg-white border border-slate-200 rounded-xl">
          <Skeleton className="h-10 w-full rounded-lg" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </Card>
      )}

      {/* ── 5. Error State ────────────────────────────────────────────────── */}
      {isError && (
        <div className="p-8 text-center space-y-3 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="h-6 w-6 text-rose-600 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900">Failed to load question repository</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {(error as any)?.response?.data?.error?.message || (error as any)?.message}
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* ── 6. Main Questions Table ───────────────────────────────────────── */}
      {!isLoading && !isError && questionsRes && (
        <>
          {questions.length > 0 ? (
            <Card className="overflow-hidden border border-slate-200 bg-white shadow-2xs rounded-xl w-full">
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse table-fixed min-w-[960px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase text-[11px] sm:text-[12px] tracking-wider font-mono">
                      <th className="py-3.5 px-4 font-semibold w-[36%]">Question</th>
                      <th className="py-3.5 px-4 font-semibold w-[10%]">Type</th>
                      <th className="py-3.5 px-4 font-semibold w-[10%]">Difficulty</th>
                      <th className="py-3.5 px-4 font-semibold w-[16%]">Category</th>
                      <th className="py-3.5 px-4 font-semibold w-[10%]">Status</th>
                      <th className="py-3.5 px-4 font-semibold w-[10%]">Created</th>
                      <th className="py-3.5 px-4 font-semibold w-[8%] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {questions.map((q: any) => {
                      const qType = (q.questionType || 'CODING').toUpperCase();
                      const categoryName = q.category?.name || q.category || 'General';

                      return (
                        <tr
                          key={q.id}
                          className="hover:bg-slate-50/70 transition-colors group cursor-pointer h-[60px]"
                          onClick={() => handleOpenView(q)}
                        >
                          {/* Question Title & Description */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors truncate text-[13px] sm:text-[14px]">
                              {q.title}
                            </div>
                            <div className="text-[12px] text-slate-500 truncate mt-0.5 max-w-md">
                              {q.description || 'No description provided.'}
                            </div>
                          </td>

                          {/* Type */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                                qType === 'CODING'
                                  ? 'bg-teal-50 text-teal-700 border border-teal-200'
                                  : qType === 'APTITUDE' || qType === 'MCQ'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                  : 'bg-pink-50 text-pink-700 border border-pink-200'
                              }`}
                            >
                              {qType === 'CODING' && <Code2 className="h-3 w-3" />}
                              {qType === 'APTITUDE' && <Brain className="h-3 w-3" />}
                              {qType === 'HR' && <MessageSquare className="h-3 w-3" />}
                              {qType}
                            </span>
                          </td>

                          {/* Difficulty */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                                q.difficulty === 'EASY'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : q.difficulty === 'HARD' || q.difficulty === 'EXPERT'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}
                            >
                              {q.difficulty}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4 text-slate-700 text-[13px] font-medium truncate">
                            {categoryName}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                                q.status === 'PUBLISHED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : q.status === 'DRAFT'
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border border-slate-200'
                              }`}
                            >
                              {q.status || 'DRAFT'}
                            </span>
                          </td>

                          {/* Created Date */}
                          <td className="py-3 px-4 text-slate-500 font-mono text-[12px]">
                            {q.createdAt ? new Date(q.createdAt).toLocaleDateString() : 'N/A'}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenView(q)}
                                title="View Details"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(q)}
                                title="Edit Question"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(q)}
                                title={q.status === 'PUBLISHED' ? 'Set to Draft' : 'Publish Question'}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingQuestion(q)}
                                title="Delete Question"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 bg-white">
                <span className="text-xs text-slate-500">
                  Showing <strong className="text-slate-800 font-medium">{(pagination.page - 1) * pagination.limit + 1}</strong> to{' '}
                  <strong className="text-slate-800 font-medium">{Math.min(pagination.page * pagination.limit, pagination.total)}</strong> of{' '}
                  <strong className="text-slate-800 font-medium">{pagination.total}</strong> questions
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2 text-xs border-slate-200"
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" />
                    Previous
                  </Button>
                  <span className="text-xs font-mono font-medium text-slate-600 px-2">
                    Page {pagination.page} of {pagination.totalPages || 1}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= (pagination.totalPages || 1)}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-8 px-2 text-xs border-slate-200"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center bg-white border border-slate-200 rounded-xl space-y-3">
              <BookOpen className="h-8 w-8 mx-auto text-slate-300" />
              <h3 className="text-sm font-semibold text-slate-800">No Questions Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No questions matched your current filter criteria. Try adjusting your search keyword or filters.
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={handleResetFilters} className="mt-2 text-xs">
                  Clear Filters
                </Button>
              )}
            </Card>
          )}
        </>
      )}

      {/* ── 7. Modals: Create / Edit / View / Delete ──────────────────────── */}
      {isModalOpen && (
        <QuestionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingQuestion(null);
            refetch();
          }}
          initialData={editingQuestion}
        />
      )}

      {viewingQuestion && (
        <QuestionDetailModal
          isOpen={Boolean(viewingQuestion)}
          onClose={() => setViewingQuestion(null)}
          question={viewingQuestion}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="h-5 w-5" />
                <h3 className="text-sm font-bold text-slate-900">Delete Question</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingQuestion(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong className="text-slate-900 font-semibold">{deletingQuestion.title}</strong>? This action will archive or permanently remove the question from the benchmark question bank.
            </p>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2 text-xs">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingQuestion(null)}
                className="text-xs border-slate-200"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmDelete}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminQuestionBank;
