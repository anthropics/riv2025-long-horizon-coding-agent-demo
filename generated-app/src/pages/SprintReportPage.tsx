import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import { IssueTypeIcon } from '@/components/common/IssueTypeIcon';
import type { Sprint, Issue, User } from '@/types';

const STATUS_COLORS = {
  todo: '#6B7280',
  in_progress: '#2196F3',
  done: '#A83B4C',
};

const TYPE_COLORS = {
  Epic: '#9B59B6',
  Story: '#C25B6A',
  Bug: '#D84315',
  Task: '#2196F3',
  'Sub-task': '#6B7280',
};

export function SprintReportPage() {
  const { projectKey } = useParams();
  const { currentProject, setCurrentProject, translations: t } = useApp();
  const [selectedSprintId, setSelectedSprintId] = useState<string>('');

  useEffect(() => {
    async function loadProject() {
      if (projectKey && !currentProject) {
        const project = await db.projects.where('key').equals(projectKey).first();
        if (project) setCurrentProject(project);
      }
    }
    loadProject();
  }, [projectKey, currentProject, setCurrentProject]);

  const project = useLiveQuery(
    () => db.projects.where('key').equals(projectKey ?? '').first(),
    [projectKey]
  );

  const sprints = useLiveQuery(
    () => project ? db.sprints.where('projectId').equals(project.id).toArray() : [],
    [project?.id]
  );

  const users = useLiveQuery(() => db.users.toArray(), []);

  const board = useLiveQuery(
    () => project ? db.boards.where('projectId').equals(project.id).first() : null,
    [project?.id]
  );

  // Set first completed or active sprint as default
  useEffect(() => {
    if (!selectedSprintId && sprints && sprints.length > 0) {
      const completedSprint = sprints.find(s => s.status === 'completed');
      const activeSprint = sprints.find(s => s.status === 'active');
      if (completedSprint) setSelectedSprintId(completedSprint.id);
      else if (activeSprint) setSelectedSprintId(activeSprint.id);
    }
  }, [sprints, selectedSprintId]);

  const selectedSprint = useMemo(() => {
    return sprints?.find(s => s.id === selectedSprintId);
  }, [sprints, selectedSprintId]);

  const sprintIssues = useLiveQuery(
    () => selectedSprintId ? db.issues.where('sprintId').equals(selectedSprintId).toArray() : [],
    [selectedSprintId]
  );

  // Calculate statistics
  const stats = useMemo(() => {
    if (!sprintIssues || !board) return null;

    const totalIssues = sprintIssues.length;
    const totalPoints = sprintIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);

    // Group by status category
    const statusMap = new Map<string, string>();
    board.columns.forEach(col => statusMap.set(col.name, col.statusCategory));

    const byStatus = {
      todo: sprintIssues.filter(i => statusMap.get(i.status) === 'todo'),
      in_progress: sprintIssues.filter(i => statusMap.get(i.status) === 'in_progress'),
      done: sprintIssues.filter(i => statusMap.get(i.status) === 'done'),
    };

    // Group by type
    const byType = {
      Epic: sprintIssues.filter(i => i.type === 'Epic'),
      Story: sprintIssues.filter(i => i.type === 'Story'),
      Bug: sprintIssues.filter(i => i.type === 'Bug'),
      Task: sprintIssues.filter(i => i.type === 'Task'),
      'Sub-task': sprintIssues.filter(i => i.type === 'Sub-task'),
    };

    // Group by assignee
    const byAssignee = new Map<string, Issue[]>();
    sprintIssues.forEach(issue => {
      const assigneeId = issue.assigneeId || 'unassigned';
      if (!byAssignee.has(assigneeId)) byAssignee.set(assigneeId, []);
      byAssignee.get(assigneeId)!.push(issue);
    });

    const completedPoints = byStatus.done.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
    const completionRate = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

    return {
      totalIssues,
      totalPoints,
      completedPoints,
      completionRate,
      byStatus,
      byType,
      byAssignee,
    };
  }, [sprintIssues, board]);

  // Chart data
  const statusChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'To Do', value: stats.byStatus.todo.length, color: STATUS_COLORS.todo },
      { name: 'In Progress', value: stats.byStatus.in_progress.length, color: STATUS_COLORS.in_progress },
      { name: 'Done', value: stats.byStatus.done.length, color: STATUS_COLORS.done },
    ].filter(d => d.value > 0);
  }, [stats]);

  const typeChartData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Epic', value: stats.byType.Epic.length, color: TYPE_COLORS.Epic },
      { name: 'Story', value: stats.byType.Story.length, color: TYPE_COLORS.Story },
      { name: 'Bug', value: stats.byType.Bug.length, color: TYPE_COLORS.Bug },
      { name: 'Task', value: stats.byType.Task.length, color: TYPE_COLORS.Task },
      { name: 'Sub-task', value: stats.byType['Sub-task'].length, color: TYPE_COLORS['Sub-task'] },
    ].filter(d => d.value > 0);
  }, [stats]);

  if (!project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{t.loading}</div>;
  }

  const getUserName = (userId: string) => {
    if (userId === 'unassigned') return 'Unassigned';
    return users?.find(u => u.id === userId)?.name ?? 'Unknown';
  };

  const allSelectableSprints = sprints?.filter(s => s.status !== 'future') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            {t.sprintReport}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t.detailedBreakdown}
          </p>
        </div>
        <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t.selectSprint} />
          </SelectTrigger>
          <SelectContent>
            {allSelectableSprints.map((sprint) => (
              <SelectItem key={sprint.id} value={sprint.id}>
                {sprint.name} {sprint.status === 'active' && `(${t.activeSprint})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedSprint && stats && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{t.totalIssues}</p>
              <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                {stats.totalIssues}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{t.storyPoints}</p>
              <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
                {stats.totalPoints}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{t.done}</p>
              <p className="text-2xl font-semibold text-[#A83B4C]" style={{ fontFamily: 'var(--font-display)' }}>
                {stats.byStatus.done.length} {t.issues}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{t.completionRate}</p>
              <p className={`text-2xl font-semibold ${stats.completionRate >= 80 ? 'text-[#A83B4C]' : stats.completionRate >= 50 ? 'text-[#E8A87C]' : 'text-destructive'}`} style={{ fontFamily: 'var(--font-display)' }}>
                {stats.completionRate}%
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Status Distribution */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-4">{t.statusDistribution}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Type Distribution */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-4">{t.issueTypeDistribution}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={typeChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {typeChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Team Breakdown */}
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-4">{t.teamPerformance}</h3>
            <div className="space-y-3">
              {Array.from(stats.byAssignee.entries()).map(([assigneeId, issues]) => {
                const completedIssues = issues.filter(i => board?.columns.find(c => c.name === i.status)?.statusCategory === 'done');
                const points = issues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);
                const completedPoints = completedIssues.reduce((sum, i) => sum + (i.storyPoints || 0), 0);

                return (
                  <div key={assigneeId} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#A83B4C] flex items-center justify-center text-white text-sm font-medium">
                        {getUserName(assigneeId).charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{getUserName(assigneeId)}</p>
                        <p className="text-xs text-muted-foreground">
                          {issues.length} issues • {points} points
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-[#A83B4C]">
                        {completedIssues.length}/{issues.length} completed
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {completedPoints}/{points} pts
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Issues List */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-muted/50 p-3 font-medium">
              {t.sprintIssues}
            </div>
            <div className="divide-y max-h-[400px] overflow-auto">
              {sprintIssues?.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                  <div className="flex items-center gap-3">
                    <IssueTypeIcon type={issue.type} size={16} />
                    <div>
                      <p className="text-sm font-medium">{issue.key}</p>
                      <p className="text-sm text-muted-foreground">{issue.summary}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {issue.storyPoints !== undefined && (
                      <Badge variant="outline">{issue.storyPoints} {t.pts}</Badge>
                    )}
                    <Badge
                      style={{
                        backgroundColor:
                          board?.columns.find(c => c.name === issue.status)?.statusCategory === 'done'
                            ? '#A83B4C'
                            : board?.columns.find(c => c.name === issue.status)?.statusCategory === 'in_progress'
                            ? '#2196F3'
                            : '#6B7280',
                        color: 'white',
                      }}
                    >
                      {issue.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sprint Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">{t.sprintDetails}</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.duration}</dt>
                  <dd>
                    {selectedSprint.startDate && selectedSprint.endDate
                      ? `${new Date(selectedSprint.startDate).toLocaleDateString()} - ${new Date(selectedSprint.endDate).toLocaleDateString()}`
                      : t.notSet}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">{t.status}</dt>
                  <dd className="capitalize">{selectedSprint.status}</dd>
                </div>
                {selectedSprint.completedAt && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">{t.done}</dt>
                    <dd>{new Date(selectedSprint.completedAt).toLocaleDateString()}</dd>
                  </div>
                )}
              </dl>
            </div>
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">{t.sprintGoal}</h3>
              <p className="text-sm text-muted-foreground">
                {selectedSprint.goal || t.noGoalSet}
              </p>
            </div>
          </div>
        </>
      )}

      {!selectedSprint && (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          {t.selectSprintToViewReport}
        </div>
      )}
    </div>
  );
}
