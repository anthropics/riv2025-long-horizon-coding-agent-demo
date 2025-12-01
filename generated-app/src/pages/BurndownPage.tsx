import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import type { Sprint, Issue } from '@/types';

interface BurndownDataPoint {
  date: string;
  ideal: number;
  actual: number;
}

export function BurndownPage() {
  const { projectKey } = useParams();
  const { currentProject, setCurrentProject } = useApp();
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

  const activeSprint = useMemo(() => {
    return sprints?.find(s => s.status === 'active');
  }, [sprints]);

  // Set active sprint as default
  useEffect(() => {
    if (!selectedSprintId && activeSprint) {
      setSelectedSprintId(activeSprint.id);
    }
  }, [activeSprint, selectedSprintId]);

  const selectedSprint = useMemo(() => {
    return sprints?.find(s => s.id === selectedSprintId);
  }, [sprints, selectedSprintId]);

  const sprintIssues = useLiveQuery(
    () => selectedSprintId ? db.issues.where('sprintId').equals(selectedSprintId).toArray() : [],
    [selectedSprintId]
  );

  // Generate burndown chart data
  const burndownData = useMemo(() => {
    if (!selectedSprint || !sprintIssues || !selectedSprint.startDate || !selectedSprint.endDate) {
      return [];
    }

    const startDate = new Date(selectedSprint.startDate);
    const endDate = new Date(selectedSprint.endDate);
    const totalPoints = sprintIssues.reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);

    const days: BurndownDataPoint[] = [];
    const dayCount = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const pointsPerDay = totalPoints / (dayCount - 1);

    for (let i = 0; i < dayCount; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Calculate ideal remaining
      const idealRemaining = Math.max(0, totalPoints - (pointsPerDay * i));

      // Calculate actual remaining (simplified - based on completed issues)
      const completedByDate = sprintIssues.filter(issue => {
        if (!issue.resolvedAt) return false;
        const resolved = new Date(issue.resolvedAt);
        return resolved <= date;
      });
      const completedPoints = completedByDate.reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);
      const actualRemaining = date <= new Date() ? totalPoints - completedPoints : undefined;

      days.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        ideal: Math.round(idealRemaining * 10) / 10,
        actual: actualRemaining !== undefined ? Math.round(actualRemaining * 10) / 10 : actualRemaining as any,
      });
    }

    return days;
  }, [selectedSprint, sprintIssues]);

  const totalStoryPoints = useMemo(() => {
    return sprintIssues?.reduce((sum, issue) => sum + (issue.storyPoints || 0), 0) || 0;
  }, [sprintIssues]);

  const completedStoryPoints = useMemo(() => {
    if (!sprintIssues) return 0;
    return sprintIssues
      .filter(issue => issue.resolvedAt)
      .reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);
  }, [sprintIssues]);

  if (!project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;
  }

  const completedSprints = sprints?.filter(s => s.status === 'completed') || [];
  const activeSprints = sprints?.filter(s => s.status === 'active') || [];
  const allSelectableSprints = [...activeSprints, ...completedSprints];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            Burndown Chart
          </h1>
          <p className="text-sm text-muted-foreground">
            Track sprint progress over time
          </p>
        </div>
        <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select sprint" />
          </SelectTrigger>
          <SelectContent>
            {allSelectableSprints.map((sprint) => (
              <SelectItem key={sprint.id} value={sprint.id}>
                {sprint.name} {sprint.status === 'active' && '(Active)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      {selectedSprint && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Total Points</p>
            <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              {totalStoryPoints}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-semibold text-[#2D6A4F]" style={{ fontFamily: 'var(--font-display)' }}>
              {completedStoryPoints}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="text-2xl font-semibold text-[#D4A373]" style={{ fontFamily: 'var(--font-display)' }}>
              {totalStoryPoints - completedStoryPoints}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Progress</p>
            <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              {totalStoryPoints > 0 ? Math.round((completedStoryPoints / totalStoryPoints) * 100) : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="border rounded-lg p-6 bg-card">
        {burndownData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={burndownData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--muted))' }}
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                tickLine={{ stroke: 'hsl(var(--muted))' }}
                label={{ value: 'Story Points', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <ReferenceLine y={0} stroke="hsl(var(--muted))" />
              <Line
                type="monotone"
                dataKey="ideal"
                stroke="#6B7280"
                strokeDasharray="5 5"
                strokeWidth={2}
                name="Ideal Burndown"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#2D6A4F"
                strokeWidth={3}
                name="Actual Progress"
                dot={{ fill: '#2D6A4F', r: 4 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            {selectedSprint ? 'No data available for this sprint' : 'Select a sprint to view burndown chart'}
          </div>
        )}
      </div>

      {/* Sprint Info */}
      {selectedSprint && (
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Sprint Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Start Date</dt>
                <dd>{selectedSprint.startDate ? new Date(selectedSprint.startDate).toLocaleDateString() : 'Not set'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">End Date</dt>
                <dd>{selectedSprint.endDate ? new Date(selectedSprint.endDate).toLocaleDateString() : 'Not set'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="capitalize">{selectedSprint.status}</dd>
              </div>
            </dl>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-medium mb-2">Sprint Goal</h3>
            <p className="text-sm text-muted-foreground">
              {selectedSprint.goal || 'No goal set for this sprint'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
