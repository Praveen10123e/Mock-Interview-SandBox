import React, { useState } from 'react';
import {
  Database,
  Search,
  RefreshCw,
  RotateCcw,
  Download,
  Eye,
  FolderGit2,
  AlertCircle,
  CheckCircle2,
  Code2,
  Brain,
  MessageSquare,
  Layers,
  X,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Skeleton } from '../../components/ui/skeleton';
import {
  useAdminDatasets,
  useAdminDatasetDetail,
  useAdminDatasetBatches,
  exportDatasetQuestions,
} from '../../api/admin';
import type { AdminDatasetItem } from '../../api/admin';

export const AdminDatasets: React.FC = () => {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [inspectingDatasetId, setInspectingDatasetId] = useState<string | null>(null);
  const [showBatchesModal, setShowBatchesModal] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch, isFetching } = useAdminDatasets();
  const { data: detailData, isLoading: isLoadingDetail } = useAdminDatasetDetail(inspectingDatasetId);
  const { data: batchesData, isLoading: isLoadingBatches } = useAdminDatasetBatches();

  const handleResetFilters = () => {
    setSearch('');
    setSelectedType('ALL');
    setSelectedStatus('ALL');
  };

  const handleExport = async (dataset: AdminDatasetItem) => {
    try {
      setIsExporting(dataset.id);
      const exportData = await exportDatasetQuestions(dataset.id);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${dataset.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Export failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsExporting(null);
    }
  };

  const datasets = data?.datasets || [];
  const summary = data?.summary || {
    totalDatasets: 0,
    totalQuestions: 0,
    codingQuestions: 0,
    aptitudeQuestions: 0,
    hrQuestions: 0,
    sqlQuestions: 0,
  };

  const filteredDatasets = datasets.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.category.toLowerCase().includes(search.toLowerCase()) ||
      d.description.toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'ALL' || d.type === selectedType;
    const matchesStatus = selectedStatus === 'ALL' || d.status === selectedStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getTypeBadge = (type: string) => {
    switch (type.toUpperCase()) {
      case 'CODING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Code2 className="w-3 h-3" /> CODING
          </span>
        );
      case 'APTITUDE':
      case 'MCQ':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Brain className="w-3 h-3" /> APTITUDE
          </span>
        );
      case 'HR':
      case 'BEHAVIORAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <MessageSquare className="w-3 h-3" /> HR BEHAVIORAL
          </span>
        );
      case 'SQL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Database className="w-3 h-3" /> SQL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full pb-16 min-w-0">
      {/* ── 1. Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Curricular Datasets
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-50 border border-blue-200 text-blue-700 rounded-full font-mono">
              {summary.totalDatasets} Verified Sources
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Audit institutional question repositories, inspect difficulty distributions, and monitor dataset ingestion batches.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBatchesModal(true)}
            className="gap-1.5 text-xs sm:text-sm font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer shadow-2xs h-9"
          >
            <FolderGit2 className="h-3.5 w-3.5 text-slate-600" />
            <span>Import Batches</span>
          </Button>

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
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            className="gap-1.5 text-xs sm:text-sm font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-600 cursor-pointer shadow-2xs h-9"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset</span>
          </Button>
        </div>
      </div>

      {/* ── Error Banner ──────────────────────────────────────────────────── */}
      {isError && (
        <Card className="p-4 border-rose-200 bg-rose-50 text-rose-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Unable to load datasets</p>
              <p className="text-xs text-rose-600">{(error as any)?.message || 'Dataset catalog service query failed'}</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => refetch()} className="border-rose-300 text-rose-700 bg-white hover:bg-rose-100 cursor-pointer">
            Retry
          </Button>
        </Card>
      )}

      {/* ── 2. Top Statistics (4 KPI Cards matching Users page) ────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 sm:p-5 border-slate-200 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Datasets
            </span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Database className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {isLoading ? '...' : summary.totalDatasets}
            </span>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>All active & indexed sources</span>
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Questions
            </span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {isLoading ? '...' : summary.totalQuestions.toLocaleString()}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Curated & standard archive items
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Coding Challenges
            </span>
            <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
              <Code2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {isLoading ? '...' : summary.codingQuestions.toLocaleString()}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Full-program stdin/stdout benchmarks
            </p>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 border-slate-200 bg-white rounded-xl shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Aptitude & HR Questions
            </span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Brain className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {isLoading ? '...' : (summary.aptitudeQuestions + summary.hrQuestions).toLocaleString()}
            </span>
            <p className="text-xs text-slate-500 mt-1">
              Quantitative, logical & behavioral
            </p>
          </div>
        </Card>
      </div>

      {/* ── 3. Search & Filter Bar ─────────────────────────────────────────── */}
      <Card className="p-4 border-slate-200 bg-white rounded-xl shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search datasets by name, category, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-800 placeholder-slate-400"
            />
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Types</option>
              <option value="CODING">Coding</option>
              <option value="APTITUDE">Aptitude</option>
              <option value="HR">HR Behavioral</option>
              <option value="SQL">SQL</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700 font-medium"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>
      </Card>

      {/* ── 4. Main Dataset Table ───────────────────────────────────────────── */}
      <Card className="border-slate-200 bg-white rounded-xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-8 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900">Failed to load datasets</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {(error as any)?.message || 'An error occurred while connecting to the question bank service.'}
            </p>
            <Button size="sm" onClick={() => refetch()} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </Button>
          </div>
        ) : filteredDatasets.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Database className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-semibold text-slate-900">No datasets found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No curricular datasets match the selected filters.
            </p>
            <Button size="sm" variant="outline" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 text-xs font-semibold tracking-wider">
                  <th className="py-3 px-4 sm:px-6">Dataset Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 font-mono text-right">Questions</th>
                  <th className="py-3 px-4">Difficulty Spread</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Last Ingested</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredDatasets.map((dataset) => (
                  <tr key={dataset.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6">
                      <div className="font-semibold text-slate-900">{dataset.name}</div>
                      <div className="text-xs text-slate-400 line-clamp-1">{dataset.description}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getTypeBadge(dataset.type)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 text-right whitespace-nowrap">
                      {dataset.questionCount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold" title="Easy">
                          {dataset.difficultyDistribution.EASY || 0}E
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold" title="Medium">
                          {dataset.difficultyDistribution.MEDIUM || 0}M
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold" title="Hard">
                          {dataset.difficultyDistribution.HARD || 0}H
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-xs font-mono font-medium px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                        {dataset.version}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap font-mono">
                      {new Date(dataset.lastUpdated).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setInspectingDatasetId(dataset.id)}
                          className="h-8 gap-1 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>Inspect</span>
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExport(dataset)}
                          disabled={isExporting === dataset.id}
                          className="h-8 gap-1 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                          title="Export sanitized dataset"
                        >
                          <Download className={`w-3.5 h-3.5 ${isExporting === dataset.id ? 'animate-bounce' : 'text-slate-500'}`} />
                          <span>Export</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── 5. Dataset Detail Modal ─────────────────────────────────────────── */}
      {inspectingDatasetId && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    {detailData?.dataset.name || 'Dataset Inspection'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Inspecting questions and verified evaluation test cases.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setInspectingDatasetId(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
              {isLoadingDetail ? (
                <div className="space-y-3">
                  <Skeleton className="h-6 w-1/4" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : detailData ? (
                <>
                  {/* Metadata banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block">Total Items:</span>
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        {detailData.dataset.questionCount.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Status:</span>
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {detailData.dataset.status}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Difficulty Spread:</span>
                      <span className="font-mono text-slate-700">
                        {detailData.dataset.difficultyDistribution.EASY || 0}E • {detailData.dataset.difficultyDistribution.MEDIUM || 0}M • {detailData.dataset.difficultyDistribution.HARD || 0}H
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Sample Loaded:</span>
                      <span className="font-mono text-slate-700 font-semibold">
                        {detailData.questions.length} questions
                      </span>
                    </div>
                  </div>

                  {/* Question listing table */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Sample Curricular Questions
                    </h3>
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 max-h-[50vh] overflow-y-auto">
                      {detailData.questions.map((q, idx) => (
                        <div key={q.id} className="p-3.5 hover:bg-slate-50/70 transition-colors space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-xs font-mono font-medium text-slate-400">#{idx + 1}</span>
                              <h4 className="text-sm font-semibold text-slate-900">{q.title}</h4>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                                q.difficulty === 'EASY' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                q.difficulty === 'MEDIUM' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}>
                                {q.difficulty}
                              </span>
                              {q.questionType === 'CODING' && (
                                <span className="px-2 py-0.5 text-xs font-mono bg-slate-100 text-slate-700 rounded border border-slate-200">
                                  {q.testCasesCount} test cases
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2">{q.description}</p>
                          {q.testCases && q.testCases.length > 0 && (
                            <div className="mt-2 p-2 bg-slate-50 rounded border border-slate-200 text-xs font-mono space-y-1">
                              <div className="text-slate-400 font-sans text-[11px] font-semibold">Sample Evaluation Case:</div>
                              <div className="text-slate-700">Input: {q.testCases[0].input.replace(/\n/g, ' ')}</div>
                              <div className="text-emerald-700">Expected: {q.testCases[0].expectedOutput}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-6 text-center text-slate-500 text-xs">Dataset details unavailable.</div>
              )}
            </div>

            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/80 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setInspectingDatasetId(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Import Batches Modal ─────────────────────────────────────────── */}
      {showBatchesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <FolderGit2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Dataset Ingestion History
                  </h2>
                  <p className="text-xs text-slate-500">
                    Authoritative record of historical dataset batch imports and record processing.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBatchesModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              {isLoadingBatches ? (
                <div className="p-6 text-center text-slate-400 text-xs">Loading ingestion history...</div>
              ) : !batchesData || batchesData.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">No import batches recorded.</div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-semibold">
                        <th className="py-2.5 px-4">Filename</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4 text-right">Total</th>
                        <th className="py-2.5 px-4 text-right">Imported</th>
                        <th className="py-2.5 px-4 text-right">Skipped</th>
                        <th className="py-2.5 px-4">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700 font-mono text-xs">
                      {batchesData.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-4 font-sans font-medium text-slate-900">{b.filename}</td>
                          <td className="py-2.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              b.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right">{b.totalRecords.toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-700 font-semibold">{b.importedCount.toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right text-slate-400">{b.skippedCount.toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-slate-500">{new Date(b.startedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="p-3.5 sm:p-4 border-t border-slate-200 bg-slate-50/80 flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setShowBatchesModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
