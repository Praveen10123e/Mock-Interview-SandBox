import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ChevronLeft, ChevronRight, Filter, FolderOpen, Layers, Code2, ArrowRight } from 'lucide-react';
import { useQuestions, useCategories, useTopics } from '../../../api/questions';
import { Card } from '../../../components/ui/card';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Select } from '../../../components/ui/select';
import { Skeleton } from '../../../components/ui/skeleton';
import { PageHeader } from '../../../components/shared/PageHeader';
import { StatusBadge, Badge } from '../../../components/ui/badge';
import { EmptyState } from '../../../components/shared/EmptyState';
import { getDisplayName, getTagNames } from '../../../utils/display';
import { getProcessedStudentCategories, mapToStudentCategory } from '../../../utils/categoryMapping';

export const normalizeTopic = (topic: string | null | undefined): string => {
  if (!topic) return '';
  return topic
    .toLowerCase()
    .trim()
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\bdp\b/g, 'dynamic programming');
};

export const matchesSelectedTopic = (q: any, selectedTopic: string): boolean => {
  if (!selectedTopic || selectedTopic === 'ALL') return true;

  const targetNorm = normalizeTopic(selectedTopic);

  // 1. Match by topicId (UUID)
  if (q.topicId && (q.topicId === selectedTopic || q.topic?.id === selectedTopic)) {
    return true;
  }

  // 2. Match by topic name (normalized)
  const qTopicName = getDisplayName(q.topic) || q.topic?.name || '';
  if (qTopicName && normalizeTopic(qTopicName) === targetNorm) {
    return true;
  }

  // 3. Match by tags
  if (Array.isArray(q.tags)) {
    for (const tag of q.tags) {
      const tagName = typeof tag === 'string' ? tag : (tag?.name || '');
      if (tagName && normalizeTopic(tagName) === targetNorm) {
        return true;
      }
    }
  }

  // 4. Match by metadata pattern or topic
  const meta = q.metadata?.jsonPayload || q.metadata || {};
  if (meta.pattern && normalizeTopic(meta.pattern) === targetNorm) {
    return true;
  }
  if (meta.topic && normalizeTopic(meta.topic) === targetNorm) {
    return true;
  }

  return false;
};

