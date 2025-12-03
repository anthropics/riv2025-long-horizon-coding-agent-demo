import Dexie, { Table } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import type {
  Project,
  Issue,
  Sprint,
  Board,
  User,
  Label,
  Component,
  Comment,
  ActivityLog,
  Filter,
  CustomField,
  AppSettings,
  BoardColumn,
  Workflow,
  TeamMember,
  AuthUser,
  AuthSession,
} from '@/types';

// Define the Dexie database
export class CanopyDB extends Dexie {
  projects!: Table<Project>;
  issues!: Table<Issue>;
  sprints!: Table<Sprint>;
  boards!: Table<Board>;
  users!: Table<User>;
  labels!: Table<Label>;
  components!: Table<Component>;
  comments!: Table<Comment>;
  activityLog!: Table<ActivityLog>;
  filters!: Table<Filter>;
  customFields!: Table<CustomField>;
  settings!: Table<AppSettings>;
  workflows!: Table<Workflow>;
  teamMembers!: Table<TeamMember>;
  authUsers!: Table<AuthUser>;
  authSessions!: Table<AuthSession>;

  constructor() {
    super('CanopyDB');

    this.version(1).stores({
      projects: 'id, key, name, isArchived, createdAt',
      issues: 'id, projectId, key, type, status, priority, assigneeId, epicId, parentId, sprintId, createdAt, [projectId+status], [projectId+sprintId], [projectId+epicId]',
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
    });

    this.version(2).stores({
      projects: 'id, key, name, isArchived, createdAt, workflowId',
      issues: 'id, projectId, key, type, status, priority, assigneeId, epicId, parentId, sprintId, createdAt, [projectId+status], [projectId+sprintId], [projectId+epicId]',
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
    });

    this.version(3).stores({
      projects: 'id, key, name, isArchived, createdAt, workflowId',
      issues: 'id, projectId, key, type, status, priority, assigneeId, epicId, parentId, sprintId, createdAt, [projectId+status], [projectId+sprintId], [projectId+epicId]',
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
      teamMembers: 'id, projectId, userId, name, [projectId+userId]',
    });

    // Version 4: Add authentication tables and ownerId to all entities
    this.version(4).stores({
      projects: 'id, key, name, isArchived, createdAt, workflowId, ownerId',
      issues: 'id, projectId, key, type, status, priority, assigneeId, epicId, parentId, sprintId, createdAt, [projectId+status], [projectId+sprintId], [projectId+epicId]',
      sprints: 'id, projectId, status, startDate, endDate',
      boards: 'id, projectId',
      users: 'id, email, name, ownerId',
      labels: 'id, projectId, name',
      components: 'id, projectId, name',
      comments: 'id, issueId, authorId, createdAt',
      activityLog: 'id, issueId, timestamp',
      filters: 'id, ownerId, projectId',
      customFields: 'id, projectId',
      settings: 'key',
      workflows: 'id, name, isDefault, createdAt, ownerId',
      teamMembers: 'id, projectId, userId, name, [projectId+userId]',
      authUsers: 'id, email',
      authSessions: 'id, userId, token, expiresAt',
    });
  }
}

export const db = new CanopyDB();

// Default board columns
export const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: 'todo', name: 'To Do', statusCategory: 'todo', sortOrder: 0 },
  { id: 'in-progress', name: 'In Progress', statusCategory: 'in_progress', sortOrder: 1 },
  { id: 'in-review', name: 'In Review', statusCategory: 'in_progress', sortOrder: 2 },
  { id: 'done', name: 'Done', statusCategory: 'done', sortOrder: 3 },
];

// User colors for auto-assignment
export const USER_COLORS = [
  '#E8A87C', // Coral (primary accent)
  '#C25B6A', // Rose
  '#2196F3', // Blue
  '#9B59B6', // Purple
  '#D84315', // Deep Orange
  '#7B2332', // Ruby Red
  '#B85C6E', // Dusty Rose
  '#E9C46A', // Yellow
  '#A83B4C', // Light Ruby
  '#F4A261', // Orange
];

