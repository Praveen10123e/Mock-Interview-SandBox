import React, { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Copy,
  Eye,
  AlertCircle,
  Brain,
  Code2,
  MessageSquare,
  Dices,
  Hand,
} from 'lucide-react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import {
  useTemplates,
  useDuplicateTemplate,
  useDeleteTemplate,
} from '../../api/templates';
import type { InterviewTemplateItem } from '../../api/templates';
import { TemplateModal } from './components/TemplateModal';
import { TemplateDetailModal } from './components/TemplateDetailModal';

export const FacultyTemplates: React.FC = () => {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [interviewType, setInterviewType] = useState('ALL');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<InterviewTemplateItem | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<InterviewTemplateItem | null>(null);

  // Delete confirmation
  const [deletingTemplate, setDeletingTemplate] = useState<InterviewTemplateItem | null>(null);

  const {
    data: templates = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useTemplates({
    search: search.trim() || undefined,
    status: status !== 'ALL' ? status : undefined,
    interviewType: interviewType !== 'ALL' ? interviewType : undefined,
  });

  const duplicateMutation = useDuplicateTemplate();
  const deleteMutation = useDeleteTemplate();

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tmpl: InterviewTemplateItem) => {
    setEditingTemplate(tmpl);
    setIsModalOpen(true);
  };

  const handleOpenView = (tmpl: InterviewTemplateItem) => {
    setViewingTemplate(tmpl);
  };

  const handleDuplicate = async (tmpl: InterviewTemplateItem) => {
    try {
      await duplicateMutation.mutateAsync(tmpl.id);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingTemplate) return;
    try {
      await deleteMutation.mutateAsync(deletingTemplate.id);
      setDeletingTemplate(null);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || err.message);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 pb-12 min-w-0">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Interview Templates
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-mono">
              Total: {templates.length}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Design, customize, and manage reusable interview templates with curated questions.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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

          <Button
            variant="default"
            size="sm"
            onClick={handleOpenCreate}
            className="gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-2xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* ── 2. Search & Filters Bar ────────────────────────────────────────── */}
      <Card className="p-4 bg-white border border-slate-200/80 shadow-2xs rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by template name or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-[13px] border-slate-200 bg-white"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option value="ALL">Status: All</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </select>
          </div>

          {/* Interview Type Filter */}
          <div>
            <select
              value={interviewType}
              onChange={(e) => setInterviewType(e.target.value)}
              className="w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
            >
              <option value="ALL">Type: All</option>
              <option value="MOCK">Mock Interview</option>
              <option value="PRACTICE">Practice Assessment</option>
              <option value="TECHNICAL">Technical Interview</option>
              <option value="HR">HR Interview</option>
              <option value="CUSTOM">Custom Assessment</option>
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
          <h3 className="text-sm font-semibold text-slate-900">Failed to load interview templates</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {(error as any)?.response?.data?.error?.message || (error as any)?.message}
          </p>
          <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* ── 5. Templates Table / Cards ────────────────────────────────────── */}
      {!isLoading && !isError && (
        <>
          {templates.length > 0 ? (
            <Card className="overflow-hidden border border-slate-200 bg-white shadow-2xs rounded-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase text-[11px] sm:text-[12px] tracking-wider font-mono">
                      <th className="py-3.5 px-4 font-semibold">Template</th>
                      <th className="py-3.5 px-4 font-semibold">Type / Difficulty</th>
                      <th className="py-3.5 px-4 font-semibold">Assessment Structure</th>
                      <th className="py-3.5 px-4 font-semibold">Duration</th>
                      <th className="py-3.5 px-4 font-semibold">Status</th>
                      <th className="py-3.5 px-4 font-semibold">Created Date</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {templates.map((tmpl) => {
                      const aptCount = tmpl.assessmentStructure?.aptitude?.count ?? tmpl.questions?.filter(q => q.questionType === 'APTITUDE').length ?? 0;
                      const codCount = tmpl.assessmentStructure?.coding?.count ?? tmpl.questions?.filter(q => q.questionType === 'CODING').length ?? 0;

                      return (
                      <tr
                        key={tmpl.id}
                        className="hover:bg-slate-50/70 transition-colors group cursor-pointer h-[58px]"
                        onClick={() => handleOpenView(tmpl)}
                      >
                        {/* Name & Description */}
                        <td className="py-3.5 px-4 max-w-[220px]">
                          <div className="text-[14px] font-semibold text-slate-900 truncate">
                            {tmpl.name}
                          </div>
                          <div className="text-[12px] text-slate-500 truncate">
                            {tmpl.description || 'No description'}
                          </div>
                        </td>

                        {/* Type & Difficulty */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2.5 py-0.5 text-[11px] sm:text-[12px] font-semibold rounded-md bg-blue-50 border border-blue-200 text-blue-700 uppercase">
                              {tmpl.interviewType}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 text-[11px] sm:text-[12px] font-semibold rounded-md uppercase border ${
                                tmpl.difficulty === 'EASY'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : tmpl.difficulty === 'HARD'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200'
                              }`}
                            >
                              {tmpl.difficulty}
                            </span>
                          </div>
                        </td>

                        {/* Assessment Structure */}
                        <td className="py-3.5 px-4 min-w-[260px]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider flex items-center gap-1 ${
                                tmpl.assessmentStructure?.selectionMode === 'RANDOM'
                                  ? 'bg-indigo-50 border border-indigo-200 text-indigo-700'
                                  : 'bg-slate-100 border border-slate-200 text-slate-700'
                              }`}
                            >
                              {tmpl.assessmentStructure?.selectionMode === 'RANDOM' ? (
                                <>
                                  <Dices className="h-3.5 w-3.5" />
                                  Random
                                </>
                              ) : (
                                <>
                                  <Hand className="h-3.5 w-3.5" />
                                  Manual
                                </>
                              )}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-700 font-medium text-[12px] flex items-center gap-1">
                              <Brain className="h-3.5 w-3.5" />
                              {aptCount} Aptitude
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium text-[12px] flex items-center gap-1">
                              <Code2 className="h-3.5 w-3.5" />
                              {tmpl.assessmentStructure?.selectionMode === 'RANDOM'
                                ? '2 Coding (1 Easy, 1 Med/Hard)'
                                : `${codCount} Coding`}
                            </span>
                            <span className="px-2.5 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-purple-700 font-medium text-[12px] flex items-center gap-1">
                              <MessageSquare className="h-3.5 w-3.5" />
                              Conversational HR
                            </span>
                          </div>
                        </td>

                        {/* Duration */}
                        <td className="py-3.5 px-4 font-mono text-[13px] text-slate-700">
                          {tmpl.duration} mins
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 text-[12px] font-semibold rounded-full uppercase tracking-wider border ${
                              tmpl.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            {tmpl.status}
                          </span>
                        </td>

                        {/* Created Date */}
                        <td className="py-3.5 px-4 text-[12px] text-slate-500">
                          {new Date(tmpl.createdAt).toLocaleDateString()}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
                              onClick={() => handleOpenView(tmpl)}
                              title="View Template Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                              onClick={() => handleOpenEdit(tmpl)}
                              title="Edit Template"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                              onClick={() => handleDuplicate(tmpl)}
                              disabled={duplicateMutation.isPending}
                              title="Duplicate Template"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              onClick={() => setDeletingTemplate(tmpl)}
                              title="Delete Template"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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
              <div className="space-y-4 max-w-sm mx-auto">
                <FileText className="h-10 w-10 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-slate-900">No interview templates yet</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Create reusable assessment workflows with customized question sequences from the Question Bank.
                  </p>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleOpenCreate}
                  className="text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Your First Template
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── Create / Edit Template Modal ───────────────────────────────────── */}
      <TemplateModal
        key={editingTemplate?.id || (isModalOpen ? 'create' : 'closed')}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTemplate(null);
        }}
        initialData={editingTemplate}
      />

      {/* ── View Template Detail Modal ────────────────────────────────────── */}
      <TemplateDetailModal
        template={viewingTemplate}
        isOpen={!!viewingTemplate}
        onClose={() => setViewingTemplate(null)}
        onEdit={(tmpl) => handleOpenEdit(tmpl)}
        onDuplicate={(tmpl) => handleDuplicate(tmpl)}
      />

      {/* ── Delete Confirmation Dialog ────────────────────────────────────── */}
      {deletingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 shadow-xl rounded-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center border border-rose-200 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Template?</h3>
                <p className="text-xs text-slate-500">Permanent template removal</p>
              </div>
            </div>

            <p className="text-[13px] text-slate-600 leading-relaxed">
              <strong className="text-slate-900">"{deletingTemplate.name}"</strong> will be removed.
              This action cannot be undone. Questions in the Question Bank will remain safe and unaffected.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="text-xs cursor-pointer border-slate-200 text-slate-700"
                onClick={() => setDeletingTemplate(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="text-xs gap-1.5 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white"
                disabled={deleteMutation.isPending}
                onClick={handleConfirmDelete}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Template'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacultyTemplates;