export const QuestionList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // URL synchronization
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const categoryParam = searchParams.get('category') || '';
  const topicParam = searchParams.get('topic') || '';
  const difficultyParam = searchParams.get('difficulty') || '';
  const typeParam = searchParams.get('type') || '';
  const searchParam = searchParams.get('search') || '';

  const [page, setPage] = useState(pageParam);
  const [searchTerm, setSearchTerm] = useState(searchParam);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParam);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedTopic, setSelectedTopic] = useState(topicParam);
  const [selectedDifficulty, setSelectedDifficulty] = useState(difficultyParam);
  const [selectedType, setSelectedType] = useState(typeParam);

  // Data fetching
  const { data: categoriesData, isLoading: isLoadingCats } = useCategories();
  const { data: topicsData, isLoading: isLoadingTopics } = useTopics();
  
  const { data: questionsData, isLoading, isFetching } = useQuestions({
    page,
    limit: 50,
    category: selectedCategory || undefined,
    search: debouncedSearch,
    topic: selectedTopic,
    difficulty: selectedDifficulty,
    questionType: selectedType
  });

  const canonicalCategories = useMemo(
    () => getProcessedStudentCategories(categoriesData || []),
    [categoriesData]
  );

  // Sync state changes back to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', page.toString());
    if (selectedCategory) params.set('category', selectedCategory);
    if (selectedTopic) params.set('topic', selectedTopic);
    if (selectedDifficulty) params.set('difficulty', selectedDifficulty);
    if (selectedType) params.set('type', selectedType);
    if (debouncedSearch) params.set('search', debouncedSearch);
    
    setSearchParams(params, { replace: true });
  }, [page, selectedCategory, selectedTopic, selectedDifficulty, selectedType, debouncedSearch, setSearchParams]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      if (searchTerm !== searchParam) setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm, searchParam]);

  // Filter questions based on selected canonical category, topic, difficulty, type, and search
  const questions = useMemo(() => {
    const rawList = questionsData?.data || [];
    return rawList.filter((q: any) => {
      // 1. Category filter
      if (selectedCategory) {
        const qCategory = mapToStudentCategory(getDisplayName(q.category) || q.category);
        if (qCategory.toLowerCase() !== selectedCategory.toLowerCase()) {
          return false;
        }
      }

      // 2. Topic filter
      if (selectedTopic) {
        if (!matchesSelectedTopic(q, selectedTopic)) {
          return false;
        }
      }

      // 3. Difficulty filter
      if (selectedDifficulty && selectedDifficulty !== 'ALL') {
        if (q.difficulty?.toUpperCase() !== selectedDifficulty.toUpperCase()) {
          return false;
        }
      }

      // 4. Question Type filter
      if (selectedType && selectedType !== 'ALL') {
        if (q.questionType?.toUpperCase() !== selectedType.toUpperCase()) {
          return false;
        }
      }

      // 5. Client search term filter (immediate consistency)
      if (debouncedSearch && debouncedSearch.trim()) {
        const term = debouncedSearch.trim().toLowerCase();
        const title = (q.title || '').toLowerCase();
        const desc = (q.description || '').toLowerCase();
        const topicName = (getDisplayName(q.topic) || q.topic?.name || '').toLowerCase();
        if (!title.includes(term) && !desc.includes(term) && !topicName.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [questionsData?.data, selectedCategory, selectedTopic, selectedDifficulty, selectedType, debouncedSearch]);

  const pagination = questionsData?.pagination || { totalPages: 1, page: 1, limit: 10, total: questions.length };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const activeTopics = useMemo(() => {
    const raw = topicsData || [];
    if (!selectedCategory) return raw;
    return raw.filter((t: any) => {
      const catName = getDisplayName(t.category) || t.category?.name || '';
      return mapToStudentCategory(catName).toLowerCase() === selectedCategory.toLowerCase();
    });
  }, [topicsData, selectedCategory]);

  // Accurate topic question count calculation
  const dynamicTopicCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    const rawList = questionsData?.data || [];
    if (!selectedTopic && rawList.length > 0) {
      for (const q of rawList) {
        if (selectedCategory) {
          const qCat = mapToStudentCategory(getDisplayName(q.category) || q.category);
          if (qCat.toLowerCase() !== selectedCategory.toLowerCase()) continue;
        }
        const tName = getDisplayName(q.topic) || q.topic?.name;
        if (tName) {
          map[tName] = (map[tName] || 0) + 1;
        }
      }
    }
    return map;
  }, [questionsData?.data, selectedCategory, selectedTopic]);

  const getTopicCount = (topic: any): number => {
    if (!selectedTopic && dynamicTopicCountMap[topic.name] != null) {
      return dynamicTopicCountMap[topic.name];
    }
    return topic._count?.questions ?? 0;
  };

  const handleResetFilters = () => {
    setSelectedCategory('');
    setSelectedTopic('');
    setSelectedDifficulty('');
    setSelectedType('');
    setSearchTerm('');
    setPage(1);
  };

  const hasActiveFilters = !!(selectedCategory || selectedTopic || selectedDifficulty || selectedType || debouncedSearch);

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full">
      <PageHeader
        title="Question Bank"
        description="Browse and solve technical interview questions across Data Structures, Algorithms, SQL, and Aptitude."
        breadcrumbs={[
          { label: 'Dashboard', href: '/student/dashboard' },
          { label: 'Practice', href: '/student/practice' },
          { label: 'Questions' }
        ]}
      />

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT SIDEBAR: Categories & Topics */}
        <aside className="w-full lg:w-64 shrink-0 space-y-5">
          {/* Search Input */}
          <Input
            placeholder="Search problems..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />

          {/* Categories Filter Card */}
          <div className="rounded-2xl border border-border-card bg-surface-elevated shadow-[var(--card-shadow)] overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-primary uppercase tracking-wider">
                <FolderOpen className="h-3.5 w-3.5 text-accent" />
                <span>Categories ({canonicalCategories.length})</span>
              </div>
              {selectedCategory && (
                <button
                  onClick={() => { setSelectedCategory(''); setSelectedTopic(''); setPage(1); }}
                  className="text-[11px] text-text-muted hover:text-accent font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="p-2 space-y-0.5 max-h-[320px] overflow-y-auto">
              <button
                onClick={() => { setSelectedCategory(''); setSelectedTopic(''); setPage(1); }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                  !selectedCategory 
                    ? 'bg-accent/10 text-accent font-semibold' 
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                All Categories
              </button>
              {isLoadingCats ? (
                Array(9).fill(0).map((_, i) => <Skeleton key={i} className="h-7 w-full rounded-xl my-1" />)
              ) : (
                canonicalCategories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => { 
                      setSelectedCategory(cat.name); 
                      setSelectedTopic('');
                      setPage(1); 
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs transition-colors truncate flex items-center justify-between cursor-pointer ${
                      selectedCategory === cat.name 
                        ? 'bg-accent/10 text-accent font-semibold' 
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className="text-[10px] text-text-muted shrink-0 ml-1 font-mono font-semibold">{cat.count}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Topics Filter Card */}
          <div className="rounded-2xl border border-border-card bg-surface-elevated shadow-[var(--card-shadow)] overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-text-primary uppercase tracking-wider">
                <Layers className="h-3.5 w-3.5 text-accent" />
                <span>Topics</span>
              </div>
              {selectedTopic && (
                <button
                  onClick={() => { setSelectedTopic(''); setPage(1); }}
                  className="text-[11px] text-text-muted hover:text-accent font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="p-2 space-y-0.5 max-h-[260px] overflow-y-auto">
              <button
                onClick={() => { setSelectedTopic(''); setPage(1); }}
                className={`w-full text-left px-3 py-1.5 rounded-xl text-xs transition-colors cursor-pointer ${
                  !selectedTopic 
                    ? 'bg-accent/10 text-accent font-semibold' 
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                }`}
              >
                All Topics
              </button>
              {isLoadingTopics ? (
                Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-7 w-full rounded-xl my-1" />)
              ) : (
                activeTopics.map((topic: any) => (
                  <button
                    key={topic.id || topic.name}
                    onClick={() => { setSelectedTopic(topic.name); setPage(1); }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs transition-colors truncate flex items-center justify-between cursor-pointer ${
                      selectedTopic === topic.name 
                        ? 'bg-accent/10 text-accent font-semibold' 
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  >
                    <span className="truncate">{topic.name}</span>
                    <span className="text-[10px] text-text-muted shrink-0 ml-1 font-mono font-semibold">
                      {getTopicCount(topic)}
                    </span>
                  </button>
                ))
              )}
              {activeTopics.length === 0 && !isLoadingTopics && (
                <div className="text-center py-3 text-xs text-text-muted">No topics recorded.</div>
              )}
            </div>
          </div>
        </aside>

        {/* MAIN CONTENT: Questions List */}
        <main className="flex-1 space-y-4 min-w-0">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl border border-border-card bg-surface-elevated shadow-[var(--card-shadow)]">
            <div className="flex items-center gap-1.5 text-xs text-text-muted px-1">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter:</span>
            </div>
            
            <div className="w-36">
              <Select
                value={selectedType}
                onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
                className="h-8 text-xs py-1"
              >
                <option value="">All Types</option>
                <option value="CODING">Coding</option>
                <option value="SQL">SQL</option>
                <option value="MCQ">MCQ</option>
                <option value="SUBJECTIVE">Subjective</option>
              </Select>
            </div>

            <div className="w-36">
              <Select
                value={selectedDifficulty}
                onChange={(e) => { setSelectedDifficulty(e.target.value); setPage(1); }}
                className="h-8 text-xs py-1"
              >
                <option value="">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </Select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-text-muted hover:text-text-primary ml-auto"
                onClick={handleResetFilters}
              >
                Reset Filters
              </Button>
            )}
          </div>

          {/* Results Counter */}
          <div className="flex justify-between items-center text-xs text-text-muted px-1">
            <span>
              Showing <strong className="text-text-primary font-semibold">{questions.length}</strong>{' '}
              {selectedTopic
                ? `in "${selectedTopic}"`
                : selectedCategory
                ? `in ${selectedCategory}`
                : 'questions'}
            </span>
            {isFetching && <span className="animate-pulse text-accent font-semibold">Updating...</span>}
          </div>

          {/* Questions Container */}
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {isLoading && questions.length === 0 ? (
                Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                ))
              ) : questions.length > 0 ? (
                questions.map((q: any) => {
                  const rawCategory = getDisplayName(q.category);
                  const canonicalCategory = mapToStudentCategory(rawCategory);
                  const topicName = getDisplayName(q.topic);
                  const tags = getTagNames(q.tags);

                  return (
                    <motion.div
                      key={q.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Card className="transition-all group">
                        <div className="p-4 md:p-5 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                          <div className="space-y-2 flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h3 
                                onClick={() => navigate(`/student/practice/questions/${q.id}`)}
                                className="font-semibold text-base text-text-primary group-hover:text-accent transition-colors cursor-pointer"
                              >
                                {q.title}
                              </h3>
                              <StatusBadge status={q.difficulty || 'MEDIUM'} />
                              {q.questionType && (
                                <Badge variant="secondary" className="text-[10px]">
                                  {q.questionType}
                                </Badge>
                              )}
                            </div>

                            <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                              {q.description?.replace(/<[^>]*>?/gm, '') || 'No description provided.'}
                            </p>

                            <div className="flex items-center gap-3 text-xs text-text-muted flex-wrap pt-1">
                              <span className="inline-flex items-center gap-1 text-accent font-semibold">
                                <FolderOpen className="h-3.5 w-3.5" />
                                <span>{canonicalCategory}</span>
                              </span>
                              {topicName && (
                                <span className="inline-flex items-center gap-1">
                                  <Layers className="h-3.5 w-3.5 opacity-70" />
                                  <span>{topicName}</span>
                                </span>
                              )}
                              {tags && tags.length > 0 && tags.slice(0, 3).map((tag: string, idx: number) => (
                                <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-elevated border border-border text-text-muted font-mono">
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            className="shrink-0"
                            onClick={() => navigate(`/student/practice/questions/${q.id}`)}
                            rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                          >
                            Solve Challenge
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })
              ) : (
                <EmptyState
                  icon={<Code2 className="h-6 w-6" />}
                  title="No questions found"
                  description={
                    selectedTopic
                      ? `No coding questions match "${selectedTopic}".`
                      : selectedCategory 
                        ? `Questions for ${selectedCategory} are being prepared in the curriculum repository.`
                        : hasActiveFilters 
                          ? "No questions match your selected filters. Try broadening your criteria." 
                          : "Questions will appear once loaded from the curriculum dataset."
                  }
                  actionLabel={hasActiveFilters ? "Reset Filters" : undefined}
                  onAction={hasActiveFilters ? handleResetFilters : undefined}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border text-xs text-text-secondary">
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => handlePageChange(page - 1)}
                  leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() => handlePageChange(page + 1)}
                  rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default QuestionList;
