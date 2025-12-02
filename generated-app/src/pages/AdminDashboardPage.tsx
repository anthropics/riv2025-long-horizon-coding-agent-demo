import { useState, useEffect } from 'react';
import { Database, Table, RefreshCw, ChevronDown, ChevronRight, Download, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/db';
import { useApp } from '@/context/AppContext';

interface TableInfo {
  name: string;
  count: number;
  data: unknown[];
  schema: string;
}

interface DBStats {
  totalTables: number;
  totalRecords: number;
  dbVersion: number;
  dbName: string;
}

export function AdminDashboardPage() {
  const { translations: t } = useApp();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [stats, setStats] = useState<DBStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [selectedRecord, setSelectedRecord] = useState<{ table: string; data: unknown } | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Get all table names from the database
      const tableNames = [
        'projects',
        'issues',
        'sprints',
        'boards',
        'users',
        'labels',
        'components',
        'comments',
        'activityLog',
        'filters',
        'customFields',
        'settings',
        'workflows',
        'teamMembers',
      ];

      const tableData: TableInfo[] = [];

      // Table schema mapping for display
      const schemaMap: Record<string, string> = {
        projects: 'id, key, name, isArchived, createdAt, workflowId',
        issues: 'id, projectId, key, type, status, priority, assigneeId, epicId, parentId, sprintId, createdAt',
        sprints: 'id, projectId, status, startDate, endDate',
        boards: 'id, projectId',
        users: 'id, email, name',
        labels: 'id, projectId, name',
        components: 'id, projectId, name',
        comments: 'id, issueId, authorId, createdAt',
        activityLog: 'id, issueId, timestamp',
        filters: 'id, ownerId, projectId',
        customFields: 'id, projectId',
        settings: 'key',
        workflows: 'id, name, isDefault, createdAt',
        teamMembers: 'id, projectId, userId, name',
      };

      for (const tableName of tableNames) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const table = (db as any)[tableName];
          if (table) {
            const count = await table.count();
            const data = await table.toArray();
            tableData.push({
              name: tableName,
              count,
              data,
              schema: schemaMap[tableName] || 'unknown',
            });
          }
        } catch {
          // Table might not exist or have issues
          tableData.push({
            name: tableName,
            count: 0,
            data: [],
            schema: schemaMap[tableName] || 'unknown',
          });
        }
      }

      setTables(tableData);

      // Calculate stats
      const totalRecords = tableData.reduce((sum, t) => sum + t.count, 0);
      setStats({
        totalTables: tableData.length,
        totalRecords,
        dbVersion: db.verno,
        dbName: db.name,
      });
    } catch (error) {
      console.error('Error loading IndexedDB data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '—';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getRecordPreview = (record: unknown): string => {
    if (!record || typeof record !== 'object') return '—';
    const obj = record as Record<string, unknown>;
    // Try to get a meaningful preview
    const preview = obj.name || obj.key || obj.summary || obj.email || obj.body || obj.id;
    return preview ? String(preview) : JSON.stringify(record).slice(0, 50) + '...';
  };

  const exportTableData = (table: TableInfo) => {
    const dataStr = JSON.stringify(table.data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.name}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (count: number): string => {
    if (count === 0) return 'bg-slate-500';
    if (count < 10) return 'bg-emerald-500';
    if (count < 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex-none p-6 border-b border-border/60 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 border border-emerald-500/30">
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white font-heading tracking-tight">
                Admin Dashboard
              </h1>
              <p className="text-slate-400 text-sm mt-0.5">
                IndexedDB Data Inspector
              </p>
            </div>
          </div>
          <Button
            onClick={loadData}
            disabled={loading}
            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
          >
            <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Database</div>
              <div className="text-white font-mono text-lg font-semibold">{stats.dbName}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Version</div>
              <div className="text-emerald-400 font-mono text-lg font-semibold">v{stats.dbVersion}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Tables</div>
              <div className="text-cyan-400 font-mono text-lg font-semibold">{stats.totalTables}</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Total Records</div>
              <div className="text-amber-400 font-mono text-lg font-semibold">{stats.totalRecords.toLocaleString()}</div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex bg-slate-950">
        {/* Tables List */}
        <div className="w-2/3 border-r border-slate-800 flex flex-col">
          <div className="flex-none p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-slate-400" />
              <span className="text-slate-300 font-medium">Database Tables</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-slate-400 hover:text-slate-200"
              >
                {showRawJson ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                {showRawJson ? 'Formatted' : 'Raw JSON'}
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {tables.map((table) => (
                <div
                  key={table.name}
                  className="bg-slate-900/50 rounded-xl border border-slate-800/50 overflow-hidden transition-all duration-200 hover:border-slate-700"
                >
                  {/* Table Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/30 transition-colors"
                    onClick={() => toggleTable(table.name)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {expandedTables.has(table.name) ? (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                        <span className="font-mono text-emerald-400 font-semibold">
                          {table.name}
                        </span>
                      </div>
                      <Badge className={cn('text-white text-xs', getStatusColor(table.count))}>
                        {table.count} records
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-slate-500 font-mono hidden md:block">
                        [{table.schema}]
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          exportTableData(table);
                        }}
                        className="text-slate-400 hover:text-slate-200"
                        title="Export table data"
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Table Records */}
                  {expandedTables.has(table.name) && (
                    <div className="border-t border-slate-800/50">
                      {table.data.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 italic">
                          No records in this table
                        </div>
                      ) : (
                        <div className="max-h-[300px] overflow-y-auto">
                          {table.data.map((record, index) => (
                            <div
                              key={index}
                              className={cn(
                                'p-3 border-b border-slate-800/30 cursor-pointer transition-colors',
                                selectedRecord?.table === table.name &&
                                  selectedRecord?.data === record
                                  ? 'bg-emerald-500/10'
                                  : 'hover:bg-slate-800/20'
                              )}
                              onClick={() =>
                                setSelectedRecord({ table: table.name, data: record })
                              }
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-slate-600 font-mono text-xs w-8">
                                  #{index + 1}
                                </span>
                                {showRawJson ? (
                                  <code className="text-xs text-slate-300 font-mono truncate flex-1">
                                    {JSON.stringify(record)}
                                  </code>
                                ) : (
                                  <span className="text-slate-300 truncate flex-1">
                                    {getRecordPreview(record)}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Record Detail Panel */}
        <div className="w-1/3 flex flex-col">
          <div className="flex-none p-4 border-b border-slate-800">
            <span className="text-slate-300 font-medium">Record Inspector</span>
          </div>
          <ScrollArea className="flex-1">
            {selectedRecord ? (
              <div className="p-4">
                <div className="mb-3">
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {selectedRecord.table}
                  </Badge>
                </div>
                <pre className="bg-slate-900/50 rounded-lg p-4 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap border border-slate-800/50">
                  {JSON.stringify(selectedRecord.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-500 italic mt-8">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select a record to inspect</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-none p-3 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between text-xs text-slate-500">
        <span>IndexedDB • Dexie.js</span>
        <span>Last updated: {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
