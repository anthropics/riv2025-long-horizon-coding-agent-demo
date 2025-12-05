// Core data types for Canopy Project Management

export type IssueType = 'Epic' | 'Story' | 'Bug' | 'Task' | 'Sub-task';
export type Priority = 'Highest' | 'High' | 'Medium' | 'Low' | 'Lowest';
export type StatusCategory = 'todo' | 'in_progress' | 'done';
export type SprintStatus = 'future' | 'active' | 'completed';
export type UserRole = 'admin' | 'member' | 'viewer';
export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'user';

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  color: string;
  createdAt: Date;
  lastLoginAt?: Date;
  settings?: UserSettings;
}

export interface AuthSession {
  id: string;
  userId: string;
  token: string;
  createdAt: Date;
  expiresAt: Date;
}
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
  workflowId?: string;
  ownerId?: string; // The auth user who owns this project
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
  ownerId?: string; // The auth user who owns this user profile
}

export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorTheme = 'ruby' | 'ocean' | 'forest' | 'sunset' | 'lavender' | 'cyberpunk' | 'retro' | 'aws';
export type Language = 'en' | 'ja' | 'ar' | 'zh' | 'es';

export interface UserSettings {
  theme?: ThemeMode;
  colorTheme?: ColorTheme;
  language?: Language;
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

// Workflow types
export interface WorkflowStatus {
  id: string;
  name: string;
  statusCategory: StatusCategory;
  sortOrder: number;
  color?: string;
}

export interface WorkflowTransition {
  fromStatusId: string;
  toStatusId: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  statuses: WorkflowStatus[];
  transitions: WorkflowTransition[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
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

// Team Member type for capacity planning
export interface TeamMember {
  id: string;
  projectId: string;
  userId: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  color: string;
  availableWeeks: number; // Number of weeks the team member is available
  hoursPerWeek?: number; // Hours available per week (default: 40)
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMemberWithStats extends TeamMember {
  assignedIssueCount: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
}

// Custom Emoji types
export type EmojiShape = 'circle' | 'square' | 'rounded-square' | 'heart' | 'star';
export type EmojiExpression = 'happy' | 'sad' | 'angry' | 'surprised' | 'cool' | 'love' | 'wink' | 'thinking' | 'neutral' | 'excited';
export type EmojiAccessory = 'none' | 'glasses' | 'sunglasses' | 'hat' | 'crown' | 'bow' | 'headphones' | 'mustache';

export interface CustomEmoji {
  id: string;
  name: string;
  shape: EmojiShape;
  expression: EmojiExpression;
  accessory: EmojiAccessory;
  faceColor: string;
  accentColor: string;
  svgData: string; // The generated SVG string
  createdAt: Date;
  updatedAt: Date;
  ownerId?: string; // The auth user who created this emoji
}
