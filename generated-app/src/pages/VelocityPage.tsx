import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { db } from '@/lib/db';
import { useApp } from '@/context/AppContext';
import type { Sprint, Issue } from '@/types';

interface VelocityDataPoint {
  name: string;
  committed: number;
  completed: number;
}

export function VelocityPage() {
  const { projectKey } = useParams();
  const { currentProject, setCurrentProject, translations: t } = useApp();
  // Using translations

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

  const issues = useLiveQuery(
    () => project ? db.issues.where('projectId').equals(project.id).toArray() : [],
    [project?.id]
  );

  // Get completed sprints for velocity chart
  const completedSprints = useMemo(() => {
    if (!sprints) return [];
    return sprints
      .filter(s => s.status === 'completed')
      .sort((a, b) => {
        const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
        return dateA - dateB;
      })
      .slice(-10); // Last 10 sprints
  }, [sprints]);

  // Generate velocity chart data
  const velocityData = useMemo(() => {
    if (!completedSprints || !issues) return [];

    return completedSprints.map(sprint => {
      const sprintIssues = issues.filter(i => i.sprintId === sprint.id);
      const committedPoints = sprintIssues.reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);
      const completedPoints = sprintIssues
        .filter(issue => issue.resolvedAt)
        .reduce((sum, issue) => sum + (issue.storyPoints || 0), 0);

      return {
        name: sprint.name,
        committed: committedPoints,
        completed: completedPoints,
      };
    });
  }, [completedSprints, issues]);

  // Calculate average velocity
  const averageVelocity = useMemo(() => {
    if (velocityData.length === 0) return 0;
    const total = velocityData.reduce((sum, d) => sum + d.completed, 0);
    return Math.round(total / velocityData.length * 10) / 10;
  }, [velocityData]);

  // Calculate commitment reliability
  const commitmentReliability = useMemo(() => {
    if (velocityData.length === 0) return 0;
    const totalCommitted = velocityData.reduce((sum, d) => sum + d.committed, 0);
    const totalCompleted = velocityData.reduce((sum, d) => sum + d.completed, 0);
    if (totalCommitted === 0) return 0;
    return Math.round((totalCompleted / totalCommitted) * 100);
  }, [velocityData]);

  // Calculate trend
  const velocityTrend = useMemo(() => {
    if (velocityData.length < 2) return 0;
    const recent = velocityData.slice(-3);
    const older = velocityData.slice(0, -3);
    if (older.length === 0) return 0;

    const recentAvg = recent.reduce((sum, d) => sum + d.completed, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.completed, 0) / older.length;

    if (olderAvg === 0) return 0;
    return Math.round(((recentAvg - olderAvg) / olderAvg) * 100);
  }, [velocityData]);

  if (!project) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">{t.loading}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
          {t.velocityChart}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.trackTeamVelocity}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">{t.averageVelocity}</p>
          <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            {averageVelocity} <span className="text-sm font-normal text-muted-foreground">{t.ptsPerSprint}</span>
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">{t.commitmentReliability}</p>
          <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            {commitmentReliability}%
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">{t.sprintsCompleted}</p>
          <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
            {completedSprints.length}
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">{t.velocityTrend}</p>
          <p className={`text-2xl font-semibold ${velocityTrend > 0 ? 'text-[#A83B4C]' : velocityTrend < 0 ? 'text-destructive' : ''}`} style={{ fontFamily: 'var(--font-display)' }}>
            {velocityTrend > 0 ? '+' : ''}{velocityTrend}%
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="border rounded-lg p-6 bg-card">
        {velocityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={velocityData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
              <XAxis
                dataKey="name"
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
              <ReferenceLine y={averageVelocity} stroke="#E8A87C" strokeDasharray="5 5" label={{ value: 'Avg', fill: '#E8A87C' }} />
              <Bar dataKey="committed" name="Committed" fill="#6B7280" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" name="Completed" fill="#A83B4C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            {t.completeSprintsToSeeVelocity}
          </div>
        )}
      </div>

      {/* Sprint History Table */}
      {velocityData.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3 font-medium">{t.sprint}</th>
                <th className="text-right p-3 font-medium">{t.committed}</th>
                <th className="text-right p-3 font-medium">{t.done}</th>
                <th className="text-right p-3 font-medium">{t.completionRate}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {velocityData.map((data, index) => (
                <tr key={index} className="hover:bg-muted/30">
                  <td className="p-3">{data.name}</td>
                  <td className="p-3 text-right">{data.committed} {t.pts}</td>
                  <td className="p-3 text-right text-[#A83B4C]">{data.completed} {t.pts}</td>
                  <td className="p-3 text-right">
                    {data.committed > 0 ? Math.round((data.completed / data.committed) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Insights */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">{t.recommendations}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {commitmentReliability < 80 && (
              <li className="flex items-start gap-2">
                <span className="text-amber-500">•</span>
                {t.reduceCommitmentWarning}
              </li>
            )}
            {velocityTrend < -10 && (
              <li className="flex items-start gap-2">
                <span className="text-destructive">•</span>
                {t.velocityTrendingDown}
              </li>
            )}
            {velocityTrend > 10 && (
              <li className="flex items-start gap-2">
                <span className="text-[#A83B4C]">•</span>
                {t.velocityImproving}
              </li>
            )}
            {velocityData.length < 3 && (
              <li className="flex items-start gap-2">
                <span className="text-muted-foreground">•</span>
                {t.moreSprintsNeeded}
              </li>
            )}
            {velocityData.length >= 3 && commitmentReliability >= 80 && velocityTrend >= -10 && (
              <li className="flex items-start gap-2">
                <span className="text-[#A83B4C]">•</span>
                {t.teamVelocityStable}
              </li>
            )}
          </ul>
        </div>
        <div className="border rounded-lg p-4">
          <h3 className="font-medium mb-2">{t.sprintPlanningSuggestion}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {t.recommendedCommitment}
          </p>
          <p className="text-3xl font-semibold text-[#A83B4C]" style={{ fontFamily: 'var(--font-display)' }}>
            {Math.round(averageVelocity * 0.9)} - {Math.round(averageVelocity * 1.1)} {t.pts}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {t.accountsForVariation}
          </p>
        </div>
      </div>
    </div>
  );
}
