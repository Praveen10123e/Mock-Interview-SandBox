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
  Archive,
} from 'lucide-react';
import { Skeleton } from '../../components/ui/skeleton';
import {
  useQuestions,
  useCategories,
  useDeleteQuestion,
} from '../../api/questions';
import type { QuestionFilterParams } from '../../api/questions';
import { QuestionModal } from './components/QuestionModal';
import { QuestionDetailModal } from './components/QuestionDetailModal';

export const FacultyQuestionBank: React.FC = () => {
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<any | null>(null);

  // Delete confirmation
  const [deletingQuestion, setDeletingQuestion] = useState<any | null>(null);

  const queryParams: QuestionFilterParams = {
    search: search.trim() || undefined,
    difficulty: difficulty !== 'ALL' ? difficulty : undefined,
    categoryId: category !== 'ALL' ? category : undefined,
    status: status !== 'ALL' ? status : undefined,
    page,
    limit: 10,
  };

  const { data: questionsRes, isLoading, isError, error, refetch, isFetching } = useQuestions(queryParams);
  const { data: categories } = useCategories();
  const deleteMutation = useDeleteQuestion();

  const questions = questionsRes?.data || [];
  const pagination = questionsRes?.pagination || { total: 0, totalPages: 1, page: 1 };

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
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message);
    }
  };

  const hasActiveFilters = Boolean(search.trim() || difficulty !== 'ALL' || category !== 'ALL' || status !== 'ALL');

  const handleResetFilters = () => {
    setSearch('');
    setDifficulty('ALL');
    setCategory('ALL');
    setStatus('ALL');
    setPage(1);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-12 min-w-0">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div className="w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-5">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Question Bank
            </h1>
            {pagination && (
              <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200/80 rounded-full font-mono">
                {pagination.total} Questions
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
            Create, manage, organize, and maintain the coding question library used for technical assessments.
          </p>
        </div>

        {/* Buttons aligned to right */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-9 px-3.5 rounded-lg border border-border bg-white hover:bg-surface-hover text-text-primary inline-flex items-center justify-center gap-2 cursor-pointer shadow-2xs transition-colors disabled:opacity-50 text-xs sm:text-sm font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-text-muted ${isFetching ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white inline-flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors text-xs sm:text-sm font-semibold"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Create Question</span>
          </button>
        </div>
      </div>

      {/* ── 2. Filter Bar ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-border rounded-xl shadow-xs p-3.5 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[minmax(320px,1.5fr)_160px_220px_160px] items-center gap-3 w-full">
          {/* Search Input */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search questions by title, keyword, or topic..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 pl-9 pr-4 text-xs sm:text-sm rounded-lg border border-border bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-2xs"
            />
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              value={difficulty}
              onChange={(e) => {
                setDifficulty(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-xs sm:text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-2xs cursor-pointer"
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
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-xs sm:text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-2xs cursor-pointer truncate"
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
              className="w-full h-10 rounded-lg border border-border bg-white px-3 text-xs sm:text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors shadow-2xs cursor-pointer"
            >
              <option value="ALL">Status: All</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-3 pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
            <span>Filters applied to question repository</span>
            <button
              onClick={handleResetFilters}
              className="text-blue-600 hover:text-blue-700 font-medium hover:underline cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* ── 3. Loading State ──────────────────────────────────────────────── */}
      {isLoading && (
        <div className="rounded-xl border border-border bg-white shadow-xs p-6 space-y-4">
          <Skeleton className="h-10 w-full rounded-lg bg-slate-100" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-lg bg-slate-100" />
          ))}
        </div>
      )}

      {/* ── 4. Error State ────────────────────────────────────────────────── */}
      {isError && (
        <div className="p-8 text-center space-y-3 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="h-6 w-6 text-rose-500 mx-auto" />
          <h3 className="text-sm font-semibold text-text-primary">Failed to load question repository</h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            {(error as any)?.response?.data?.error?.message || (error as any)?.message}
          </p>
          <button 
            onClick={() => refetch()} 
            className="mt-2 text-xs px-3 py-1.5 rounded-lg border border-border bg-white hover:bg-surface-hover text-text-primary cursor-pointer font-medium"
          >
            Try Again
          </button>
        </div>
      )}

      {/* ── 5. Questions Table ────────────────────────────────────────────── */}
      {!isLoading && !isError && questionsRes && (
        <>
          {questions.length > 0 ? (
            <div className="rounded-xl border border-border bg-white shadow-xs overflow-hidden w-full">
              <div className="overflow-x-auto w-full">
                <table className="w-full border-collapse table-fixed min-w-[920px]">
                  <thead>
                    <tr className="border-b border-border bg-surface-elevated/70 text-text-muted uppercase font-mono h-11 text-[11px] sm:text-[12px] font-semibold tracking-wider">
                      <th className="px-4 text-left align-middle" style={{ width: '38%' }}>Question</th>
                      <th className="px-4 text-left align-middle" style={{ width: '9%' }}>Difficulty</th>
                      <th className="px-4 text-left align-middle" style={{ width: '15%' }}>Category</th>
                      <th className="px-4 text-left align-middle" style={{ width: '11%' }}>Execution Mode</th>
                      <th className="px-4 text-left align-middle" style={{ width: '10%' }}>Test Cases</th>
                      <th className="px-4 text-left align-middle" style={{ width: '9%' }}>Status</th>
                      <th className="px-4 text-center align-middle" style={{ width: '8%' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {questions.map((q: any) => {
                      const payload = q.metadata?.jsonPayload || {};
                      const execMode = payload.execution?.executionMode || 'STANDARD_IO';
                      const stats = q.testCaseStats || {
                        total: payload.testCases?.length || 0,
                        visibleCount: payload.testCases?.filter((tc: any) => tc.visibility !== 'HIDDEN' && !tc.isHidden).length || 0,
                        hiddenCount: payload.testCases?.filter((tc: any) => tc.visibility === 'HIDDEN' || tc.isHidden).length || 0,
                      };

                      return (
                        <tr
                          key={q.id}
                          className="hover:bg-slate-50/80 transition-colors group cursor-pointer h-[60px]"
                          onClick={() => handleOpenView(q)}
                        >
                          {/* 1. Question (38% - left aligned) */}
                          <td className="py-2.5 px-4 align-middle text-left">
                            <div className="text-[14px] font-semibold text-text-primary group-hover:text-blue-600 transition-colors line-clamp-1 leading-snug">
                              {q.title}
                            </div>
                            <div className="text-[12px] sm:text-[13px] text-text-muted line-clamp-1 mt-0.5 leading-normal">
                              {q.description || 'No description provided.'}
                            </div>
                          </td>

                          {/* 2. Difficulty (9% - left aligned) */}
                          <td className="py-2.5 px-4 align-middle text-left">
                            <span
                              className={`inline-flex items-center justify-center uppercase tracking-wider border rounded-full h-6 px-2.5 text-[11px] sm:text-[12px] font-semibold ${
                                q.difficulty === 'EASY'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : q.difficulty === 'HARD' || q.difficulty === 'EXPERT'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {q.difficulty}
                            </span>
                          </td>

                          {/* 3. Category (15% - left aligned) */}
                          <td className="py-2.5 px-4 align-middle text-left">
                            <div className="text-[13px] font-medium text-text-primary leading-tight">
                              {q.category?.name || 'Programming'}
                            </div>
                            <div className="text-[12px] text-text-muted leading-tight mt-0.5">
                              {q.topic?.name || 'General'}
                            </div>
                          </td>

                          {/* 4. Execution Mode (11% - left aligned) */}
                          <td className="py-2.5 px-4 align-middle text-left">
                            <span className="inline-flex items-center justify-center font-mono rounded-md bg-slate-100 border border-slate-200 text-slate-700 h-6 px-2 text-[11px] sm:text-[12px] font-medium">
                              {execMode}
                            </span>
                          </td>

                          {/* 5. Test Cases (10% - left aligned) */}
                          <td className="py-2.5 px-4 align-middle text-left">
                            <div className="text-[13px] font-medium text-text-primary leading-tight">
                              {stats.visibleCount} Visible
                            </div>
                            <div className="text-[12px] text-text-muted leading-tight mt-0.5">
                              {stats.hiddenCount} Hidden
                            </div>
                          </td>

                          {/* 6. Status (9% - left aligned) */}
                          <td className="py-2.5 px-4 align-middle text-left">
                            <span
                              className={`inline-flex items-center justify-center uppercase tracking-wider border rounded-full h-6 px-2.5 text-[11px] sm:text-[12px] font-semibold ${
                                q.status === 'PUBLISHED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : q.status === 'DRAFT'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {q.status}
                            </span>
                          </td>

                          {/* 7. Actions (8% - center aligned) */}
                          <td className="py-2.5 px-4 align-middle text-center">
                            <div
                              className="inline-flex items-center justify-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className="h-8 w-8 rounded-lg border border-transparent hover:border-border hover:bg-slate-100 text-text-muted hover:text-text-primary inline-flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
                                onClick={() => handleOpenView(q)}
                                title="View Question Details"
                                aria-label="View Question"
                              >
                                <Eye className="h-[18px] w-[18px]" />
                              </button>

                              <button
                                type="button"
                                className="h-8 w-8 rounded-lg border border-transparent hover:border-blue-200 hover:bg-blue-50 text-text-muted hover:text-blue-600 inline-flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
                                onClick={() => handleOpenEdit(q)}
                                title="Edit Question"
                                aria-label="Edit Question"
                              >
                                <Edit2 className="h-[18px] w-[18px]" />
                              </button>

                              <button
                                type="button"
                                className="h-8 w-8 rounded-lg border border-transparent hover:border-rose-200 hover:bg-rose-50 text-text-muted hover:text-rose-600 inline-flex items-center justify-center transition-colors cursor-pointer focus:outline-none"
                                onClick={() => setDeletingQuestion(q)}
                                title="Archive Question"
                                aria-label="Archive Question"
                              >
                                <Trash2 className="h-[18px] w-[18px]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Footer */}
              <div className="py-3 px-4 bg-surface-elevated/50 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-text-secondary">
                <div>
                  Showing questions <span className="font-semibold text-text-primary font-mono">{(pagination.page - 1) * queryParams.limit! + 1}</span> to{' '}
                  <span className="font-semibold text-text-primary font-mono">
                    {Math.min(pagination.page * queryParams.limit!, pagination.total)}
                  </span>{' '}
                  of <span className="font-semibold text-text-primary font-mono">{pagination.total}</span> questions
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="h-8 px-3 rounded-lg border border-border bg-white hover:bg-surface-hover text-text-primary disabled:opacity-50 cursor-pointer shadow-2xs transition-colors text-xs font-semibold"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-mono text-text-muted px-1">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pagination.totalPages}
                    onClick={() => setPage(page + 1)}
                    className="h-8 px-3 rounded-lg border border-border bg-white hover:bg-surface-hover text-text-primary disabled:opacity-50 cursor-pointer shadow-2xs transition-colors text-xs font-semibold"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white border border-border rounded-xl shadow-xs">
              <div className="space-y-3 max-w-sm mx-auto">
                <BookOpen className="h-10 w-10 text-text-muted mx-auto opacity-50" />
                <h3 className="text-sm sm:text-base font-semibold text-text-primary">No questions found</h3>
                <p className="text-xs sm:text-sm text-text-secondary leading-normal">
                  No questions match your current search and filter criteria.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs sm:text-sm h-9 px-4 rounded-lg border border-border bg-white hover:bg-surface-hover text-text-primary font-medium cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Question Create / Edit Modal ───────────────────────────────────── */}
      <QuestionModal
        key={editingQuestion?.id || (isModalOpen ? 'create' : 'closed')}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingQuestion(null);
        }}
        initialData={editingQuestion}
      />

      {/* ── Question Detail Preview Modal ─────────────────────────────────── */}
      <QuestionDetailModal
        question={viewingQuestion}
        isOpen={!!viewingQuestion}
        onClose={() => setViewingQuestion(null)}
        onEdit={(q) => handleOpenEdit(q)}
      />

      {/* ── Safe Delete / Archive Confirmation Dialog ──────────────────────── */}
      {deletingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-border shadow-2xl rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-200 shrink-0">
                <Archive className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-text-primary text-base">Archive Question</h3>
                <p className="text-xs text-text-muted">Safe preservation of historical records</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
              Are you sure you want to archive{' '}
              <strong className="text-text-primary">"{deletingQuestion.title}"</strong>?
              Archiving disables new attempts while preserving past student evaluation history and compiler benchmarks.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border-subtle">
              <button
                type="button"
                className="text-xs sm:text-sm text-text-secondary hover:text-text-primary h-9 px-4 rounded-lg cursor-pointer font-medium"
                onClick={() => setDeletingQuestion(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="text-xs sm:text-sm h-9 px-4 gap-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg cursor-pointer font-semibold"
                disabled={deleteMutation.isPending}
                onClick={handleConfirmDelete}
              >
                {deleteMutation.isPending ? 'Archiving...' : 'Confirm Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyQuestionBank;
