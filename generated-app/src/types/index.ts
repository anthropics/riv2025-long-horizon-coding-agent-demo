// Core data types for Canopy Project Management

export type IssueType = 'Epic' | 'Story' | 'Bug' | 'Task' | 'Sub-task';
export type Priority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
export type StatusCategory = 'todo' | 'in_progress' | 'done';
export type SprintStatus = 'future' | 'active' | 'completed';
export type UserRole = 'admin' | 'member' | 'viewer';
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'user';
export type ActivityAction =
  | 'created'
  | 'status_changed'
  | 'assigned'
  | 'priority_changed'
  | 'labels_changed'
  | 'sprint_changed'
  | 'epic_changed'
  | 'comment_added'
  | 'comment_edited'
  | 'comment_deleted'
  | 'description_changed'
  | 'summary_changed'
  | 'story_points_changed'
  | 'due_date_changed'
  | 'time_logged';

export interface Project {
  id: string;
  key: string;
  name: string;
  description?: string;
  leadUserId?: string;
  defaultAssigneeId?: string;
  issueCounter: number;
  createdAt: Date;
  updatedAt: Date;
  color: string;
  icon: string;
  isArchived: boolean;
  settings?: ProjectSettings;
}

export interface ProjectSettings {
  defaultIssueType?: IssueType;
  enabledIssueTypes?: IssueType[];
}

export interface Issue {
  id: string;
  projectId: string;
  key: string;
  type: IssueType;
  status: string;
  summary: string;
  description?: string;
  priority: Priority;
  reporterId: string;
  assigneeId?: string;
  epicId?: string;
  parentId?: string;
  sprintId?: string;
  storyPoints?: number;
  labels: string[];
  components: string[];
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  sortOrder: number;
  timeEstimate?: number;
  timeSpent?: number;
  customFields?: Record<string, unknown>;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal?: string;
  startDate?: Date;
  endDate?: Date;
  status: SprintStatus;
  createdAt: Date;
  completedAt?: Date;
  velocity?: number;
}

export interface BoardColumn {
  id: string;
  name: string;
  statusCategory: StatusCategory;
  sortOrder: number;
  wipLimit?: number;
  color?: string;
}

export interface Board {
  id: string;
  projectId: string;
  name: string;
  columns: BoardColumn[];
  filterQuery?: string;
  swimlaneBy?: 'none' | 'assignee' | 'epic' | 'priority';
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  color: string;
  role: UserRole;
  createdAt: Date;
  settings?: UserSettings;
}

export interface UserSettings {
  theme?: 'light' | 'dark' | 'system';
  defaultProjectId?: string;
  sidebarCollapsed?: boolean;
  issueDetailMode?: 'panel' | 'modal';
  dateFormat?: string;
}

export interface Label {
  id: string;
  projectId: string;
  name: string;
  color: string;
  description?: string;
}

export interface Component {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  leadUserId?: string;
}

export interface Comment {
  id: string;
  issueId: string;
  authorId: string;
  body: string;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
}

export interface ActivityLog {
  id: string;
  issueId: string;
  userId: string;
  action: ActivityAction;
  field?: string;
  fromValue?: string;
  toValue?: string;
  timestamp: Date;
}

export interface Filter {
  id: string;
  projectId?: string;
  name: string;
  query: string;
  ownerId: string;
  isShared: boolean;
  isFavorite: boolean;
  createdAt: Date;
}

export interface CustomField {
  id: string;
  projectId: string;
  name: string;
  type: CustomFieldType;
  options?: string[];
  isRequired: boolean;
  sortOrder: number;
}

export interface AppSettings {
  key: string;
  value: unknown;
}

// Helper types
export interface IssueWithRelations extends Issue {
  project?: Project;
  assignee?: User;
  reporter?: User;
  epic?: Issue;
  sprint?: Sprint;
  labelObjects?: Label[];
  componentObjects?: Component[];
  childIssues?: Issue[];
  subTasks?: Issue[];
  comments?: Comment[];
  activities?: ActivityLog[];
}

export interface SprintWithIssues extends Sprint {
  issues: Issue[];
  totalStoryPoints: number;
  completedStoryPoints: number;
}

export interface ProjectWithStats extends Project {
  issueCount: number;
  openIssueCount: number;
  activeSprintId?: string;
}
