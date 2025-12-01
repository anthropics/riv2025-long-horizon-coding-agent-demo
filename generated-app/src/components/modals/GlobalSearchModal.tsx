import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, FileText, FolderKanban, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/db';
import { IssueTypeIcon } from '@/components/common/IssueTypeIcon';
import { cn } from '@/lib/utils';
import MiniSearch from 'minisearch';
import type { Issue, Project, User as UserType } from '@/types';

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SearchResult {
  id: string;
  type: 'issue' | 'project' | 'user';
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  data: Issue | Project | UserType;
}

export function GlobalSearchModal({ open, onOpenChange }: GlobalSearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load all data for searching
  const issues = useLiveQuery(() => db.issues.toArray(), []);
  const projects = useLiveQuery(() => db.projects.filter(p => !p.isArchived).toArray(), []);
  const users = useLiveQuery(() => db.users.toArray(), []);

  // Create search index
  const searchIndex = useMemo(() => {
    const miniSearch = new MiniSearch<Issue>({
      fields: ['summary', 'description', 'key'],
      storeFields: ['id', 'key', 'summary', 'type', 'projectId'],
      searchOptions: {
        boost: { key: 3, summary: 2 },
        fuzzy: 0.2,
        prefix: true,
      },
    });

    if (issues?.length) {
      miniSearch.addAll(issues);
    }

    return miniSearch;
  }, [issues]);

  // Perform search
  const results = useMemo<SearchResult[]>(() => {
    if (!query.trim()) {
      // Show recent items when no query
      const recentResults: SearchResult[] = [];

      // Recent projects
      projects?.slice(0, 3).forEach((project) => {
        recentResults.push({
          id: `project-${project.id}`,
          type: 'project',
          title: project.name,
          subtitle: project.key,
          icon: <FolderKanban className="w-4 h-4" style={{ color: project.color }} />,
          data: project,
        });
      });

      // Recent issues
      issues?.slice(0, 5).forEach((issue) => {
        const project = projects?.find(p => p.id === issue.projectId);
        recentResults.push({
          id: `issue-${issue.id}`,
          type: 'issue',
          title: issue.summary,
          subtitle: `${issue.key} • ${project?.name ?? 'Unknown'}`,
          icon: <IssueTypeIcon type={issue.type} size={16} />,
          data: issue,
        });
      });

      return recentResults;
    }

    const searchResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Search issues using MiniSearch
    const issueResults = searchIndex.search(query);
    issueResults.slice(0, 8).forEach((result) => {
      const issue = issues?.find(i => i.id === result.id);
      if (issue) {
        const project = projects?.find(p => p.id === issue.projectId);
        searchResults.push({
          id: `issue-${issue.id}`,
          type: 'issue',
          title: issue.summary,
          subtitle: `${issue.key} • ${project?.name ?? 'Unknown'}`,
          icon: <IssueTypeIcon type={issue.type} size={16} />,
          data: issue,
        });
      }
    });

    // Search projects
    projects?.forEach((project) => {
      if (
        project.name.toLowerCase().includes(lowerQuery) ||
        project.key.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: `project-${project.id}`,
          type: 'project',
          title: project.name,
          subtitle: project.key,
          icon: <FolderKanban className="w-4 h-4" style={{ color: project.color }} />,
          data: project,
        });
      }
    });

    // Search users
    users?.forEach((user) => {
      if (
        user.name.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery)
      ) {
        searchResults.push({
          id: `user-${user.id}`,
          type: 'user',
          title: user.name,
          subtitle: user.email,
          icon: <User className="w-4 h-4" />,
          data: user,
        });
      }
    });

    return searchResults;
  }, [query, issues, projects, users, searchIndex]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [open]);

  const handleSelect = useCallback((result: SearchResult) => {
    onOpenChange(false);

    switch (result.type) {
      case 'issue': {
        const issue = result.data as Issue;
        const project = projects?.find(p => p.id === issue.projectId);
        if (project) {
          navigate(`/project/${project.key}/board?issue=${issue.key}`);
        }
        break;
      }
      case 'project': {
        const project = result.data as Project;
        navigate(`/project/${project.key}/board`);
        break;
      }
      case 'user': {
        navigate('/settings');
        break;
      }
    }
  }, [navigate, onOpenChange, projects]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        onOpenChange(false);
        break;
    }
  }, [results, selectedIndex, handleSelect, onOpenChange]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      projects: [],
      issues: [],
      users: [],
    };

    results.forEach((result) => {
      switch (result.type) {
        case 'project':
          groups.projects.push(result);
          break;
        case 'issue':
          groups.issues.push(result);
          break;
        case 'user':
          groups.users.push(result);
          break;
      }
    });

    return groups;
  }, [results]);

  let globalIndex = 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden" onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-3 px-4 border-b">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search issues, projects, and more..."
            className="border-0 focus-visible:ring-0 text-base h-14 px-0"
            autoFocus
          />
        </div>

        <div className="max-h-[400px] overflow-auto">
          {results.length === 0 && query.trim() ? (
            <div className="py-8 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {groupedResults.projects.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    Projects
                  </div>
                  {groupedResults.projects.map((result) => {
                    const currentIndex = globalIndex++;
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted transition-colors',
                          selectedIndex === currentIndex && 'bg-muted'
                        )}
                      >
                        {result.icon}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{result.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {groupedResults.issues.length > 0 && (
                <div className="mb-2">
                  <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    Issues
                  </div>
                  {groupedResults.issues.map((result) => {
                    const currentIndex = globalIndex++;
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted transition-colors',
                          selectedIndex === currentIndex && 'bg-muted'
                        )}
                      >
                        {result.icon}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{result.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {groupedResults.users.length > 0 && (
                <div>
                  <div className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase">
                    People
                  </div>
                  {groupedResults.users.map((result) => {
                    const currentIndex = globalIndex++;
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelect(result)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-muted transition-colors',
                          selectedIndex === currentIndex && 'bg-muted'
                        )}
                      >
                        {result.icon}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{result.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {result.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t bg-muted/30 text-xs text-muted-foreground flex items-center gap-4">
          <span>
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">↑</kbd>
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px] ml-1">↓</kbd>
            <span className="ml-1.5">to navigate</span>
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">↵</kbd>
            <span className="ml-1.5">to select</span>
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 bg-background border rounded text-[10px]">esc</kbd>
            <span className="ml-1.5">to close</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