// Helper to get next available color
export function getNextUserColor(existingColors: string[]): string {
  const availableColors = USER_COLORS.filter(c => !existingColors.includes(c));
  return availableColors.length > 0 ? availableColors[0] : USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

// Initialize default user if none exists
export async function initializeDefaultUser(): Promise<User> {
  const existingUsers = await db.users.count();
  if (existingUsers === 0) {
    const defaultUser: User = {
      id: uuidv4(),
      name: 'Me',
      email: 'me@canopy.local',
      color: USER_COLORS[0],
      role: 'admin',
      createdAt: new Date(),
      settings: {
        theme: 'light',
        sidebarCollapsed: false,
        issueDetailMode: 'panel',
        dateFormat: 'MMM d, yyyy',
      },
    };
    await db.users.add(defaultUser);
    await db.settings.put({ key: 'currentUserId', value: defaultUser.id });
    return defaultUser;
  }
  const currentUserIdSetting = await db.settings.get('currentUserId');
  if (currentUserIdSetting?.value) {
    const user = await db.users.get(currentUserIdSetting.value as string);
    if (user) return user;
  }
  const firstUser = await db.users.toCollection().first();
  if (firstUser) {
    await db.settings.put({ key: 'currentUserId', value: firstUser.id });
    return firstUser;
  }
  throw new Error('Unable to initialize user');
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  const currentUserIdSetting = await db.settings.get('currentUserId');
  if (currentUserIdSetting?.value) {
    return await db.users.get(currentUserIdSetting.value as string) ?? null;
  }
  return null;
}

// Set current user
export async function setCurrentUser(userId: string): Promise<void> {
  await db.settings.put({ key: 'currentUserId', value: userId });
}

// Project helpers
export async function createProject(data: Omit<Project, 'id' | 'createdAt' | 'updatedAt' | 'issueCounter'>): Promise<Project> {
  const now = new Date();
  const project: Project = {
    ...data,
    id: uuidv4(),
    issueCounter: 0,
    createdAt: now,
    updatedAt: now,
  };

  await db.projects.add(project);

  // Create default board for project
  const board: Board = {
    id: uuidv4(),
    projectId: project.id,
    name: 'Board',
    columns: [...DEFAULT_COLUMNS],
    swimlaneBy: 'none',
  };
  await db.boards.add(board);

  return project;
}

export async function updateProject(id: string, updates: Partial<Project>): Promise<void> {
  await db.projects.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteProject(id: string): Promise<void> {
  await db.transaction('rw', [db.projects, db.issues, db.sprints, db.boards, db.labels, db.components, db.comments, db.activityLog, db.filters, db.customFields, db.teamMembers], async () => {
    // Get all issues for this project
    const issues = await db.issues.where('projectId').equals(id).toArray();
    const issueIds = issues.map(i => i.id);

    // Delete all related data
    await db.comments.where('issueId').anyOf(issueIds).delete();
    await db.activityLog.where('issueId').anyOf(issueIds).delete();
    await db.issues.where('projectId').equals(id).delete();
    await db.sprints.where('projectId').equals(id).delete();
    await db.boards.where('projectId').equals(id).delete();
    await db.labels.where('projectId').equals(id).delete();
    await db.components.where('projectId').equals(id).delete();
    await db.filters.where('projectId').equals(id).delete();
    await db.customFields.where('projectId').equals(id).delete();
    await db.teamMembers.where('projectId').equals(id).delete();
    await db.projects.delete(id);
  });
}

// Issue helpers
export async function createIssue(data: Omit<Issue, 'id' | 'key' | 'createdAt' | 'updatedAt' | 'sortOrder'>): Promise<Issue> {
  const now = new Date();
  const project = await db.projects.get(data.projectId);
  if (!project) throw new Error('Project not found');

  // Increment issue counter
  const newCounter = project.issueCounter + 1;
  await db.projects.update(project.id, { issueCounter: newCounter, updatedAt: now });

  // Get max sort order for the status
  const existingIssues = await db.issues.where('[projectId+status]').equals([data.projectId, data.status]).toArray();
  const maxSortOrder = existingIssues.length > 0 ? Math.max(...existingIssues.map(i => i.sortOrder)) : -1;

  const issue: Issue = {
    ...data,
    id: uuidv4(),
    key: `${project.key}-${newCounter}`,
    createdAt: now,
    updatedAt: now,
    sortOrder: maxSortOrder + 1,
  };

  await db.issues.add(issue);

  // Log creation activity
  await logActivity(issue.id, data.reporterId, 'created');

  return issue;
}

export async function updateIssue(id: string, updates: Partial<Issue>, userId: string): Promise<void> {
  const existingIssue = await db.issues.get(id);
  if (!existingIssue) throw new Error('Issue not found');

  const now = new Date();
  const updatedFields: Partial<Issue> = { ...updates, updatedAt: now };

  // Handle resolved date
  if (updates.status) {
    const board = await db.boards.where('projectId').equals(existingIssue.projectId).first();
    if (board) {
      const newColumn = board.columns.find(c => c.id === updates.status);
      const oldColumn = board.columns.find(c => c.id === existingIssue.status);

      if (newColumn?.statusCategory === 'done' && oldColumn?.statusCategory !== 'done') {
        updatedFields.resolvedAt = now;
      } else if (newColumn?.statusCategory !== 'done' && oldColumn?.statusCategory === 'done') {
        updatedFields.resolvedAt = undefined;
      }
    }
  }

  await db.issues.update(id, updatedFields);

  // Log activity for tracked changes
  if (updates.status && updates.status !== existingIssue.status) {
    await logActivity(id, userId, 'status_changed', 'status', existingIssue.status, updates.status);
  }
  if (updates.assigneeId !== undefined && updates.assigneeId !== existingIssue.assigneeId) {
    const oldUser = existingIssue.assigneeId ? await db.users.get(existingIssue.assigneeId) : null;
    const newUser = updates.assigneeId ? await db.users.get(updates.assigneeId) : null;
    await logActivity(id, userId, 'assigned', 'assignee', oldUser?.name ?? 'Unassigned', newUser?.name ?? 'Unassigned');
  }
  if (updates.priority && updates.priority !== existingIssue.priority) {
    await logActivity(id, userId, 'priority_changed', 'priority', existingIssue.priority, updates.priority);
  }
  if (updates.sprintId !== undefined && updates.sprintId !== existingIssue.sprintId) {
    const oldSprint = existingIssue.sprintId ? await db.sprints.get(existingIssue.sprintId) : null;
    const newSprint = updates.sprintId ? await db.sprints.get(updates.sprintId) : null;
    await logActivity(id, userId, 'sprint_changed', 'sprint', oldSprint?.name ?? 'Backlog', newSprint?.name ?? 'Backlog');
  }
  if (updates.epicId !== undefined && updates.epicId !== existingIssue.epicId) {
    const oldEpic = existingIssue.epicId ? await db.issues.get(existingIssue.epicId) : null;
    const newEpic = updates.epicId ? await db.issues.get(updates.epicId) : null;
    await logActivity(id, userId, 'epic_changed', 'epic', oldEpic?.key ?? 'None', newEpic?.key ?? 'None');
  }
}

export async function deleteIssue(id: string): Promise<void> {
  await db.transaction('rw', [db.issues, db.comments, db.activityLog], async () => {
    // Delete sub-tasks first
    await db.issues.where('parentId').equals(id).delete();
    // Unlink child issues from epic if this is an epic
    await db.issues.where('epicId').equals(id).modify({ epicId: undefined });
    // Delete comments and activity
    await db.comments.where('issueId').equals(id).delete();
    await db.activityLog.where('issueId').equals(id).delete();
    // Delete the issue
    await db.issues.delete(id);
  });
}

// Sprint helpers
export async function createSprint(data: Omit<Sprint, 'id' | 'createdAt'>): Promise<Sprint> {
  const sprint: Sprint = {
    ...data,
    id: uuidv4(),
    createdAt: new Date(),
  };
  await db.sprints.add(sprint);
  return sprint;
}

export async function startSprint(id: string): Promise<void> {
  const sprint = await db.sprints.get(id);
  if (!sprint) throw new Error('Sprint not found');

  // End any other active sprint in the project
  await db.sprints.where('projectId').equals(sprint.projectId).and(s => s.status === 'active').modify({ status: 'completed' as const, completedAt: new Date() });

  await db.sprints.update(id, {
    status: 'active',
    startDate: sprint.startDate ?? new Date(),
  });
}

export async function completeSprint(id: string, moveIncompleteTo: 'backlog' | string): Promise<void> {
  const sprint = await db.sprints.get(id);
  if (!sprint) throw new Error('Sprint not found');

  // Calculate velocity (completed story points)
  const issues = await db.issues.where('sprintId').equals(id).toArray();
  const board = await db.boards.where('projectId').equals(sprint.projectId).first();

  let completedPoints = 0;
  if (board) {
    const doneColumnIds = board.columns.filter(c => c.statusCategory === 'done').map(c => c.id);
    const completedIssues = issues.filter(i => doneColumnIds.includes(i.status));
    completedPoints = completedIssues.reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

    // Move incomplete issues
    const incompleteIssues = issues.filter(i => !doneColumnIds.includes(i.status));
    for (const issue of incompleteIssues) {
      await db.issues.update(issue.id, {
        sprintId: moveIncompleteTo === 'backlog' ? undefined : moveIncompleteTo,
        updatedAt: new Date(),
      });
    }
  }

  await db.sprints.update(id, {
    status: 'completed',
    completedAt: new Date(),
    velocity: completedPoints,
  });
}

// Comment helpers
export async function addComment(issueId: string, authorId: string, body: string): Promise<Comment> {
  const comment: Comment = {
    id: uuidv4(),
    issueId,
    authorId,
    body,
    createdAt: new Date(),
    updatedAt: new Date(),
    isEdited: false,
  };
  await db.comments.add(comment);
  await logActivity(issueId, authorId, 'comment_added');
  return comment;
}

export async function updateComment(id: string, body: string, userId: string): Promise<void> {
  const comment = await db.comments.get(id);
  if (!comment) throw new Error('Comment not found');

  await db.comments.update(id, {
    body,
    updatedAt: new Date(),
    isEdited: true,
  });
  await logActivity(comment.issueId, userId, 'comment_edited');
}

export async function deleteComment(id: string, userId: string): Promise<void> {
  const comment = await db.comments.get(id);
  if (!comment) throw new Error('Comment not found');

  await db.comments.delete(id);
  await logActivity(comment.issueId, userId, 'comment_deleted');
}

// Activity logging
export async function logActivity(
  issueId: string,
  userId: string,
  action: ActivityLog['action'],
  field?: string,
  fromValue?: string,
  toValue?: string
): Promise<void> {
  const activity: ActivityLog = {
    id: uuidv4(),
    issueId,
    userId,
    action,
    field,
    fromValue,
    toValue,
    timestamp: new Date(),
  };
  await db.activityLog.add(activity);
}

// Label helpers
export async function createLabel(data: Omit<Label, 'id'>): Promise<Label> {
  const label: Label = { ...data, id: uuidv4() };
  await db.labels.add(label);
  return label;
}

// Component helpers
export async function createComponent(data: Omit<Component, 'id'>): Promise<Component> {
  const component: Component = { ...data, id: uuidv4() };
  await db.components.add(component);
  return component;
}

// Workflow helpers
export const DEFAULT_WORKFLOW_ID = 'default-workflow';

export const DEFAULT_WORKFLOW: Workflow = {
  id: DEFAULT_WORKFLOW_ID,
  name: 'Default Workflow',
  description: 'The standard workflow with Open, In Progress, In Review, and Done statuses',
  statuses: [
    { id: 'open', name: 'Open', statusCategory: 'todo', sortOrder: 0 },
    { id: 'in-progress', name: 'In Progress', statusCategory: 'in_progress', sortOrder: 1 },
    { id: 'in-review', name: 'In Review', statusCategory: 'in_progress', sortOrder: 2 },
    { id: 'done', name: 'Done', statusCategory: 'done', sortOrder: 3 },
  ],
  transitions: [
    { fromStatusId: 'open', toStatusId: 'in-progress' },
    { fromStatusId: 'in-progress', toStatusId: 'in-review' },
    { fromStatusId: 'in-review', toStatusId: 'done' },
    { fromStatusId: 'in-progress', toStatusId: 'open' },
    { fromStatusId: 'in-review', toStatusId: 'in-progress' },
    { fromStatusId: 'done', toStatusId: 'in-review' },
  ],
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export async function initializeDefaultWorkflow(): Promise<Workflow> {
  try {
    const existingWorkflow = await db.workflows.get(DEFAULT_WORKFLOW_ID);
    if (!existingWorkflow) {
      await db.workflows.put(DEFAULT_WORKFLOW);
      return DEFAULT_WORKFLOW;
    }
    return existingWorkflow;
  } catch (error) {
    // If there's an error, try to return the workflow anyway
    const workflow = await db.workflows.get(DEFAULT_WORKFLOW_ID);
    return workflow ?? DEFAULT_WORKFLOW;
  }
}

export async function createWorkflow(data: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workflow> {
  const now = new Date();
  const workflow: Workflow = {
    ...data,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  await db.workflows.add(workflow);
  return workflow;
}

export async function updateWorkflow(id: string, updates: Partial<Workflow>): Promise<void> {
  await db.workflows.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteWorkflow(id: string): Promise<void> {
  // Don't allow deleting the default workflow
  if (id === DEFAULT_WORKFLOW_ID) {
    throw new Error('Cannot delete the default workflow');
  }

  // Reset any projects using this workflow to the default
  await db.projects.where('workflowId').equals(id).modify({ workflowId: undefined });
  await db.workflows.delete(id);
}

export async function getWorkflowForProject(projectId: string): Promise<Workflow> {
  const project = await db.projects.get(projectId);
  if (!project) throw new Error('Project not found');

  if (project.workflowId) {
    const workflow = await db.workflows.get(project.workflowId);
    if (workflow) return workflow;
  }

  // Return default workflow if none assigned
  await initializeDefaultWorkflow();
  const defaultWorkflow = await db.workflows.get(DEFAULT_WORKFLOW_ID);
  return defaultWorkflow ?? DEFAULT_WORKFLOW;
}

// Filter helpers
export async function createFilter(data: Omit<Filter, 'id' | 'createdAt'>): Promise<Filter> {
  const filter: Filter = { ...data, id: uuidv4(), createdAt: new Date() };
  await db.filters.add(filter);
  return filter;
}

// User helpers
export async function createUser(data: Omit<User, 'id' | 'createdAt'>): Promise<User> {
  const user: User = { ...data, id: uuidv4(), createdAt: new Date() };
  await db.users.add(user);
  return user;
}

// Export/Import helpers
export async function exportAllData(): Promise<string> {
  const data = {
    projects: await db.projects.toArray(),
    issues: await db.issues.toArray(),
    sprints: await db.sprints.toArray(),
    boards: await db.boards.toArray(),
    users: await db.users.toArray(),
    labels: await db.labels.toArray(),
    components: await db.components.toArray(),
    comments: await db.comments.toArray(),
    activityLog: await db.activityLog.toArray(),
    filters: await db.filters.toArray(),
    customFields: await db.customFields.toArray(),
    settings: await db.settings.toArray(),
    workflows: await db.workflows.toArray(),
    exportedAt: new Date().toISOString(),
    version: 2,
  };
  return JSON.stringify(data, null, 2);
}

export async function importAllData(jsonString: string): Promise<void> {
  const data = JSON.parse(jsonString);

  await db.transaction('rw', [
    db.projects, db.issues, db.sprints, db.boards, db.users,
    db.labels, db.components, db.comments, db.activityLog,
    db.filters, db.customFields, db.settings, db.workflows
  ], async () => {
    // Clear existing data
    await db.projects.clear();
    await db.issues.clear();
    await db.sprints.clear();
    await db.boards.clear();
    await db.users.clear();
    await db.labels.clear();
    await db.components.clear();
    await db.comments.clear();
    await db.activityLog.clear();
    await db.filters.clear();
    await db.customFields.clear();
    await db.settings.clear();
    await db.workflows.clear();

    // Import new data
    if (data.projects?.length) await db.projects.bulkAdd(data.projects);
    if (data.issues?.length) await db.issues.bulkAdd(data.issues);
    if (data.sprints?.length) await db.sprints.bulkAdd(data.sprints);
    if (data.boards?.length) await db.boards.bulkAdd(data.boards);
    if (data.users?.length) await db.users.bulkAdd(data.users);
    if (data.labels?.length) await db.labels.bulkAdd(data.labels);
    if (data.components?.length) await db.components.bulkAdd(data.components);
    if (data.comments?.length) await db.comments.bulkAdd(data.comments);
    if (data.activityLog?.length) await db.activityLog.bulkAdd(data.activityLog);
    if (data.filters?.length) await db.filters.bulkAdd(data.filters);
    if (data.customFields?.length) await db.customFields.bulkAdd(data.customFields);
    if (data.settings?.length) await db.settings.bulkAdd(data.settings);
    if (data.workflows?.length) await db.workflows.bulkAdd(data.workflows);
  });
}

export async function clearAllData(): Promise<void> {
  await db.transaction('rw', [
    db.projects, db.issues, db.sprints, db.boards, db.users,
    db.labels, db.components, db.comments, db.activityLog,
    db.filters, db.customFields, db.settings, db.workflows, db.teamMembers
  ], async () => {
    await db.projects.clear();
    await db.issues.clear();
    await db.sprints.clear();
    await db.boards.clear();
    await db.users.clear();
    await db.labels.clear();
    await db.components.clear();
    await db.comments.clear();
    await db.activityLog.clear();
    await db.filters.clear();
    await db.customFields.clear();
    await db.settings.clear();
    await db.workflows.clear();
    await db.teamMembers.clear();
  });
}

export async function exportProject(projectId: string): Promise<string> {
  const project = await db.projects.get(projectId);
  if (!project) throw new Error('Project not found');

  const issues = await db.issues.where('projectId').equals(projectId).toArray();
  const issueIds = issues.map(i => i.id);

  const data = {
    project,
    issues,
    sprints: await db.sprints.where('projectId').equals(projectId).toArray(),
    boards: await db.boards.where('projectId').equals(projectId).toArray(),
    labels: await db.labels.where('projectId').equals(projectId).toArray(),
    components: await db.components.where('projectId').equals(projectId).toArray(),
    comments: await db.comments.where('issueId').anyOf(issueIds).toArray(),
    activityLog: await db.activityLog.where('issueId').anyOf(issueIds).toArray(),
    customFields: await db.customFields.where('projectId').equals(projectId).toArray(),
    teamMembers: await db.teamMembers.where('projectId').equals(projectId).toArray(),
    exportedAt: new Date().toISOString(),
    version: 1,
  };
  return JSON.stringify(data, null, 2);
}

// Team Member helpers
export async function createTeamMember(data: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<TeamMember> {
  const now = new Date();
  const teamMember: TeamMember = {
    ...data,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  await db.teamMembers.add(teamMember);
  return teamMember;
}

export async function updateTeamMember(id: string, updates: Partial<TeamMember>): Promise<void> {
  await db.teamMembers.update(id, { ...updates, updatedAt: new Date() });
}

export async function deleteTeamMember(id: string): Promise<void> {
  // Get the team member to unassign issues
  const teamMember = await db.teamMembers.get(id);
  if (teamMember) {
    // Unassign all issues from this team member
    await db.issues.where('assigneeId').equals(teamMember.userId).modify({ assigneeId: undefined });
  }
  await db.teamMembers.delete(id);
}

export async function getTeamMembersForProject(projectId: string): Promise<TeamMember[]> {
  return await db.teamMembers.where('projectId').equals(projectId).toArray();
}

// =============================================================================
// Authentication helpers
// =============================================================================

// Simple hash function for password (not cryptographically secure, but works for demo)
// In production, use bcrypt or similar
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
}

function generateToken(): string {
  return uuidv4() + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2);
}

// Create a new auth user (sign up)
export async function signUp(email: string, password: string, name: string): Promise<{ user: AuthUser; session: AuthSession }> {
  // Check if email already exists
  const existingUser = await db.authUsers.where('email').equals(email.toLowerCase()).first();
  if (existingUser) {
    throw new Error('Email already registered');
  }

  const now = new Date();
  const passwordHash = await hashPassword(password);

  const authUser: AuthUser = {
    id: uuidv4(),
    email: email.toLowerCase(),
    passwordHash,
    name,
    color: USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)],
    createdAt: now,
    lastLoginAt: now,
    settings: {
      theme: 'light',
      colorTheme: 'ruby',
      language: 'en',
      sidebarCollapsed: false,
    },
  };

  await db.authUsers.add(authUser);

  // Create a session
  const session = await createSession(authUser.id);

  // Also create a default "user" profile for backward compatibility
  const userProfile: User = {
    id: uuidv4(),
    name: authUser.name,
    email: authUser.email,
    color: authUser.color,
    role: 'admin',
    createdAt: now,
    settings: authUser.settings,
    ownerId: authUser.id,
  };
  await db.users.add(userProfile);

  // Set the current user
  await db.settings.put({ key: 'currentUserId', value: userProfile.id });

  return { user: authUser, session };
}

// Sign in an existing user
export async function signIn(email: string, password: string): Promise<{ user: AuthUser; session: AuthSession }> {
  const authUser = await db.authUsers.where('email').equals(email.toLowerCase()).first();
  if (!authUser) {
    throw new Error('Invalid email or password');
  }

  const isValid = await verifyPassword(password, authUser.passwordHash);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Update last login
  await db.authUsers.update(authUser.id, { lastLoginAt: new Date() });

  // Create a session
  const session = await createSession(authUser.id);

  // Find the user profile for this auth user
  const userProfile = await db.users.where('ownerId').equals(authUser.id).first();
  if (userProfile) {
    await db.settings.put({ key: 'currentUserId', value: userProfile.id });
  }

  return { user: authUser, session };
}

// Sign out
export async function signOut(sessionToken?: string): Promise<void> {
  if (sessionToken) {
    await db.authSessions.where('token').equals(sessionToken).delete();
  }
  await db.settings.delete('currentAuthUserId');
  await db.settings.delete('currentSessionToken');
}

// Create a session
async function createSession(userId: string): Promise<AuthSession> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const session: AuthSession = {
    id: uuidv4(),
    userId,
    token: generateToken(),
    createdAt: now,
    expiresAt,
  };

  await db.authSessions.add(session);
  await db.settings.put({ key: 'currentAuthUserId', value: userId });
  await db.settings.put({ key: 'currentSessionToken', value: session.token });

  return session;
}

// Validate session
export async function validateSession(token: string): Promise<{ user: AuthUser; session: AuthSession } | null> {
  const session = await db.authSessions.where('token').equals(token).first();
  if (!session) return null;

  if (new Date(session.expiresAt) < new Date()) {
    // Session expired, delete it
    await db.authSessions.delete(session.id);
    return null;
  }

  const user = await db.authUsers.get(session.userId);
  if (!user) return null;

  return { user, session };
}

// Get current auth user from stored session
export async function getCurrentAuthUser(): Promise<AuthUser | null> {
  const tokenSetting = await db.settings.get('currentSessionToken');
  if (!tokenSetting?.value) return null;

  const result = await validateSession(tokenSetting.value as string);
  return result?.user ?? null;
}

// Update auth user settings
export async function updateAuthUserSettings(userId: string, settings: Partial<AuthUser['settings']>): Promise<void> {
  const authUser = await db.authUsers.get(userId);
  if (authUser) {
    await db.authUsers.update(userId, {
      settings: { ...authUser.settings, ...settings },
    });
  }
}

// Get auth user by ID
export async function getAuthUser(userId: string): Promise<AuthUser | null> {
  return await db.authUsers.get(userId) ?? null;
}

// Check if any auth users exist
export async function hasAuthUsers(): Promise<boolean> {
  const count = await db.authUsers.count();
  return count > 0;
}
