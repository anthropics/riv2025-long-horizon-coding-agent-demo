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
  team: string;

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

  // Admin Dashboard
  adminDashboard: string;
  adminDashboardDescription: string;
  databaseTables: string;
  recordInspector: string;
  totalRecords: string;
  noRecords: string;
  selectRecordToInspect: string;
  exportTable: string;
  refresh: string;
  refreshing: string;
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
    team: 'Team',

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

    // Admin Dashboard
    adminDashboard: 'Admin Dashboard',
    adminDashboardDescription: 'IndexedDB Data Inspector',
    databaseTables: 'Database Tables',
    recordInspector: 'Record Inspector',
    totalRecords: 'Total Records',
    noRecords: 'No records in this table',
    selectRecordToInspect: 'Select a record to inspect',
    exportTable: 'Export table data',
    refresh: 'Refresh',
    refreshing: 'Refreshing...',
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
    team: 'チーム',

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

    // Admin Dashboard
    adminDashboard: '管理ダッシュボード',
    adminDashboardDescription: 'IndexedDB データインスペクター',
    databaseTables: 'データベーステーブル',
    recordInspector: 'レコードインスペクター',
    totalRecords: '総レコード数',
    noRecords: 'このテーブルにはレコードがありません',
    selectRecordToInspect: '検査するレコードを選択',
    exportTable: 'テーブルデータをエクスポート',
    refresh: '更新',
    refreshing: '更新中...',
  },

  zh: {
    // App-level
    appName: '树冠',
    search: '搜索',
    searchPlaceholder: '搜索问题、项目...',
    create: '创建',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    close: '关闭',
    loading: '加载中...',
    noResults: '未找到结果',

    // Navigation/Sidebar
    planning: '规划',
    roadmap: '路线图',
    backlog: '待办事项',
    activeSprints: '活动冲刺',
    sprints: '冲刺',
    board: '看板',
    reports: '报告',
    burndownChart: '燃尽图',
    velocityChart: '速度图',
    sprintReport: '冲刺报告',
    project: '项目',
    projectSettings: '项目设置',
    components: '组件',
    labels: '标签',
    workflows: '工作流',
    calendar: '日历',
    epics: '史诗',
    team: '团队',

    // Settings Page
    settings: '设置',
    settingsDescription: '管理您的偏好和应用设置',
    profile: '个人资料',
    profileDescription: '更新您的个人信息',
    name: '姓名',
    email: '电子邮件',
    saveProfile: '保存个人资料',
    appearance: '外观',
    appearanceDescription: '自定义树冠的外观',
    mode: '模式',
    light: '浅色',
    dark: '深色',
    system: '系统',
    colorTheme: '颜色主题',
    language: '语言',
    languageDescription: '选择您喜欢的语言',
    defaultProject: '默认项目',
    defaultProjectDescription: '选择默认打开的项目',
    noDefaultProject: '无默认项目',
    dataManagement: '数据管理',
    dataManagementDescription: '导出、导入或清除您的数据',
    exportData: '导出数据',
    importData: '导入数据',
    exporting: '导出中...',
    importing: '导入中...',
    exportDescription: '将数据导出为JSON进行备份或转移。导入之前导出的数据以恢复。',
    dangerZone: '危险区域',
    dangerZoneDescription: '影响所有数据的不可逆操作',
    clearAllData: '清除所有数据',
    deleteEverything: '删除所有内容',
    deleteConfirmTitle: '您确定吗？',
    deleteConfirmDescription: '这将永久删除所有项目、问题、冲刺和设置。此操作无法撤销。请先考虑导出数据。',
    keyboardShortcuts: '键盘快捷键',
    keyboardShortcutsDescription: '高级用户的快速操作',
    openSearch: '打开搜索',
    createIssue: '创建问题',
    goToBoard: '转到看板',
    goToBacklog: '转到待办事项',
    goToSprints: '转到冲刺',
    goToSettings: '转到设置',
    aboutCanopy: '关于树冠',
    aboutDescription: '树冠是一款以森林为灵感的项目管理工具，专为重视简洁和专注的团队打造。',
    version: '版本 1.0.0 • 所有数据存储在浏览器本地',

    // Projects
    projects: '项目',
    createProject: '创建项目',
    newProject: '新项目',
    projectName: '项目名称',
    projectKey: '项目标识',
    projectDescription: '项目描述',
    createYourFirstProject: '创建您的第一个项目',
    welcomeMessage: '欢迎来到树冠',
    noProjectsMessage: '创建您的第一个项目开始吧',

    // Issues
    issues: '问题',
    issue: '问题',
    summary: '摘要',
    description: '描述',
    type: '类型',
    priority: '优先级',
    status: '状态',
    assignee: '经办人',
    reporter: '报告人',
    storyPoints: '故事点数',
    dueDate: '截止日期',
    epic: '史诗',
    sprint: '冲刺',
    labelsField: '标签',
    componentsField: '组件',
    subtasks: '子任务',
    addSubtask: '添加子任务',
    comments: '评论',
    addComment: '添加评论...',
    activity: '活动',
    attachments: '附件',

    // Issue Types
    story: '故事',
    bug: '缺陷',
    task: '任务',
    epicType: '史诗',
    subtask: '子任务',

    // Priority
    highest: '最高',
    high: '高',
    medium: '中',
    low: '低',
    lowest: '最低',

    // Status
    toDo: '待办',
    inProgress: '进行中',
    inReview: '审核中',
    done: '完成',

    // Board
    boardView: '看板',
    emptyBoard: '看板为空',
    emptyBoardDescription: '创建第一个问题开始',
    quickFilter: '快速筛选',
    filterByAssignee: '按经办人筛选',
    filterByType: '按类型筛选',

    // Backlog
    backlogView: '待办事项',
    emptyBacklog: '待办事项为空',
    dragToOrder: '拖动以重新排序',
    totalPoints: '总点数',
    issuesCount: '问题数',

    // Sprints
    createSprint: '创建冲刺',
    startSprint: '开始冲刺',
    completeSprint: '完成冲刺',
    sprintName: '冲刺名称',
    sprintGoal: '冲刺目标',
    startDate: '开始日期',
    endDate: '结束日期',
    futureSprint: '未来',
    activeSprint: '活动',
    completedSprint: '已完成',
    noSprints: '暂无冲刺',

    // Epics
    epicsView: '史诗',
    totalEpics: '史诗总数',
    open: '开放',
    createEpic: '创建史诗',
    noEpics: '暂无史诗',
    createYourFirstEpic: '创建您的第一个史诗',
    issueHierarchy: '问题层级',
    childIssues: '子问题',
    progress: '进度',
    expandAll: '全部展开',
    collapseAll: '全部折叠',

    // Reports
    burndown: '燃尽',
    velocity: '速度',
    idealLine: '理想线',
    remainingPoints: '剩余点数',
    completedPoints: '完成点数',
    averageVelocity: '平均速度',
    sprintStats: '冲刺统计',

    // Calendar
    calendarView: '日历',
    today: '今天',
    thisMonth: '本月',
    previousMonth: '上月',
    nextMonth: '下月',

    // Roadmap
    roadmapView: '路线图',
    timeline: '时间线',
    quarters: '季度',
    months: '月',
    weeks: '周',

    // Components
    componentsView: '组件',
    createComponent: '创建组件',
    noComponents: '暂无组件',
    componentName: '组件名称',
    componentDescription: '组件描述',
    componentLead: '组件负责人',

    // Labels
    labelsView: '标签',
    createLabel: '创建标签',
    noLabels: '暂无标签',
    labelName: '标签名称',
    labelColor: '标签颜色',
    labelDescription: '标签描述',

    // Workflows
    workflowsView: '工作流',
    createWorkflow: '创建工作流',
    noWorkflows: '暂无工作流',
    workflowName: '工作流名称',
    workflowDescription: '工作流描述',
    workflowStatuses: '工作流状态',
    defaultWorkflow: '默认工作流',

    // Search
    globalSearch: '全局搜索',
    searchIssues: '搜索问题',
    searchProjects: '搜索项目',
    recentSearches: '最近搜索',
    searchResults: '搜索结果',

    // Notifications
    successCreated: '创建成功',
    successUpdated: '更新成功',
    successDeleted: '删除成功',
    errorOccurred: '发生错误',
    profileUpdated: '个人资料已更新',
    dataExported: '数据导出成功',
    dataImported: '数据导入成功',
    importError: '数据导入失败，请检查文件格式。',

    // About
    about: '关于',
    aboutUs: '关于我们',
    featureOverview: '功能概览',
    contribution: '贡献',

    // Admin Dashboard
    adminDashboard: '管理仪表板',
    adminDashboardDescription: 'IndexedDB 数据检查器',
    databaseTables: '数据库表',
    recordInspector: '记录检查器',
    totalRecords: '总记录数',
    noRecords: '此表无记录',
    selectRecordToInspect: '选择要检查的记录',
    exportTable: '导出表数据',
    refresh: '刷新',
    refreshing: '刷新中...',
  },

  ar: {
    // App-level
    appName: 'كانوبي',
    search: 'بحث',
    searchPlaceholder: 'البحث في المهام، المشاريع...',
    create: 'إنشاء',
    cancel: 'إلغاء',
    save: 'حفظ',
    delete: 'حذف',
    edit: 'تعديل',
    close: 'إغلاق',
    loading: 'جار التحميل...',
    noResults: 'لا توجد نتائج',

    // Navigation/Sidebar
    planning: 'التخطيط',
    roadmap: 'خارطة الطريق',
    backlog: 'قائمة المهام',
    activeSprints: 'السباقات النشطة',
    sprints: 'السباقات',
    board: 'اللوحة',
    reports: 'التقارير',
    burndownChart: 'مخطط الإنجاز',
    velocityChart: 'مخطط السرعة',
    sprintReport: 'تقرير السباق',
    project: 'المشروع',
    projectSettings: 'إعدادات المشروع',
    components: 'المكونات',
    labels: 'التسميات',
    workflows: 'سير العمل',
    calendar: 'التقويم',
    epics: 'الملاحم',
    team: 'الفريق',

    // Settings Page
    settings: 'الإعدادات',
    settingsDescription: 'إدارة تفضيلاتك وإعدادات التطبيق',
    profile: 'الملف الشخصي',
    profileDescription: 'تحديث معلوماتك الشخصية',
    name: 'الاسم',
    email: 'البريد الإلكتروني',
    saveProfile: 'حفظ الملف الشخصي',
    appearance: 'المظهر',
    appearanceDescription: 'تخصيص مظهر كانوبي',
    mode: 'الوضع',
    light: 'فاتح',
    dark: 'داكن',
    system: 'النظام',
    colorTheme: 'سمة اللون',
    language: 'اللغة',
    languageDescription: 'اختر لغتك المفضلة',
    defaultProject: 'المشروع الافتراضي',
    defaultProjectDescription: 'اختر المشروع الذي يفتح افتراضياً',
    noDefaultProject: 'لا يوجد مشروع افتراضي',
    dataManagement: 'إدارة البيانات',
    dataManagementDescription: 'تصدير، استيراد، أو مسح بياناتك',
    exportData: 'تصدير البيانات',
    importData: 'استيراد البيانات',
    exporting: 'جار التصدير...',
    importing: 'جار الاستيراد...',
    exportDescription: 'تصدير بياناتك بصيغة JSON للنسخ الاحتياطي أو النقل. استيراد البيانات المصدرة سابقاً للاستعادة.',
    dangerZone: 'منطقة الخطر',
    dangerZoneDescription: 'إجراءات لا رجعة فيها تؤثر على جميع بياناتك',
    clearAllData: 'مسح جميع البيانات',
    deleteEverything: 'حذف كل شيء',
    deleteConfirmTitle: 'هل أنت متأكد تماماً؟',
    deleteConfirmDescription: 'سيؤدي هذا إلى حذف جميع مشاريعك ومهامك وسباقاتك وإعداداتك نهائياً. لا يمكن التراجع عن هذا الإجراء. فكر في تصدير بياناتك أولاً.',
    keyboardShortcuts: 'اختصارات لوحة المفاتيح',
    keyboardShortcutsDescription: 'إجراءات سريعة للمستخدمين المتقدمين',
    openSearch: 'فتح البحث',
    createIssue: 'إنشاء مهمة',
    goToBoard: 'الذهاب إلى اللوحة',
    goToBacklog: 'الذهاب إلى قائمة المهام',
    goToSprints: 'الذهاب إلى السباقات',
    goToSettings: 'الذهاب إلى الإعدادات',
    aboutCanopy: 'حول كانوبي',
    aboutDescription: 'كانوبي هي أداة إدارة مشاريع مستوحاة من الغابة، مصممة للفرق التي تقدر البساطة والتركيز.',
    version: 'الإصدار 1.0.0 • جميع البيانات مخزنة محلياً في متصفحك',

    // Projects
    projects: 'المشاريع',
    createProject: 'إنشاء مشروع',
    newProject: 'مشروع جديد',
    projectName: 'اسم المشروع',
    projectKey: 'مفتاح المشروع',
    projectDescription: 'وصف المشروع',
    createYourFirstProject: 'أنشئ مشروعك الأول',
    welcomeMessage: 'مرحباً بك في كانوبي',
    noProjectsMessage: 'ابدأ بإنشاء مشروعك الأول',

    // Issues
    issues: 'المهام',
    issue: 'مهمة',
    summary: 'الملخص',
    description: 'الوصف',
    type: 'النوع',
    priority: 'الأولوية',
    status: 'الحالة',
    assignee: 'المسؤول',
    reporter: 'المُبلغ',
    storyPoints: 'نقاط القصة',
    dueDate: 'تاريخ الاستحقاق',
    epic: 'ملحمة',
    sprint: 'سباق',
    labelsField: 'التسميات',
    componentsField: 'المكونات',
    subtasks: 'المهام الفرعية',
    addSubtask: 'إضافة مهمة فرعية',
    comments: 'التعليقات',
    addComment: 'أضف تعليقاً...',
    activity: 'النشاط',
    attachments: 'المرفقات',

    // Issue Types
    story: 'قصة',
    bug: 'خلل',
    task: 'مهمة',
    epicType: 'ملحمة',
    subtask: 'مهمة فرعية',

    // Priority
    highest: 'الأعلى',
    high: 'عالي',
    medium: 'متوسط',
    low: 'منخفض',
    lowest: 'الأدنى',

    // Status
    toDo: 'قيد الانتظار',
    inProgress: 'قيد التنفيذ',
    inReview: 'قيد المراجعة',
    done: 'مكتمل',

    // Board
    boardView: 'اللوحة',
    emptyBoard: 'اللوحة فارغة',
    emptyBoardDescription: 'أنشئ مهمتك الأولى للبدء',
    quickFilter: 'فلتر سريع',
    filterByAssignee: 'فلترة حسب المسؤول',
    filterByType: 'فلترة حسب النوع',

    // Backlog
    backlogView: 'قائمة المهام',
    emptyBacklog: 'قائمة المهام فارغة',
    dragToOrder: 'اسحب لإعادة الترتيب',
    totalPoints: 'مجموع النقاط',
    issuesCount: 'المهام',

    // Sprints
    createSprint: 'إنشاء سباق',
    startSprint: 'بدء السباق',
    completeSprint: 'إنهاء السباق',
    sprintName: 'اسم السباق',
    sprintGoal: 'هدف السباق',
    startDate: 'تاريخ البدء',
    endDate: 'تاريخ الانتهاء',
    futureSprint: 'مستقبلي',
    activeSprint: 'نشط',
    completedSprint: 'مكتمل',
    noSprints: 'لا توجد سباقات بعد',

    // Epics
    epicsView: 'الملاحم',
    totalEpics: 'إجمالي الملاحم',
    open: 'مفتوح',
    createEpic: 'إنشاء ملحمة',
    noEpics: 'لا توجد ملاحم بعد',
    createYourFirstEpic: 'أنشئ ملحمتك الأولى',
    issueHierarchy: 'تسلسل المهام',
    childIssues: 'المهام الفرعية',
    progress: 'التقدم',
    expandAll: 'توسيع الكل',
    collapseAll: 'طي الكل',

    // Reports
    burndown: 'الإنجاز',
    velocity: 'السرعة',
    idealLine: 'الخط المثالي',
    remainingPoints: 'النقاط المتبقية',
    completedPoints: 'النقاط المكتملة',
    averageVelocity: 'متوسط السرعة',
    sprintStats: 'إحصائيات السباق',

    // Calendar
    calendarView: 'التقويم',
    today: 'اليوم',
    thisMonth: 'هذا الشهر',
    previousMonth: 'الشهر السابق',
    nextMonth: 'الشهر التالي',

    // Roadmap
    roadmapView: 'خارطة الطريق',
    timeline: 'الجدول الزمني',
    quarters: 'الأرباع',
    months: 'الأشهر',
    weeks: 'الأسابيع',

    // Components
    componentsView: 'المكونات',
    createComponent: 'إنشاء مكون',
    noComponents: 'لا توجد مكونات بعد',
    componentName: 'اسم المكون',
    componentDescription: 'وصف المكون',
    componentLead: 'قائد المكون',

    // Labels
    labelsView: 'التسميات',
    createLabel: 'إنشاء تسمية',
    noLabels: 'لا توجد تسميات بعد',
    labelName: 'اسم التسمية',
    labelColor: 'لون التسمية',
    labelDescription: 'وصف التسمية',

    // Workflows
    workflowsView: 'سير العمل',
    createWorkflow: 'إنشاء سير عمل',
    noWorkflows: 'لا يوجد سير عمل بعد',
    workflowName: 'اسم سير العمل',
    workflowDescription: 'وصف سير العمل',
    workflowStatuses: 'حالات سير العمل',
    defaultWorkflow: 'سير العمل الافتراضي',

    // Search
    globalSearch: 'البحث الشامل',
    searchIssues: 'البحث في المهام',
    searchProjects: 'البحث في المشاريع',
    recentSearches: 'عمليات البحث الأخيرة',
    searchResults: 'نتائج البحث',

    // Notifications
    successCreated: 'تم الإنشاء بنجاح',
    successUpdated: 'تم التحديث بنجاح',
    successDeleted: 'تم الحذف بنجاح',
    errorOccurred: 'حدث خطأ',
    profileUpdated: 'تم تحديث الملف الشخصي',
    dataExported: 'تم تصدير البيانات بنجاح',
    dataImported: 'تم استيراد البيانات بنجاح',
    importError: 'فشل استيراد البيانات. يرجى التحقق من صيغة الملف.',

    // About
    about: 'حول',
    aboutUs: 'من نحن',
    featureOverview: 'نظرة عامة على الميزات',
    contribution: 'المساهمة',

    // Admin Dashboard
    adminDashboard: 'لوحة الإدارة',
    adminDashboardDescription: 'فاحص بيانات IndexedDB',
    databaseTables: 'جداول قاعدة البيانات',
    recordInspector: 'فاحص السجلات',
    totalRecords: 'إجمالي السجلات',
    noRecords: 'لا توجد سجلات في هذا الجدول',
    selectRecordToInspect: 'اختر سجلاً للفحص',
    exportTable: 'تصدير بيانات الجدول',
    refresh: 'تحديث',
    refreshing: 'جار التحديث...',
  },

  es: {
    // App-level
    appName: 'Canopy',
    search: 'Buscar',
    searchPlaceholder: 'Buscar problemas, proyectos...',
    create: 'Crear',
    cancel: 'Cancelar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    loading: 'Cargando...',
    noResults: 'No se encontraron resultados',

    // Navigation/Sidebar
    planning: 'Planificación',
    roadmap: 'Hoja de Ruta',
    backlog: 'Backlog',
    activeSprints: 'Sprints Activos',
    sprints: 'Sprints',
    board: 'Tablero',
    reports: 'Informes',
    burndownChart: 'Gráfico de Burndown',
    velocityChart: 'Gráfico de Velocidad',
    sprintReport: 'Informe de Sprint',
    project: 'Proyecto',
    projectSettings: 'Configuración del Proyecto',
    components: 'Componentes',
    labels: 'Etiquetas',
    workflows: 'Flujos de Trabajo',
    calendar: 'Calendario',
    epics: 'Épicas',
    team: 'Equipo',

    // Settings Page
    settings: 'Configuración',
    settingsDescription: 'Administra tus preferencias y configuración de la aplicación',
    profile: 'Perfil',
    profileDescription: 'Actualiza tu información personal',
    name: 'Nombre',
    email: 'Correo Electrónico',
    saveProfile: 'Guardar Perfil',
    appearance: 'Apariencia',
    appearanceDescription: 'Personaliza cómo se ve Canopy',
    mode: 'Modo',
    light: 'Claro',
    dark: 'Oscuro',
    system: 'Sistema',
    colorTheme: 'Tema de Color',
    language: 'Idioma',
    languageDescription: 'Elige tu idioma preferido',
    defaultProject: 'Proyecto Predeterminado',
    defaultProjectDescription: 'Elige qué proyecto se abre por defecto',
    noDefaultProject: 'Sin proyecto predeterminado',
    dataManagement: 'Gestión de Datos',
    dataManagementDescription: 'Exportar, importar o borrar tus datos',
    exportData: 'Exportar Datos',
    importData: 'Importar Datos',
    exporting: 'Exportando...',
    importing: 'Importando...',
    exportDescription: 'Exporta tus datos como JSON para respaldo o transferencia. Importa datos exportados previamente para restaurar.',
    dangerZone: 'Zona de Peligro',
    dangerZoneDescription: 'Acciones irreversibles que afectan todos tus datos',
    clearAllData: 'Borrar Todos los Datos',
    deleteEverything: 'Eliminar Todo',
    deleteConfirmTitle: '¿Estás absolutamente seguro?',
    deleteConfirmDescription: 'Esto eliminará permanentemente todos tus proyectos, problemas, sprints y configuraciones. Esta acción no se puede deshacer. Considera exportar tus datos primero.',
    keyboardShortcuts: 'Atajos de Teclado',
    keyboardShortcutsDescription: 'Acciones rápidas para usuarios avanzados',
    openSearch: 'Abrir búsqueda',
    createIssue: 'Crear problema',
    goToBoard: 'Ir al tablero',
    goToBacklog: 'Ir al backlog',
    goToSprints: 'Ir a sprints',
    goToSettings: 'Ir a configuración',
    aboutCanopy: 'Acerca de Canopy',
    aboutDescription: 'Canopy es una herramienta de gestión de proyectos inspirada en el bosque, diseñada para equipos que valoran la simplicidad y el enfoque.',
    version: 'Versión 1.0.0 • Todos los datos se almacenan localmente en tu navegador',

    // Projects
    projects: 'Proyectos',
    createProject: 'Crear Proyecto',
    newProject: 'Nuevo Proyecto',
    projectName: 'Nombre del Proyecto',
    projectKey: 'Clave del Proyecto',
    projectDescription: 'Descripción del Proyecto',
    createYourFirstProject: 'Crea tu primer proyecto',
    welcomeMessage: 'Bienvenido a Canopy',
    noProjectsMessage: 'Comienza creando tu primer proyecto',

    // Issues
    issues: 'Problemas',
    issue: 'Problema',
    summary: 'Resumen',
    description: 'Descripción',
    type: 'Tipo',
    priority: 'Prioridad',
    status: 'Estado',
    assignee: 'Asignado',
    reporter: 'Reportador',
    storyPoints: 'Puntos de Historia',
    dueDate: 'Fecha de Vencimiento',
    epic: 'Épica',
    sprint: 'Sprint',
    labelsField: 'Etiquetas',
    componentsField: 'Componentes',
    subtasks: 'Subtareas',
    addSubtask: 'Agregar subtarea',
    comments: 'Comentarios',
    addComment: 'Agregar un comentario...',
    activity: 'Actividad',
    attachments: 'Adjuntos',

    // Issue Types
    story: 'Historia',
    bug: 'Error',
    task: 'Tarea',
    epicType: 'Épica',
    subtask: 'Subtarea',

    // Priority
    highest: 'Más Alta',
    high: 'Alta',
    medium: 'Media',
    low: 'Baja',
    lowest: 'Más Baja',

    // Status
    toDo: 'Por Hacer',
    inProgress: 'En Progreso',
    inReview: 'En Revisión',
    done: 'Hecho',

    // Board
    boardView: 'Tablero',
    emptyBoard: 'Tu tablero está vacío',
    emptyBoardDescription: 'Crea tu primer problema para comenzar',
    quickFilter: 'Filtro Rápido',
    filterByAssignee: 'Filtrar por asignado',
    filterByType: 'Filtrar por tipo',

    // Backlog
    backlogView: 'Backlog',
    emptyBacklog: 'Tu backlog está vacío',
    dragToOrder: 'Arrastra para reordenar elementos',
    totalPoints: 'Puntos Totales',
    issuesCount: 'Problemas',

    // Sprints
    createSprint: 'Crear Sprint',
    startSprint: 'Iniciar Sprint',
    completeSprint: 'Completar Sprint',
    sprintName: 'Nombre del Sprint',
    sprintGoal: 'Objetivo del Sprint',
    startDate: 'Fecha de Inicio',
    endDate: 'Fecha de Fin',
    futureSprint: 'Futuro',
    activeSprint: 'Activo',
    completedSprint: 'Completado',
    noSprints: 'No hay sprints aún',

    // Epics
    epicsView: 'Épicas',
    totalEpics: 'Total de Épicas',
    open: 'Abierto',
    createEpic: 'Crear Épica',
    noEpics: 'No hay épicas aún',
    createYourFirstEpic: 'Crea tu primera Épica',
    issueHierarchy: 'Jerarquía de Problemas',
    childIssues: 'Problemas Hijos',
    progress: 'Progreso',
    expandAll: 'Expandir Todo',
    collapseAll: 'Contraer Todo',

    // Reports
    burndown: 'Burndown',
    velocity: 'Velocidad',
    idealLine: 'Línea Ideal',
    remainingPoints: 'Puntos Restantes',
    completedPoints: 'Puntos Completados',
    averageVelocity: 'Velocidad Promedio',
    sprintStats: 'Estadísticas de Sprint',

    // Calendar
    calendarView: 'Calendario',
    today: 'Hoy',
    thisMonth: 'Este Mes',
    previousMonth: 'Mes Anterior',
    nextMonth: 'Mes Siguiente',

    // Roadmap
    roadmapView: 'Hoja de Ruta',
    timeline: 'Línea de Tiempo',
    quarters: 'Trimestres',
    months: 'Meses',
    weeks: 'Semanas',

    // Components
    componentsView: 'Componentes',
    createComponent: 'Crear Componente',
    noComponents: 'No hay componentes aún',
    componentName: 'Nombre del Componente',
    componentDescription: 'Descripción del Componente',
    componentLead: 'Líder del Componente',

    // Labels
    labelsView: 'Etiquetas',
    createLabel: 'Crear Etiqueta',
    noLabels: 'No hay etiquetas aún',
    labelName: 'Nombre de la Etiqueta',
    labelColor: 'Color de la Etiqueta',
    labelDescription: 'Descripción de la Etiqueta',

    // Workflows
    workflowsView: 'Flujos de Trabajo',
    createWorkflow: 'Crear Flujo de Trabajo',
    noWorkflows: 'No hay flujos de trabajo aún',
    workflowName: 'Nombre del Flujo de Trabajo',
    workflowDescription: 'Descripción del Flujo de Trabajo',
    workflowStatuses: 'Estados del Flujo de Trabajo',
    defaultWorkflow: 'Flujo de Trabajo Predeterminado',

    // Search
    globalSearch: 'Búsqueda Global',
    searchIssues: 'Buscar problemas',
    searchProjects: 'Buscar proyectos',
    recentSearches: 'Búsquedas Recientes',
    searchResults: 'Resultados de Búsqueda',

    // Notifications
    successCreated: 'Creado exitosamente',
    successUpdated: 'Actualizado exitosamente',
    successDeleted: 'Eliminado exitosamente',
    errorOccurred: 'Ocurrió un error',
    profileUpdated: 'Perfil actualizado',
    dataExported: 'Datos exportados exitosamente',
    dataImported: 'Datos importados exitosamente',
    importError: 'Error al importar datos. Por favor verifica el formato del archivo.',

    // About
    about: 'Acerca de',
    aboutUs: 'Sobre Nosotros',
    featureOverview: 'Descripción de Características',
    contribution: 'Contribución',

    // Admin Dashboard
    adminDashboard: 'Panel de Administración',
    adminDashboardDescription: 'Inspector de Datos IndexedDB',
    databaseTables: 'Tablas de Base de Datos',
    recordInspector: 'Inspector de Registros',
    totalRecords: 'Registros Totales',
    noRecords: 'No hay registros en esta tabla',
    selectRecordToInspect: 'Selecciona un registro para inspeccionar',
    exportTable: 'Exportar datos de tabla',
    refresh: 'Actualizar',
    refreshing: 'Actualizando...',
  },
};

export function getTranslations(language: Language = 'en'): Translations {
  return translations[language] || translations.en;
}

export function t(key: keyof Translations, language: Language = 'en'): string {
  const trans = translations[language] || translations.en;
  return trans[key] || key;
}
