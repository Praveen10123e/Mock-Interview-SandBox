import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCategories } from '../../../api/questions';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { PageHeader } from '../../../components/shared/PageHeader';
import { getProcessedStudentCategories } from '../../../utils/categoryMapping';

export const CategoriesList = () => {
  const navigate = useNavigate();
  const { data: rawCategories, isLoading } = useCategories();

  const categories = getProcessedStudentCategories(rawCategories || []);

  return (
    <div className="space-y-6 md:space-y-8 max-w-7xl mx-auto w-full">
      <PageHeader 
        title="Question Categories" 
        description="Browse curated problem sets categorized by core technical discipline."
        breadcrumbs={[
          { label: 'Dashboard', href: '/student/dashboard' },
          { label: 'Practice', href: '/student/practice' },
          { label: 'Categories' },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array(9).fill(0).map((_, i) => <Skeleton key={i} className="h-44 w-full rounded-2xl" />)
        ) : (
          categories.map((cat) => (
            <Card 
              key={cat.name}
              className="cursor-pointer hover:border-accent/40 transition-all group flex flex-col justify-between p-5"
              onClick={() => navigate(`/student/practice/questions?category=${encodeURIComponent(cat.name)}`)}
            >
              <CardHeader className="p-0 pb-3 space-y-3">
                <div className="p-2.5 rounded-xl w-fit bg-accent/10 text-accent group-hover:scale-105 transition-transform shadow-xs">
                  {cat.icon}
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-text-primary">{cat.name}</CardTitle>
                  <p className="text-xs text-text-secondary line-clamp-2 mt-1 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0 pt-3 flex items-center justify-between border-t border-border-subtle">
                <span className="text-xs font-semibold text-text-muted">
                  {cat.count} {cat.count === 1 ? 'question' : 'questions'}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-text-muted group-hover:text-accent transition-colors font-semibold">
                  <span>Explore</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default CategoriesList;
