import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Search, ArrowRight } from 'lucide-react';
import { useTopics } from '../../../api/questions';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card';
import { Skeleton } from '../../../components/ui/skeleton';
import { getDisplayName } from '../../../utils/display';
import { PageHeader } from '../../../components/shared/PageHeader';
import { Input } from '../../../components/ui/input';
import { EmptyState } from '../../../components/shared/EmptyState';

export const TopicsList = () => {
  const navigate = useNavigate();
  const { data: topics, isLoading } = useTopics();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTopics = topics
    ?.filter((topic: any) => 
      (topic.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader 
        title="Practice Topics" 
        description="Drill down into specific skills, algorithms, and conceptual themes."
        breadcrumbs={[
          { label: 'Dashboard', href: '/student/dashboard' },
          { label: 'Practice', href: '/student/practice' },
          { label: 'Topics' },
        ]}
      />

      <div className="max-w-md">
        <Input 
          placeholder="Filter topics..." 
          leftIcon={<Search className="h-4 w-4" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array(12).fill(0).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : !filteredTopics || filteredTopics.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              compact
              icon={<Target className="h-5 w-5" />}
              title="No Topics Found"
              description={searchTerm ? `No topics match "${searchTerm}".` : 'Topics will appear as question sets are populated.'}
            />
          </div>
        ) : (
          filteredTopics.map((topic: any) => (
            <Card 
              key={topic.id || topic.name}
              className="cursor-pointer hover:border-accent/40 transition-all group flex flex-col justify-between"
              onClick={() => navigate(`/student/practice/questions?topic=${encodeURIComponent(topic.name)}`)}
            >
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="p-2 rounded-lg bg-accent/10 text-accent">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 bg-white/5 border border-white/6 rounded-full text-text-muted truncate max-w-[120px]">
                    {getDisplayName(topic.category, 'General')}
                  </span>
                </div>
                <CardTitle className="text-sm font-semibold text-text-primary line-clamp-1">{topic.name}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 flex items-center justify-between">
                <span className="text-xs text-text-muted">
                  {topic._count?.questions != null ? `${topic._count.questions} questions` : 'Practice'}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default TopicsList;
