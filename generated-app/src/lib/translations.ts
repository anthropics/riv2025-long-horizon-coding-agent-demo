import type { Language } from '@/types';

export interface Translations {
  // App-level
  appName: string;
  search: string;
  searchPlaceholder: string;
  create: string;
  cancel: string;
  save: string;
  delete: string;
  edit: string;
  close: string;
  loading: string;
  noResults: string;

  // Navigation/Sidebar
  planning: string;
  roadmap: string;
  backlog: string;
  activeSprints: string;
  sprints: string;
  board: string;
  reports: string;
  burndownChart: string;
  velocityChart: string;
  sprintReport: string;
  project: string;
  projectSettings: string;
  components: string;
  labels: string;
  workflows: string;
  calendar: string;
  epics: string;

  // Settings Page
  settings: string;
  settingsDescription: string;
  profile: string;
  profileDescription: string;
  name: string;
  email: string;
  saveProfile: string;
  appearance: string;
  appearanceDescription: string;
  mode: string;
  light: string;
  dark: string;
  system: string;
  colorTheme: string;
  language: string;
  languageDescription: string;
  defaultProject: string;
  defaultProjectDescription: string;
  noDefaultProject: string;
  dataManagement: string;
  dataManagementDescription: string;
  exportData: string;
  importData: string;
  exporting: string;
  importing: string;
  exportDescription: string;
  dangerZone: string;
  dangerZoneDescription: string;
  clearAllData: string;
  deleteEverything: string;
  deleteConfirmTitle: string;
  deleteConfirmDescription: string;
  keyboardShortcuts: string;
  keyboardShortcutsDescription: string;
  openSearch: string;
  createIssue: string;
  goToBoard: string;
  goToBacklog: string;
  goToSprints: string;
  goToSettings: string;
  aboutCanopy: string;
  aboutDescription: string;
  version: string;

  // Projects
  projects: string;
  createProject: string;
  newProject: string;
  projectName: string;
  projectKey: string;
  projectDescription: string;
  createYourFirstProject: string;
  welcomeMessage: string;
  noProjectsMessage: string;

  // Issues
  issues: string;
  issue: string;
  summary: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  assignee: string;
  reporter: string;
  storyPoints: string;
  dueDate: string;
  epic: string;
  sprint: string;
  labelsField: string;
  componentsField: string;
  subtasks: string;
  addSubtask: string;
  comments: string;
  addComment: string;
  activity: string;
  attachments: string;

  // Issue Types
  story: string;
  bug: string;
  task: string;
  epicType: string;
  subtask: string;

  // Priority
  highest: string;
  high: string;
  medium: string;
  low: string;
  lowest: string;

  // Status
  toDo: string;
  inProgress: string;
  inReview: string;
  done: string;

  // Board
  boardView: string;
  emptyBoard: string;
  emptyBoardDescription: string;
  quickFilter: string;
  filterByAssignee: string;
  filterByType: string;

  // Backlog
  backlogView: string;
  emptyBacklog: string;
  dragToOrder: string;
  totalPoints: string;
  issuesCount: string;

  // Sprints
  createSprint: string;
  startSprint: string;
  completeSprint: string;
  sprintName: string;
  sprintGoal: string;
  startDate: string;
  endDate: string;
  futureSprint: string;
  activeSprint: string;
  completedSprint: string;
  noSprints: string;

  // Epics
  epicsView: string;
  totalEpics: string;
  open: string;
  createEpic: string;
  noEpics: string;
  createYourFirstEpic: string;
  issueHierarchy: string;
  childIssues: string;
  progress: string;
  expandAll: string;
  collapseAll: string;

  // Reports
  burndown: string;
  velocity: string;
  idealLine: string;
  remainingPoints: string;
  completedPoints: string;
  averageVelocity: string;
  sprintStats: string;

  // Calendar
  calendarView: string;
  today: string;
  thisMonth: string;
  previousMonth: string;
  nextMonth: string;

  // Roadmap
  roadmapView: string;
  timeline: string;
  quarters: string;
  months: string;
  weeks: string;

  // Components
  componentsView: string;
  createComponent: string;
  noComponents: string;
  componentName: string;
  componentDescription: string;
  componentLead: string;

  // Labels
  labelsView: string;
  createLabel: string;
  noLabels: string;
  labelName: string;
  labelColor: string;
  labelDescription: string;

