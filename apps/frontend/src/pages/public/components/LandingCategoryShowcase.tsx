import type { FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCategories } from '../../../api/questions';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { Button } from '../../../components/ui/button';
import { getProcessedStudentCategories } from '../../../utils/categoryMapping';
import { useAuthStore } from '../../../store/AuthStore';

export const LandingCategoryShowcase: FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: rawCategories, isLoading } = useCategories();

  const categories = getProcessedStudentCategories(rawCategories || []);

  const handleCategoryClick = (categoryName: string) => {
    if (user) {
      navigate(`/student/practice/questions?category=${encodeURIComponent(categoryName)}`);
    } else {
      navigate('/login');
    }
  };

  const handleExploreAll = () => {
    if (user) {
      navigate('/student/practice/categories');
    } else {
      navigate('/login');
    }
  };

  return (
    <section id="categories" className="py-16 md:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mb-12">
        <div className="space-y-2 max-w-2xl">
          <h2 className="text-xs font-semibold text-accent uppercase tracking-wider font-mono">
            Curriculum Disciplines
          </h2>
          <p className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
            Curated Technical Problem Sets
          </p>
          <p className="text-xs sm:text-sm text-text-secondary">
            Practice across foundational CS topics, competitive algorithms, and professional competency areas.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleExploreAll}
          rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
        >
          View All Categories
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))
        ) : (
          categories.slice(0, 6).map((cat) => (
            <Card
              key={cat.name}
              className="cursor-pointer hover:border-accent/40 transition-all group flex flex-col justify-between p-5"
              onClick={() => handleCategoryClick(cat.name)}
            >
              <CardHeader className="p-0 pb-3 space-y-3">
                <div className="p-2.5 rounded-xl w-fit bg-accent/10 text-accent group-hover:scale-105 transition-transform shadow-xs">
                  {cat.icon}
                </div>
                <div>
                  <CardTitle className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
                    {cat.name}
                  </CardTitle>
                  <p className="text-xs text-text-secondary line-clamp-2 mt-1 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="p-0 pt-3 flex items-center justify-between border-t border-border-subtle">
                <span className="text-xs font-semibold text-text-muted">
                  {cat.count} {cat.count === 1 ? 'problem' : 'problems'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-text-muted group-hover:text-accent transition-colors font-semibold">
                  <span>Practice</span>
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );
};

export default LandingCategoryShowcase;
