import type { FC, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({ title, description, breadcrumbs, actions }) => {
  return (
    <div className="mb-6 md:mb-8 space-y-2">
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex text-xs text-text-muted" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-1.5">
            {breadcrumbs.map((crumb, idx) => (
              <li key={idx} className="inline-flex items-center gap-1.5">
                {idx > 0 && <ChevronRight className="h-3 w-3 opacity-40" />}
                {crumb.href ? (
                  <Link to={crumb.href} className="hover:text-text-primary transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-text-secondary font-medium">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-text-primary">{title}</h1>
          {description && <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
