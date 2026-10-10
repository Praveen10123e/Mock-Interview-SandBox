import React from 'react';
import {
  BrainCircuit,
  Code2,
  Database,
  Users,
  Network,
  Layout,
  Cpu,
  HardDrive,
  Binary,
} from 'lucide-react';

export interface StudentCategoryInfo {
  name: string;
  description: string;
  icon: React.ReactNode;
}

export const STUDENT_CATEGORY_LIST: { name: string; description: string; icon: React.ReactNode }[] = [
  {
    name: 'Aptitude',
    description: 'Quantitative aptitude, logical reasoning, and verbal ability problem sets.',
    icon: <BrainCircuit className="h-5 w-5" />,
  },
  {
    name: 'Programming',
    description: 'Data structures, algorithms, and multi-language implementation challenges.',
    icon: <Code2 className="h-5 w-5" />,
  },
  {
    name: 'SQL',
    description: 'Relational schema queries, aggregation, joins, and database optimization.',
    icon: <Database className="h-5 w-5" />,
  },
  {
    name: 'HR',
    description: 'Behavioral, situational, and competency-based interview questions.',
    icon: <Users className="h-5 w-5" />,
  },
  {
    name: 'Networking',
    description: 'Computer network protocols, OSI model, IP routing, and socket architectures.',
    icon: <Network className="h-5 w-5" />,
  },
  {
    name: 'Web Designing MCQ',
    description: 'HTML5, CSS3, modern layout models, responsive design, and DOM principles.',
    icon: <Layout className="h-5 w-5" />,
  },
  {
    name: 'Operating Systems',
    description: 'Process scheduling, concurrency, memory management, and file systems.',
    icon: <Cpu className="h-5 w-5" />,
  },
  {
    name: 'DBMS MCQ',
    description: 'Database management systems, ACID properties, normalization, and indexing.',
    icon: <HardDrive className="h-5 w-5" />,
  },
  {
    name: 'Data Structures MCQ',
    description: 'Trees, graphs, heaps, hash tables, and asymptotic complexity MCQs.',
    icon: <Binary className="h-5 w-5" />,
  },
];

/**
 * Maps any raw database/dataset category or sub-category into one of the 9 canonical student categories.
 */
export const mapToStudentCategory = (rawCategoryName: string | undefined | null): string => {
  if (!rawCategoryName) return 'Programming';
  const lower = rawCategoryName.toLowerCase().trim();

  // Consolidate all Aptitude categories
  if (
    lower.includes('aptitude') ||
    lower.includes('quantitative') ||
    lower.includes('logical') ||
    lower.includes('verbal') ||
    lower.includes('reasoning') ||
    lower.startsWith('apt-')
  ) {
    return 'Aptitude';
  }

  // Consolidate all HR sub-categories
  if (
    lower.includes('hr') ||
    lower.includes('adaptability') ||
    lower.includes('conflict') ||
    lower.includes('career') ||
    lower.includes('team') ||
    lower.includes('culture') ||
    lower.includes('motivation') ||
    lower.includes('leadership') ||
    lower.includes('work style') ||
    lower.includes('introduction') ||
    lower.includes('self-assessment') ||
    lower.includes('resilience') ||
    lower.includes('stress') ||
    lower.startsWith('hr-')
  ) {
    return 'HR';
  }

  // Web Designing MCQ
  if (lower.includes('web design') || lower.includes('html') || lower.includes('css')) {
    return 'Web Designing MCQ';
  }

  // DBMS MCQ
  if (lower.includes('dbms') || (lower.includes('database') && lower.includes('mcq'))) {
    return 'DBMS MCQ';
  }

  // SQL
  if (lower === 'sql' || lower.includes('sql query') || lower.includes('relational query')) {
    return 'SQL';
  }

  // Operating Systems
  if (lower.includes('operating system') || lower === 'os' || lower.startsWith('os ')) {
    return 'Operating Systems';
  }

  // Data Structures MCQ
  if (lower.includes('data structure') && (lower.includes('mcq') || lower.includes('concept'))) {
    return 'Data Structures MCQ';
  }

  // Networking
  if (lower.includes('network') || lower.includes('tcp') || lower.includes('osi') || lower.includes('socket')) {
    return 'Networking';
  }

  // Programming / Coding fallback
  return 'Programming';
};

export const getCategoryIcon = (categoryName: string): React.ReactNode => {
  const found = STUDENT_CATEGORY_LIST.find(
    (c) => c.name.toLowerCase() === categoryName.toLowerCase()
  );
  return found ? found.icon : <Code2 className="h-5 w-5" />;
};

export interface ProcessedCategory {
  name: string;
  description: string;
  icon: React.ReactNode;
  count: number;
}

/**
 * Aggregates raw categories from API to dynamically compute accurate question counts for the 9 canonical categories.
 */
export const getProcessedStudentCategories = (rawCategories: any[] = []): ProcessedCategory[] => {
  const countMap: Record<string, number> = {
    'Aptitude': 0,
    'Programming': 0,
    'SQL': 0,
    'HR': 0,
    'Networking': 0,
    'Web Designing MCQ': 0,
    'Operating Systems': 0,
    'DBMS MCQ': 0,
    'Data Structures MCQ': 0,
  };

  rawCategories.forEach((cat) => {
    const canonicalName = mapToStudentCategory(cat?.name);
    const count = cat?._count?.questions ?? cat?.questionCount ?? 0;
    if (countMap[canonicalName] !== undefined) {
      countMap[canonicalName] += count;
    }
  });

  return STUDENT_CATEGORY_LIST.map((item) => ({
    name: item.name,
    description: item.description,
    icon: item.icon,
    count: countMap[item.name] || 0,
  }));
};
