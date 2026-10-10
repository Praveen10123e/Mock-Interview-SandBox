import { useNavigate } from 'react-router-dom';
import { 
  Rocket, BookOpen, Code2, LayoutTemplate,
  ChevronRight, Target, Sparkles
} from 'lucide-react';
import { useStatistics, useCategories } from '../../../api/questions';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Skeleton } from '../../../components/ui/skeleton';
import { EmptyState } from '../../../components/shared/EmptyState';
import { PageHeader } from '../../../components/shared/PageHeader';
import { StatCard } from '../../../components/shared/StatCard';
import { getProcessedStudentCategories } from '../../../utils/categoryMapping';

export const PracticeHome = () => {
  const navigate = useNavigate();
  const { data: stats, isLoading: isLoadingStats } = useStatistics();
  const { data: rawCategories, isLoading: isLoadingCats } = useCategories();

  const categories = getProcessedStudentCategories(rawCategories || []);

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full">
      <PageHeader
        title="Practice & Problem Bank"
        description="Solve algorithmic challenges, optimize SQL queries, and prepare for technical assessments."
        breadcrumbs={[
          { label: 'Dashboard', href: '/student/dashboard' },
          { label: 'Practice' },
        ]}
        actions={
          <Button onClick={() => navigate('/student/practice/questions')} leftIcon={<Rocket className="h-4 w-4" />}>
            Browse All Questions
          </Button>
        }
      />

      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border-card bg-[var(--surface-card)] shadow-[var(--card-shadow)] p-6 md:p-8">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-accent/10 border border-accent/25 text-accent text-xs font-semibold">
            <Sparkles className="h-3 w-3" />
            <span>Interactive Code Execution</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-text-primary">
            Curated Technical Question Sets
          </h2>
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed">
            Practice across Data Structures, Algorithms, SQL, Aptitude, and Core CS domains with instantaneous Judge0 test verification in 5 programming languages.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Button size="sm" onClick={() => navigate('/student/practice/questions')}>
              Start Solving
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/student/practice/categories')}>
              Explore Categories
            </Button>
          </div>
        </div>
      </div>

      {/* Real Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingStats ? (
          <>
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </>
        ) : (
          <>
            <StatCard
              title="Total Questions"
              value={stats?.totalQuestions ?? 0}
              tone="violet"
              icon={<BookOpen className="h-5 w-5" />}
              subtitle="Problems in library"
            />
            <StatCard
              title="Categories"
              value="9"
              tone="accent"
              icon={<LayoutTemplate className="h-5 w-5" />}
              subtitle="Curriculum domains"
            />
            <StatCard
              title="Topics"
              value={stats?.topicsCount ?? 0}
              tone="warning"
              icon={<Target className="h-5 w-5" />}
              subtitle="Conceptual categories"
            />
            <StatCard
              title="Supported Languages"
              value="5"
              tone="success"
              icon={<Code2 className="h-5 w-5" />}
              subtitle="Python, JS, Java, C, C++"
            />
          </>
        )}
      </div>

      {/* Categories Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-text-primary">Curriculum Categories</h3>
            <p className="text-xs text-text-secondary">Select a domain to view associated questions.</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/student/practice/categories')} rightIcon={<ChevronRight className="h-3.5 w-3.5" />}>
            View All ({categories.length})
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoadingCats ? (
            Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)
          ) : (
            categories.slice(0, 8).map((cat) => (
              <Card 
                key={cat.name}
                className="cursor-pointer hover:border-accent/40 transition-all group"
                onClick={() => navigate(`/student/practice/questions?category=${encodeURIComponent(cat.name)}`)}
              >
                <CardHeader className="p-5 pb-2.5">
                  <div className="mb-2 p-2 rounded-xl w-fit bg-accent/10 text-accent group-hover:scale-105 transition-transform shadow-xs">
                    {cat.icon}
                  </div>
                  <CardTitle className="text-sm font-semibold text-text-primary">{cat.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <p className="text-xs text-text-muted">
                    {cat.count} {cat.count === 1 ? 'question' : 'questions'}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Targeted Recommendations Note */}
      <div>
        <EmptyState
          compact
          icon={<Sparkles className="h-5 w-5" />}
          title="Adaptive Recommendations Engine"
          description="As you complete practice questions and mock interview rounds, our scoring models will identify specific weak topics to recommend targeted problem sets."
          actionLabel="Explore All Questions"
          onAction={() => navigate('/student/practice/questions')}
        />
      </div>
    </div>
  );
};

export default PracticeHome;