  // Workflows
  workflowsView: string;
  createWorkflow: string;
  noWorkflows: string;
  workflowName: string;
  workflowDescription: string;
  workflowStatuses: string;
  defaultWorkflow: string;

  // Search
  globalSearch: string;
  searchIssues: string;
  searchProjects: string;
  recentSearches: string;
  searchResults: string;

  // Notifications
  successCreated: string;
  successUpdated: string;
  successDeleted: string;
  errorOccurred: string;
  profileUpdated: string;
  dataExported: string;
  dataImported: string;
  importError: string;

  // About
  about: string;
  aboutUs: string;
  featureOverview: string;
  contribution: string;
}

const translations: Record<Language, Translations> = {
  en: {
    // App-level
    appName: 'Canopy',
    search: 'Search',
    searchPlaceholder: 'Search issues, projects...',
    create: 'Create',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    loading: 'Loading...',
    noResults: 'No results found',

    // Navigation/Sidebar
    planning: 'Planning',
    roadmap: 'Roadmap',
    backlog: 'Backlog',
    activeSprints: 'Active Sprints',
    sprints: 'Sprints',
    board: 'Board',
    reports: 'Reports',
    burndownChart: 'Burndown Chart',
    velocityChart: 'Velocity Chart',
    sprintReport: 'Sprint Report',
    project: 'Project',
    projectSettings: 'Project Settings',
    components: 'Components',
    labels: 'Labels',
    workflows: 'Workflows',
    calendar: 'Calendar',
    epics: 'Epics',

    // Settings Page
    settings: 'Settings',
    settingsDescription: 'Manage your preferences and application settings',
    profile: 'Profile',
    profileDescription: 'Update your personal information',
    name: 'Name',
    email: 'Email',
    saveProfile: 'Save Profile',
    appearance: 'Appearance',
    appearanceDescription: 'Customize how Canopy looks',
    mode: 'Mode',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    colorTheme: 'Color Theme',
    language: 'Language',
    languageDescription: 'Choose your preferred language',
    defaultProject: 'Default Project',
    defaultProjectDescription: 'Choose which project opens by default',
    noDefaultProject: 'No default project',
    dataManagement: 'Data Management',
    dataManagementDescription: 'Export, import, or clear your data',
    exportData: 'Export Data',
    importData: 'Import Data',
    exporting: 'Exporting...',
    importing: 'Importing...',
    exportDescription: 'Export your data as JSON for backup or transfer. Import previously exported data to restore.',
    dangerZone: 'Danger Zone',
    dangerZoneDescription: 'Irreversible actions that affect all your data',
    clearAllData: 'Clear All Data',
    deleteEverything: 'Delete Everything',
    deleteConfirmTitle: 'Are you absolutely sure?',
    deleteConfirmDescription: 'This will permanently delete all your projects, issues, sprints, and settings. This action cannot be undone. Consider exporting your data first.',
    keyboardShortcuts: 'Keyboard Shortcuts',
    keyboardShortcutsDescription: 'Quick actions for power users',
    openSearch: 'Open search',
    createIssue: 'Create issue',
    goToBoard: 'Go to board',
    goToBacklog: 'Go to backlog',
    goToSprints: 'Go to sprints',
    goToSettings: 'Go to settings',
    aboutCanopy: 'About Canopy',
    aboutDescription: 'Canopy is a forest-inspired project management tool built for teams who value simplicity and focus.',
    version: 'Version 1.0.0 • All data stored locally in your browser',

    // Projects
    projects: 'Projects',
    createProject: 'Create Project',
    newProject: 'New Project',
    projectName: 'Project Name',
    projectKey: 'Project Key',
    projectDescription: 'Project Description',
    createYourFirstProject: 'Create your first project',
    welcomeMessage: 'Welcome to Canopy',
    noProjectsMessage: 'Get started by creating your first project',

    // Issues
    issues: 'Issues',
    issue: 'Issue',
    summary: 'Summary',
    description: 'Description',
    type: 'Type',
    priority: 'Priority',
    status: 'Status',
    assignee: 'Assignee',
    reporter: 'Reporter',
    storyPoints: 'Story Points',
    dueDate: 'Due Date',
    epic: 'Epic',
    sprint: 'Sprint',
    labelsField: 'Labels',
    componentsField: 'Components',
    subtasks: 'Sub-tasks',
    addSubtask: 'Add sub-task',
    comments: 'Comments',
    addComment: 'Add a comment...',
    activity: 'Activity',
    attachments: 'Attachments',

    // Issue Types
    story: 'Story',
    bug: 'Bug',
    task: 'Task',
    epicType: 'Epic',
    subtask: 'Sub-task',

    // Priority
    highest: 'Highest',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    lowest: 'Lowest',

    // Status
    toDo: 'To Do',
    inProgress: 'In Progress',
    inReview: 'In Review',
    done: 'Done',

    // Board
    boardView: 'Board',
    emptyBoard: 'Your board is empty',
    emptyBoardDescription: 'Create your first issue to get started',
    quickFilter: 'Quick Filter',
    filterByAssignee: 'Filter by assignee',
    filterByType: 'Filter by type',

    // Backlog
    backlogView: 'Backlog',
    emptyBacklog: 'Your backlog is empty',
    dragToOrder: 'Drag to reorder items',
    totalPoints: 'Total Points',
    issuesCount: 'Issues',

    // Sprints
    createSprint: 'Create Sprint',
    startSprint: 'Start Sprint',
    completeSprint: 'Complete Sprint',
    sprintName: 'Sprint Name',
    sprintGoal: 'Sprint Goal',
    startDate: 'Start Date',
    endDate: 'End Date',
    futureSprint: 'Future',
    activeSprint: 'Active',
    completedSprint: 'Completed',
    noSprints: 'No sprints yet',

    // Epics
    epicsView: 'Epics',
    totalEpics: 'Total Epics',
    open: 'Open',
    createEpic: 'Create Epic',
    noEpics: 'No epics yet',
    createYourFirstEpic: 'Create your first Epic',
    issueHierarchy: 'Issue Hierarchy',
    childIssues: 'Child Issues',
    progress: 'Progress',
    expandAll: 'Expand All',
    collapseAll: 'Collapse All',

    // Reports
    burndown: 'Burndown',
    velocity: 'Velocity',
    idealLine: 'Ideal Line',
    remainingPoints: 'Remaining Points',
    completedPoints: 'Completed Points',
    averageVelocity: 'Average Velocity',
    sprintStats: 'Sprint Statistics',

    // Calendar
    calendarView: 'Calendar',
    today: 'Today',
    thisMonth: 'This Month',
    previousMonth: 'Previous Month',
    nextMonth: 'Next Month',

    // Roadmap
    roadmapView: 'Roadmap',
    timeline: 'Timeline',
    quarters: 'Quarters',
    months: 'Months',
    weeks: 'Weeks',

    // Components
    componentsView: 'Components',
    createComponent: 'Create Component',
    noComponents: 'No components yet',
    componentName: 'Component Name',
    componentDescription: 'Component Description',
    componentLead: 'Component Lead',

    // Labels
    labelsView: 'Labels',
    createLabel: 'Create Label',
    noLabels: 'No labels yet',
    labelName: 'Label Name',
    labelColor: 'Label Color',
    labelDescription: 'Label Description',

    // Workflows
    workflowsView: 'Workflows',
    createWorkflow: 'Create Workflow',
    noWorkflows: 'No workflows yet',
    workflowName: 'Workflow Name',
    workflowDescription: 'Workflow Description',
    workflowStatuses: 'Workflow Statuses',
    defaultWorkflow: 'Default Workflow',

    // Search
    globalSearch: 'Global Search',
    searchIssues: 'Search issues',
    searchProjects: 'Search projects',
    recentSearches: 'Recent Searches',
    searchResults: 'Search Results',

    // Notifications
    successCreated: 'Successfully created',
    successUpdated: 'Successfully updated',
    successDeleted: 'Successfully deleted',
    errorOccurred: 'An error occurred',
    profileUpdated: 'Profile updated',
    dataExported: 'Data exported successfully',
    dataImported: 'Data imported successfully',
    importError: 'Failed to import data. Please check the file format.',

    // About
    about: 'About',
    aboutUs: 'About Us',
    featureOverview: 'Feature Overview',
    contribution: 'Contribution',
  },

  ja: {
    // App-level
    appName: 'キャノピー',
    search: '検索',
    searchPlaceholder: '課題、プロジェクトを検索...',
    create: '作成',
    cancel: 'キャンセル',
    save: '保存',
    delete: '削除',
    edit: '編集',
    close: '閉じる',
    loading: '読み込み中...',
    noResults: '結果が見つかりません',

    // Navigation/Sidebar
    planning: 'プランニング',
    roadmap: 'ロードマップ',
    backlog: 'バックログ',
    activeSprints: 'アクティブスプリント',
    sprints: 'スプリント',
    board: 'ボード',
    reports: 'レポート',
    burndownChart: 'バーンダウンチャート',
    velocityChart: 'ベロシティチャート',
    sprintReport: 'スプリントレポート',
    project: 'プロジェクト',
    projectSettings: 'プロジェクト設定',
    components: 'コンポーネント',
    labels: 'ラベル',
    workflows: 'ワークフロー',
    calendar: 'カレンダー',
    epics: 'エピック',

    // Settings Page
    settings: '設定',
    settingsDescription: '設定とアプリケーション設定を管理',
    profile: 'プロフィール',
    profileDescription: '個人情報を更新',
    name: '名前',
    email: 'メールアドレス',
    saveProfile: 'プロフィールを保存',
    appearance: '外観',
    appearanceDescription: 'Canopyの外観をカスタマイズ',
    mode: 'モード',
    light: 'ライト',
    dark: 'ダーク',
    system: 'システム',
    colorTheme: 'カラーテーマ',
    language: '言語',
    languageDescription: '希望の言語を選択',
    defaultProject: 'デフォルトプロジェクト',
    defaultProjectDescription: 'デフォルトで開くプロジェクトを選択',
    noDefaultProject: 'デフォルトプロジェクトなし',
    dataManagement: 'データ管理',
    dataManagementDescription: 'データのエクスポート、インポート、クリア',
    exportData: 'データをエクスポート',
    importData: 'データをインポート',
    exporting: 'エクスポート中...',
    importing: 'インポート中...',
    exportDescription: 'データをJSONでエクスポートしてバックアップまたは転送。以前エクスポートしたデータをインポートして復元。',
    dangerZone: '危険ゾーン',
    dangerZoneDescription: 'すべてのデータに影響する不可逆なアクション',
    clearAllData: 'すべてのデータを削除',
    deleteEverything: 'すべてを削除',
    deleteConfirmTitle: '本当によろしいですか？',
    deleteConfirmDescription: 'これにより、すべてのプロジェクト、課題、スプリント、設定が完全に削除されます。この操作は元に戻せません。先にデータをエクスポートすることをお勧めします。',
    keyboardShortcuts: 'キーボードショートカット',
    keyboardShortcutsDescription: 'パワーユーザー向けクイックアクション',
    openSearch: '検索を開く',
    createIssue: '課題を作成',
    goToBoard: 'ボードへ移動',
    goToBacklog: 'バックログへ移動',
    goToSprints: 'スプリントへ移動',
    goToSettings: '設定へ移動',
    aboutCanopy: 'Canopyについて',
    aboutDescription: 'Canopyは、シンプルさと集中を大切にするチームのために作られた、森をテーマにしたプロジェクト管理ツールです。',
    version: 'バージョン 1.0.0 • すべてのデータはブラウザにローカル保存',

    // Projects
    projects: 'プロジェクト',
    createProject: 'プロジェクトを作成',
    newProject: '新規プロジェクト',
    projectName: 'プロジェクト名',
    projectKey: 'プロジェクトキー',
    projectDescription: 'プロジェクトの説明',
    createYourFirstProject: '最初のプロジェクトを作成',
    welcomeMessage: 'Canopyへようこそ',
    noProjectsMessage: '最初のプロジェクトを作成して始めましょう',

    // Issues
    issues: '課題',
    issue: '課題',
    summary: '概要',
    description: '説明',
    type: 'タイプ',
    priority: '優先度',
    status: 'ステータス',
    assignee: '担当者',
    reporter: '報告者',
    storyPoints: 'ストーリーポイント',
    dueDate: '期日',
    epic: 'エピック',
    sprint: 'スプリント',
    labelsField: 'ラベル',
    componentsField: 'コンポーネント',
    subtasks: 'サブタスク',
    addSubtask: 'サブタスクを追加',
    comments: 'コメント',
    addComment: 'コメントを追加...',
    activity: 'アクティビティ',
    attachments: '添付ファイル',

    // Issue Types
    story: 'ストーリー',
    bug: 'バグ',
    task: 'タスク',
    epicType: 'エピック',
    subtask: 'サブタスク',

    // Priority
    highest: '最高',
    high: '高',
    medium: '中',
    low: '低',
    lowest: '最低',

    // Status
    toDo: '未着手',
    inProgress: '進行中',
    inReview: 'レビュー中',
    done: '完了',

    // Board
    boardView: 'ボード',
    emptyBoard: 'ボードは空です',
    emptyBoardDescription: '最初の課題を作成して始めましょう',
    quickFilter: 'クイックフィルター',
    filterByAssignee: '担当者でフィルター',
    filterByType: 'タイプでフィルター',

    // Backlog
    backlogView: 'バックログ',
    emptyBacklog: 'バックログは空です',
    dragToOrder: 'ドラッグして並べ替え',
    totalPoints: '合計ポイント',
    issuesCount: '課題',

    // Sprints
    createSprint: 'スプリントを作成',
    startSprint: 'スプリントを開始',
    completeSprint: 'スプリントを完了',
    sprintName: 'スプリント名',
    sprintGoal: 'スプリントゴール',
    startDate: '開始日',
    endDate: '終了日',
    futureSprint: '予定',
    activeSprint: 'アクティブ',
    completedSprint: '完了',
    noSprints: 'スプリントがありません',

    // Epics
    epicsView: 'エピック',
    totalEpics: '合計エピック数',
    open: 'オープン',
    createEpic: 'エピックを作成',
    noEpics: 'エピックがありません',
    createYourFirstEpic: '最初のエピックを作成',
    issueHierarchy: '課題階層',
    childIssues: '子課題',
    progress: '進捗',
    expandAll: 'すべて展開',
    collapseAll: 'すべて折りたたむ',

    // Reports
    burndown: 'バーンダウン',
    velocity: 'ベロシティ',
    idealLine: '理想線',
    remainingPoints: '残りポイント',
    completedPoints: '完了ポイント',
    averageVelocity: '平均ベロシティ',
    sprintStats: 'スプリント統計',

    // Calendar
    calendarView: 'カレンダー',
    today: '今日',
    thisMonth: '今月',
    previousMonth: '前月',
    nextMonth: '翌月',

    // Roadmap
    roadmapView: 'ロードマップ',
    timeline: 'タイムライン',
    quarters: '四半期',
    months: '月',
    weeks: '週',

    // Components
    componentsView: 'コンポーネント',
    createComponent: 'コンポーネントを作成',
    noComponents: 'コンポーネントがありません',
    componentName: 'コンポーネント名',
    componentDescription: 'コンポーネントの説明',
    componentLead: 'コンポーネントリード',

    // Labels
    labelsView: 'ラベル',
    createLabel: 'ラベルを作成',
    noLabels: 'ラベルがありません',
    labelName: 'ラベル名',
    labelColor: 'ラベルカラー',
    labelDescription: 'ラベルの説明',

    // Workflows
    workflowsView: 'ワークフロー',
    createWorkflow: 'ワークフローを作成',
    noWorkflows: 'ワークフローがありません',
    workflowName: 'ワークフロー名',
    workflowDescription: 'ワークフローの説明',
    workflowStatuses: 'ワークフローステータス',
    defaultWorkflow: 'デフォルトワークフロー',

    // Search
    globalSearch: 'グローバル検索',
    searchIssues: '課題を検索',
    searchProjects: 'プロジェクトを検索',
    recentSearches: '最近の検索',
    searchResults: '検索結果',

    // Notifications
    successCreated: '正常に作成されました',
    successUpdated: '正常に更新されました',
    successDeleted: '正常に削除されました',
    errorOccurred: 'エラーが発生しました',
    profileUpdated: 'プロフィールを更新しました',
    dataExported: 'データのエクスポートに成功しました',
    dataImported: 'データのインポートに成功しました',
    importError: 'データのインポートに失敗しました。ファイル形式を確認してください。',

    // About
    about: '情報',
    aboutUs: '私たちについて',
    featureOverview: '機能概要',
    contribution: '貢献',
  },
};

export function getTranslations(language: Language = 'en'): Translations {
  return translations[language] || translations.en;
}

export function t(key: keyof Translations, language: Language = 'en'): string {
  const trans = translations[language] || translations.en;
  return trans[key] || key;
}
