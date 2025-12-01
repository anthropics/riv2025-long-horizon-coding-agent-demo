<project_specification>
  <project_name>AntTodo - Full Featured Task Management Application</project_name>

  <overview>
    Build a fully functional personal and team task management application similar to Todoist with natural language
    processing, flexible project organization, powerful filtering, productivity tracking, and seamless collaboration.
    The application should have a clean, focused UI with intelligent features that stay out of the way, allowing users
    to capture tasks effortlessly and organize them in ways that match their personal workflows.

    This application is designed as a native macOS desktop application that feels at home on Mac.
  </overview>

  <technology_stack>
    <desktop_application>
      <framework>Electron for cross-platform desktop app packaging</framework>
      <ui_framework>React for component-based UI development</ui_framework>
      <styling>Tailwind CSS for utility-first styling</styling>
      <state_management>React Context API with reducers for complex state</state_management>
      <routing>React Router for navigation between views</routing>
    </desktop_application>
    <nlp_and_parsing>
      <date_parser>Chrono.js for natural language date parsing</date_parser>
      <recurrence>Custom recurrence parser supporting Todoist syntax</recurrence>
      <task_parser>Custom parser for @labels, #projects, p1-p4 priorities</task_parser>
    </nlp_and_parsing>
    <data_layer>
      <database>SQLite with better-sqlite3 for task storage and metadata</database>
      <sync_engine>Custom sync service for cross-device synchronization</sync_engine>
      <search>MiniSearch for fast full-text search with BM25 ranking</search>
      <indexing>Real-time indexing of tasks, projects, labels for instant search</indexing>
    </data_layer>
    <notifications>
      <system>Electron notifications API for desktop alerts</system>
      <scheduling>Node-cron for reminder scheduling</scheduling>
      <email>Nodemailer for email reminders (optional)</email>
    </notifications>
  </technology_stack>

  <prerequisites>
    <environment_setup>
      - Node.js 18+ installed for Electron runtime
      - Electron configured for macOS application building
      - React development environment set up
      - SQLite3 native bindings for Electron
      - Chrono.js installed for date parsing
      - MiniSearch installed for search functionality
    </environment_setup>
    <build_configuration>
      - Electron Builder for packaging Mac .app bundle
      - Code signing for macOS Gatekeeper
      - Native menu bar with standard macOS menus
      - Dock icon with badge count for overdue tasks
      - App icon in multiple resolutions
      - Info.plist with bundle ID and permissions
      - Auto-update mechanism (optional)
    </build_configuration>
  </prerequisites>

  <core_data_entities>
    <tasks>
      - Task name (required string, max 500 characters)
      - Description (rich text with markdown formatting)
      - Due date (optional date/datetime)
      - Due time (optional time component)
      - Duration (task length in minutes, optional)
      - Deadline (hard deadline separate from due date, with {curly brackets})
      - Recurrence pattern (string, e.g., "every Monday at 9am")
      - Priority level (1-4, where 1 is highest)
      - Labels (array of label IDs)
      - Project ID (can be Inbox if no project)
      - Section ID (optional grouping within project)
      - Parent task ID (for sub-tasks, supports 4 indent levels)
      - Assignee ID (for team collaboration)
      - Created date and creator ID
      - Completed date and completion status
      - Sort order (integer for manual ordering)
      - Comments array with threaded discussions
      - File attachments (array of file metadata)
    </tasks>
    <projects>
      - Project name (required string)
      - Color (from predefined palette of 20 colors)
      - View layout (list, board, or calendar)
      - Parent project ID (for sub-projects, 3 levels deep)
      - Is favorite (boolean for sidebar pinning)
      - Sort order in sidebar
      - Shared status (personal or team)
      - Access level (public or restricted for teams)
      - Archived status (boolean)
      - Created date and owner ID
    </projects>
    <sections>
      - Section name (required string)
      - Project ID (which project it belongs to)
      - Sort order within project
      - Color (optional, inherits from project)
      - Task count for display
      - Collapsed state (per user preference)
    </sections>
    <labels>
      - Label name (required string with @ prefix)
      - Color (from predefined palette)
      - Is favorite (boolean)
      - Sort order in label list
      - Personal vs shared (for team workspaces)
      - Task count for display
    </labels>
    <filters>
      - Filter name (required string)
      - Query string (using filter syntax)
      - Color (from predefined palette)
      - Is favorite (boolean)
      - Sort order in filter list
      - View layout preference (list, board, calendar)
    </filters>
    <users>
      - Full name and email (required)
      - Avatar URL or initials
      - Timezone (IANA format)
      - Role (admin, member, guest for teams)
      - Daily goal (integer, default 5)
      - Weekly goal (integer, default 25)
      - Days off (array of weekdays)
      - Vacation mode (boolean)
      - Karma score (integer starting at 50)
      - Karma level (Beginner to Enlightened)
      - Current streak (days/weeks)
      - Longest streak (historical record)
      - Theme preference (Todoist, Dark, or Pro themes)
      - Auto dark mode (follow system)
      - Settings and preferences
    </users>
    <karma_system>
      - Total Karma points (integer)
      - Current level (8 levels from Beginner to Enlightened)
      - Karma trend (last 7 days line graph data)
      - Daily streak count (consecutive days meeting goal)
      - Weekly streak count (consecutive weeks meeting goal)
      - Longest streak (all-time record)
      - Tasks completed today/this week
      - Points earned today/this week
      - Levels: Beginner, Novice, Intermediate, Advanced, Expert, Master, Grandmaster, Enlightened
    </karma_system>
    <teams>
      - Team name and workspace ID
      - Admin users (array)
      - Member users (array)
      - Guest users (array with project restrictions)
      - Team projects (separate from personal)
      - Shared labels pool
      - Activity log (who did what when)
      - Billing information
      - Default project access (public or restricted)
      - Default collaborators list
    </teams>
  </core_data_entities>

  <pages_and_interfaces>
    <main_window>
      <top_bar>
        - Height: 60px with subtle bottom border
        - Left side elements:
          * Menu icon (three horizontal lines) for sidebar toggle
          * Search icon with keyboard hint (Cmd+/)
          * Quick Add button (prominent + icon with "Add task" text)
        - Right side elements:
          * Sync status indicator (spinning when syncing)
          * Notifications bell icon with unread badge
          * Productivity pie chart (daily goal progress)
          * User avatar menu (settings, productivity, logout)
        - Clean white background (light theme) or dark gray (dark theme)
        - Icons use consistent sizing (20x20px)
      </top_bar>

      <sidebar>
        - Collapsible left panel (default 280px wide, resizable 240-400px)
        - Collapse with Cmd+\ or menu icon
        - Top section (default views):
          * Inbox (icon: inbox tray) with unread count badge
          * Today (icon: calendar) with task count
          * Upcoming (icon: calendar range) with upcoming count
          * Filters & Labels (icon: funnel) expandable section
        - Middle section (Favorites):
          * User-pinned projects, labels, filters
          * Star icon indicates favorite status
          * Drag to reorder favorites
          * Collapsible with header
        - Projects section:
          * "My Projects" header with + icon to add
          * Hierarchical list with indent levels
          * Project color dots (8px circle)
          * Task count badges (gray pill)
          * Expand/collapse arrows for sub-projects
          * Right-click context menu (rename, color, share, delete, archive)
          * Drag-and-drop to reorder or change hierarchy
        - Team workspace section (if applicable):
          * Team name header
          * Team projects listed below
          * "Browse team projects" option
          * Guest access indicator icons
        - Bottom action:
          * "+ Add team" or "Upgrade" call-to-action
        - Smooth collapse animation (250ms)
      </sidebar>

      <main_content_area>
        - Flexible width content area (fills remaining space)
        - View header:
          * View name (large, bold, e.g., "Today", "Project: Work")
          * View description or task count
          * View options menu (three dots icon) with:
            - Sort by (date, priority, name, assignee)
            - Group by (date, priority, project, label)
            - Display options (show completed, future occurrences)
          * Layout toggle (List, Board, Calendar icons)
          * Share project button (for shared projects)
        - Task list/board/calendar area:
          * Renders based on selected layout
          * Smooth transitions between layouts (300ms)
          * Empty state with helpful prompts
          * "Add task" quick access at bottom (in list view)
        - Task grouping headers:
          * Date headers: "Today", "Tomorrow", specific dates
          * Overdue section (red header if tasks exist)
          * Priority grouping (if enabled)
          * Collapsible sections with task counts
        - Keyboard navigation:
          * Arrow keys to move between tasks
          * Enter to open task detail
          * E to complete task
          * T to schedule task
          * C to add comment
      </main_content_area>

      <task_item>
        - Checkbox on left (circle for incomplete, checkmark for complete)
        - Priority indicator: colored flag icon (red p1, orange p2, blue p3, gray p4)
        - Task name with inline date/label highlighting
        - Due date chip (colored by urgency: red overdue, orange today, default future)
        - Label pills (colored, removable with X on hover)
        - Project indicator (small colored dot + name if not in project view)
        - Assignee avatar (small circle, 24px)
        - Comment count (speech bubble icon with number)
        - Sub-task indicator (count like "3/5" with pie chart progress)
        - Hover state reveals:
          * Edit icon (pencil)
          * Schedule icon (calendar)
          * More actions (three dots)
        - Drag handle (six dots icon) on far left on hover
        - Smooth hover transition (150ms)
        - Completed tasks: gray with strikethrough, lower opacity
      </task_item>

      <task_detail_view>
        - Modal overlay or right panel (based on screen size)
        - Width: 600px for modal, fills right side for panel
        - Left content area:
          * Task name (editable, large font, auto-focus)
          * Task description (markdown editor, expandable)
          * Sub-tasks section:
            - Progress indicator (X/Y completed)
            - Show/hide completed toggle
            - Add sub-task button
            - Drag to reorder sub-tasks
            - Indent/outdent controls
          * Comments section:
            - Chronological list of comments
            - Avatar + name + timestamp
            - Comment text with markdown support
            - File attachments with previews
            - Audio recording option
            - @ mention support with autocomplete
            - "Notify" dropdown to select recipients
            - Reply threading (optional)
        - Right sidebar (260px):
          * Project selector (dropdown with colors)
          * Section selector (if project has sections)
          * Due date picker with natural language input
          * Due time picker with duration option
          * Deadline field (curly bracket syntax)
          * Priority flag selector (visual flags)
          * Labels multi-select (create new inline)
          * Assignee selector (for shared projects)
          * Reminders list:
            - Automatic reminder (default 30min before)
            - Custom reminders (date/time or location)
            - Add reminder button
          * Activity log (who created, last modified)
        - Top bar actions:
          * Parent task breadcrumb (if sub-task)
          * Complete button (large checkmark)
          * More actions menu (duplicate, copy link, delete)
          * Close button (X)
        - Sticky comment input at bottom
        - Keyboard shortcuts displayed in tooltips
      </task_detail_view>
    </main_window>

    <inbox_view>
      - Default landing view for new tasks
      - Header: "Inbox" with task count
      - Purpose: "Capture tasks quickly, organize them later"
      - Tasks without projects automatically go here
      - Empty state: "Your inbox is empty. Nice work!"
      - Batch operations: select multiple, move to project
      - Sort options: date added, priority, alphabetical
      - Quick project assignment from task hover menu
    </inbox_view>

    <today_view>
      - Shows all tasks due today across all projects
      - Overdue section at top (collapsed when empty)
      - Grouped by project (optional) or flat list
      - Priority sorting by default (p1 tasks at top)
      - Tasks with time appear before tasks without time
      - Drag-and-drop to reschedule to bottom (postpone to tomorrow)
      - Goal: reach "Todoist Zero" by completing all tasks
      - Empty state: motivational message
      - Available layouts: List, Board, Calendar
    </today_view>

    <upcoming_view>
      - Bird's eye view of scheduled tasks
      - Week picker at top (navigate weeks)
      - List layout: grouped by date with collapsible headers
      - Board layout: columns for each day of the week
      - Calendar layout: week or month grid
      - Drag-and-drop to reschedule tasks
      - Overdue tasks in separate section or highlighted
      - "Plan" sidebar (in calendar view) for unscheduled tasks
      - Jump to specific date with date picker
      - Show future occurrences of recurring tasks (toggle)
      - Default shows next 7 days, scroll to load more
    </upcoming_view>

    <project_view>
      - Project header with name, description, member count
      - Breadcrumb if sub-project (Parent > Child)
      - View layout selector (List, Board, Calendar)
      - Section organization within project:
        * List view: sections as collapsible headers
        * Board view: sections as vertical columns
        * Calendar view: all tasks in calendar grid
      - Add section button (max 20 sections per project)
      - Add task button (inline or quick add)
      - Completed tasks: toggle to show/hide, separate section
      - Empty project state: helpful tips and templates
      - Project actions menu:
        * Edit project (name, color, layout)
        * Share project (if not team project)
        * Duplicate project
        * Save as template
        * Archive project
        * Delete project
      - Keyboard shortcuts for quick task adding (A, Q)
    </project_view>

    <board_layout>
      - Kanban-style board with vertical columns for sections
      - Each section is a column with header
      - Tasks appear as cards in columns
      - Drag cards within column to reorder
      - Drag cards between columns to move sections
      - Add task button at bottom of each column
      - Add section by scrolling right, "+ Add Section"
      - Smooth animations for drag-and-drop
      - Card shows: checkbox, name, date, labels, assignee
      - Empty column state: "Add your first task"
      - Horizontal scroll for many sections
      - Column width: 300px fixed
    </board_layout>

    <calendar_layout>
      - Week view (7 columns) or Month view (calendar grid)
      - Week view shows time slots (8am-8pm default, customizable)
      - Tasks with time appear at scheduled time
      - All-day tasks appear in "All day" section at top
      - Tasks without time appear in task list on left ("Plan" sidebar)
      - Drag from Plan sidebar to schedule
      - Drag tasks to different dates/times to reschedule
      - Resize task blocks to adjust duration
      - Month view shows task count per day
      - Click day in month view to see task list
      - Color-coded by project
      - External calendar integration (Google Calendar overlay)
      - Current time indicator (red line)
    </calendar_layout>

    <filters_and_labels>
      - Filters & Labels view in sidebar
      - Two expandable sections: Filters and Labels
      - Filters section:
        * Default filters: Priority 1, Priority 2, Priority 3, Priority 4
        * Custom filters with + Add filter button
        * Each filter shows task count badge
        * Click to open filter view
        * Right-click for filter actions (edit, duplicate, delete, favorite)
        * Drag to reorder
      - Labels section:
        * All labels alphabetically sorted
        * Color dots matching label color
        * Task count badges
        * Click to see all tasks with label
        * Right-click for label actions (edit, delete, favorite)
        * "+ Add label" button at bottom
      - Filter creation modal:
        * Filter name input
        * Color picker (20 colors)
        * Query builder with natural language input
        * "Filter Assist" AI helper (optional)
        * Query syntax reference
        * Preview of results
        * Add to favorites checkbox
      - Label creation modal:
        * Label name input (@ prefix auto-added)
        * Color picker
        * Add to favorites checkbox
    </filters_and_labels>

    <filter_query_syntax>
      - Natural language: "all high priority tasks due this week"
      - Keyword search: search: keyword
      - Date queries: today, tomorrow, overdue, 7 days, -3 days, Jan 15
      - Due queries: due before: date, due after: date, no due date
      - Priority: p1, p2, p3, p4
      - Project: #ProjectName, ##ProjectAndSubProjects
      - Label: @labelname
      - Assignee: assigned to: name, assigned by: name, assigned to: me
      - Status: !assigned, no date, recurring, !recurring
      - Date created: created: date, created before: date, created after: date
      - Boolean operators: & (AND), | (OR), ! (NOT), parentheses for grouping
      - Examples:
        * "today & p1" - Priority 1 tasks due today
        * "(overdue | today) & @email" - Overdue or today tasks with email label
        * "#Work & 7 days & !assigned" - Work tasks in next 7 days not assigned
        * "assigned to: me & p1" - High priority tasks assigned to me
    </filter_query_syntax>

    <quick_add_modal>
      - Triggered by Q keyboard shortcut or + button
      - Global shortcut works even when app minimized (Cmd+Shift+A)
      - Modal appears centered (500px wide, auto height)
      - Large task name input field with auto-focus
      - Natural language parsing as you type:
        * Dates highlighted in orange
        * Labels highlighted in purple
        * Projects highlighted in gray
        * Priorities shown as colored flags
        * Click highlighted item to disable parsing
      - Action buttons below (customizable order):
        * Due date button (calendar icon)
        * Priority button (flag icon with dropdown)
        * Labels button (tag icon with multi-select)
        * Project button (# icon with dropdown)
        * More options (assignee, reminders, etc.)
      - Toggle between showing labels vs just icons (setting)
      - Keyboard shortcuts work in modal:
        * # for project picker
        * @ for label picker
        * ! for priority picker
        * Type date naturally in task name
      - Submit with Enter, cancel with Escape
      - "Add & Add Another" option (Cmd+Enter)
      - Recent projects/labels at top of dropdowns
    </quick_add_modal>

    <command_palette>
      - Triggered by Cmd+K keyboard shortcut
      - Modal overlay (450px wide, centered)
      - Search input with icon, immediate focus
      - Fuzzy search through all commands
      - Results show:
        * Command name
        * Keyboard shortcut (if assigned)
        * Category (navigation, task actions, views)
        * Icon for visual identification
      - Recently used commands appear first
      - Arrow keys to navigate results
      - Enter to execute selected command
      - Escape to close
      - "Go to" mode shortcuts:
        * G then T: Go to Today
        * G then U: Go to Upcoming
        * G then I: Go to Inbox
        * G then P: List all projects
        * G then L: List all labels
        * G then V: Go to Filters & Labels
      - Action shortcuts visible in command list
      - Keyboard shortcut customization (in settings)
    </command_palette>

    <productivity_view>
      - Accessed via user avatar menu or Browse section
      - Tabbed interface:
        * Daily tab (default)
        * Weekly tab
        * Karma tab
      - Daily tab shows:
        * Total tasks completed today
        * Daily goal (e.g., "5 of 5 tasks")
        * Circular progress indicator
        * Current streak (days in a row)
        * Longest streak (motivational)
        * Bar chart of last 7 days (color-coded by project)
        * Vertical line showing daily goal on chart
      - Weekly tab shows:
        * Total tasks completed this week
        * Weekly goal (e.g., "25 of 25 tasks")
        * Progress bar
        * Weekly streak count
        * Bar chart of last 4 weeks (color-coded)
        * Breakdown by project
      - Karma tab shows:
        * Current Karma level with icon
        * Total Karma points
        * Points to next level (progress bar)
        * Karma trend (line graph of last 7 days)
        * How to earn more points (expandable tips)
        * Mystery theme unlock message (when Enlightened)
      - "Edit Goals" link opens settings
      - "View all completed tasks" link
      - Vacation mode toggle (preserves streaks)
      - Beautiful data visualizations using recharts or Chart.js
    </productivity_view>

    <settings_window>
      - Separate window or modal (800px wide)
      - Left sidebar with categories:
        * General (home view, language, notifications)
        * Account (email, password, delete account)
        * Theme (color themes, auto dark mode, sync theme)
        * Quick Add (customize action buttons and order)
        * Sidebar (show/hide views, task counts)
        * Reminders (automatic reminder timing, notification types)
        * Productivity (daily/weekly goals, days off, vacation mode, Karma on/off)
        * Keyboard shortcuts (customize all shortcuts)
        * Backup & Restore (export data, import from backup)
        * Advanced (developer mode, beta features)
      - Right content area shows selected settings page
      - Save buttons per section or auto-save
      - Search bar at top to filter settings
      - "Restore defaults" option per category
      - Keyboard shortcut to open: Cmd+,
    </settings_window>

    <search_view>
      - Full-screen search interface or sidebar panel
      - Large search input at top with focus
      - Search as you type (debounced 300ms)
      - Search scope selector: All, Projects, Labels, Filters
      - Results grouped by type:
        * Tasks (most relevant)
        * Comments (if text matches)
        * Projects (name matches)
        * Labels (name matches)
      - Task results show:
        * Task name with highlighted match
        * Project and section context
        * Due date and priority
        * Snippet of description/comment if matched
        * Click to open task detail
      - Sort options: Relevance, Date, Priority
      - Filter search results by project, label, date range
      - Recent searches history (last 10)
      - Clear search button
      - Keyboard shortcut: Cmd+/
      - Close with Escape
    </search_view>

    <notification_center>
      - Dropdown panel from bell icon (360px wide)
      - Tabs: All, Mentions, Assignments, Invites
      - Notification items show:
        * User avatar (for collaborative actions)
        * Action description ("assigned you a task", "commented on")
        * Task name (clickable)
        * Timestamp (relative: "5 min ago")
        * Mark as read button (or auto-mark on click)
      - Empty state: "You're all caught up!"
      - "Mark all as read" action
      - Notification settings link at bottom
      - Badge count on bell icon
      - Push notifications (desktop) for:
        * Task assignments
        * Comments mentioning user
        * Project invites
        * Upcoming task reminders
        * Daily goal achievements
    </notification_center>

    <scheduler_picker>
      - Appears as popover when setting dates
      - Triggered from task detail or inline scheduling
      - Components:
        * Natural language input at top (e.g., "tomorrow at 3pm")
        * Quick date buttons: Today, Tomorrow, This Weekend, Next Week
        * Mini calendar for date selection
        * Time picker (optional, appears when date has time)
        * Duration selector (for time-blocking)
        * Recurring options:
          - Quick buttons: Daily, Weekly, Monthly, Yearly
          - Custom recurrence with advanced options
          - Starting date selector
          - Ending date or count
          - "every" vs "every!" (completion-based)
        * Deadline field (separate from due date)
        * Preview of next occurrence (for recurring)
      - Smart highlighting of parsed dates
      - Click parsed text to convert to plain text
      - Keyboard navigation (arrows + Enter)
      - Close with Escape or click outside
    </scheduler_picker>
  </pages_and_interfaces>

  <core_functionality>
    <natural_language_parsing>
      - Date recognition using Chrono.js:
        * Absolute: "Jan 15", "January 15 2026", "2026-01-15"
        * Relative: "today", "tomorrow", "next Monday", "in 3 days"
        * Time: "at 3pm", "at 15:00", "9am"
        * Duration: "for 2 hours", "for 30m"
        * Ranges: "from 2pm to 4pm"
      - Priority parsing: p1, p2, p3, p4 anywhere in task name
      - Label parsing: @labelname (create if doesn't exist)
      - Project parsing: #ProjectName (fuzzy match)
      - Section parsing: /SectionName (after # project)
      - Assignee parsing: +PersonName (in shared projects)
      - Auto-highlight recognized elements as you type
      - Click to disable parsing (convert to plain text)
      - Setting to disable auto-recognition entirely
      - Supported languages: English (can expand later)
    </natural_language_parsing>

    <recurring_tasks>
      - Recurrence patterns support:
        * Simple: "every day", "every Monday", "every week"
        * Complex: "every 2 weeks", "every 3 months"
        * Specific days: "every Monday, Wednesday, Friday"
        * Nth day: "every 3rd Tuesday", "every last Friday"
        * Starting date: "every week starting Jan 15"
        * Ending date: "every week ending Dec 31"
        * Ending after count: "every week for 10 occurrences"
        * Time-based: "every 12 hours", "every 3 days at 9am"
        * Holidays: "every Christmas", "every New Year"
      - Completion-based recurrence:
        * "every day" - schedules from due date
        * "every! day" - schedules from completion date
        * Useful for habits that shouldn't skip if delayed
      - Auto-reschedule on completion:
        * Calculate next occurrence based on pattern
        * Skip past dates if overdue
        * Show next occurrence immediately after completing
      - Future occurrences:
        * Hidden by default (don't clutter views)
        * Visible in Calendar view if enabled
        * Can't be completed individually (only next occurrence)
      - Recurrence editing:
        * Change pattern updates all future occurrences
        * Option to update "this and future" or "only this"
      - Smart overflow handling:
        * If overdue by multiple cycles, skip to next future date
        * Don't create backlog of missed occurrences
    </recurring_tasks>

    <task_management>
      - Create task: Quick Add (Q), inline Add Task button, global shortcut
      - Complete task: click checkbox, press E, swipe gesture (mobile)
      - Edit task: click task name or press Enter on selected task
      - Delete task: context menu or keyboard shortcut
      - Duplicate task: creates copy with same attributes
      - Move task: drag-and-drop or change project in task detail
      - Reschedule task: drag in calendar, use scheduler, type new date
      - Postpone shortcuts: right-click → Tomorrow, Next Week
      - Indent/outdent: Cmd+] and Cmd+[ to create sub-tasks
      - Multi-select: Cmd+click, Shift+click for range
      - Batch operations on selection: move, reschedule, delete, complete
      - Undo recent action: Cmd+Z (works for 5 seconds after action)
      - Sort within project: manual drag-and-drop or auto-sort
      - Task completion:
        * Checkbox animation (expand and fade)
        * Strikethrough and gray out
        * Move to completed section
        * Undo popup appears for 5 seconds
        * Add to Karma points
        * Recurring tasks reschedule automatically
    </task_management>

    <project_management>
      - Create project: + icon next to My Projects
      - Project properties:
        * Name (required)
        * Color (20 color palette)
        * Default view (List, Board, Calendar)
        * Parent project (for sub-projects, 3 levels max)
        * Favorite status
        * Shared status (personal or team)
      - Sub-projects:
        * Indent under parent (3 levels deep)
        * Drag left/right to change hierarchy
        * Collapse/expand parent to hide children
        * Inherit or override parent settings
      - Sections within projects:
        * Up to 20 sections per project
        * Add via "+ Add section" or S keyboard shortcut
        * Drag to reorder sections
        * Archive section (hides with completed tasks)
        * Delete section (deletes all tasks in section!)
        * Collapse/expand individual sections
      - Project templates:
        * Save project as template (preserves structure)
        * Template gallery with 50+ pre-made templates
        * Apply template to new or existing project
        * Template categories: Work, Personal, Education, etc.
        * Edit template tasks before importing
        * Dates adjust relative to application date
      - Project actions:
        * Archive: hides from active list, can restore
        * Duplicate: copies all tasks and structure
        * Share: invite collaborators via email
        * Export: download as CSV or JSON
        * Delete: permanent removal with confirmation
    </project_management>

    <labels_and_priorities>
      - Labels:
        * Create with @ prefix (e.g., @email, @waiting, @home)
        * Multi-select: tasks can have unlimited labels
        * Color-coded with 20 color palette
        * Personal labels (created by user)
        * Shared labels (from team collaborators, gray color)
        * Use for contexts, energy levels, time estimates
        * Filter by label to batch similar tasks
        * Rename label updates all task references
      - Priorities:
        * 4 levels: p1 (red, urgent), p2 (orange, high), p3 (blue, medium), p4 (gray, low)
        * Visual flag icons
        * Colors not customizable (consistency)
        * Type p1-p4 in task name for quick assignment
        * Flag button in task detail for visual selection
        * Sort by priority in views
        * Default sorting: p1 at top, then p2, p3, p4
        * Use p1 sparingly (only true urgencies)
    </labels_and_priorities>

    <collaboration>
      - Share personal projects:
        * Invite up to 5 people via email
        * All collaborators have full access
        * No role differentiation in personal projects
        * Shared tasks, comments, files visible to all
      - Team workspaces (paid feature):
        * Separate workspace for team
        * Team projects distinct from personal
        * Roles: Admin, Member, Guest
        * Admin: full control, manage members, billing
        * Member: create projects, join all public projects
        * Guest: access only invited projects
        * Public vs restricted projects
        * Project folders for organization
        * Default collaborators (auto-added to new projects)
      - Task assignment:
        * One assignee per task (DRI principle)
        * + icon or type +name in task
        * Assigned person receives notification
        * Filter by "assigned to: me"
        * Assignee avatar shown on task
        * Unassign to remove responsibility
      - Comments and collaboration:
        * @ mention users to notify
        * "Notify" dropdown to alert specific people
        * File attachments (up to 100MB on paid plans)
        * Audio comments (record voice notes)
        * Emoji reactions on comments (optional)
        * Email notification for mentions
        * Activity history (who did what)
      - Project sharing link:
        * Generate shareable URL
        * Recipients can preview and join
        * One-click join for team members
    </collaboration>

    <reminders_and_notifications>
      - Automatic reminders:
        * Default: 30 minutes before task with time
        * Customize default in settings (0 min to 1 week)
        * Only for tasks with both date and time
        * Disable per task if not needed
      - Custom reminders:
        * Add multiple reminders to single task
        * Absolute: "Jan 15 at 9am"
        * Relative: "1 hour before task"
        * Recurring: "every Monday at 8am"
        * Location-based: "when I arrive at grocery store" (mobile)
      - Reminder notifications:
        * Desktop notifications (via Electron)
        * Push notifications (mobile)
        * Email notifications
        * Choose notification types per reminder
        * Snooze reminders: 10 min, 30 min, 1 hour, 3 hours, custom
      - Notification settings:
        * Email notifications for: assignments, mentions, due soon, overdue
        * Push notification for: same as email
        * Desktop notifications on/off
        * Notification sound (customizable)
        * Do not disturb hours
        * Notification preview in settings
    </reminders_and_notifications>

    <karma_system>
      - Point earning:
        * Complete task on time: +5 points
        * Complete recurring task: +10 points
        * Use labels: +1 point per task
        * Use reminders: +1 point per task
        * Reach daily goal: +20 bonus points
        * Reach weekly goal: +50 bonus points
        * Maintain streak: +10 points per day
      - Point losing:
        * Task 4+ days overdue: -2 points per day
        * Miss daily goal: -5 points
        * Break streak: -10 points
      - Karma levels (8 total):
        * Beginner: 0-149 points
        * Novice: 150-499 points
        * Intermediate: 500-999 points
        * Advanced: 1000-2499 points
        * Expert: 2500-4999 points
        * Master: 5000-9999 points
        * Grandmaster: 10000-19999 points
        * Enlightened: 20000+ points (unlocks mystery theme)
      - Streak tracking:
        * Daily streak: consecutive days meeting daily goal
        * Weekly streak: consecutive weeks meeting weekly goal
        * Longest streak displayed for motivation
        * Vacation mode: pause without breaking streak
        * Days off: select weekdays to exclude
      - Karma trend visualization:
        * Line graph showing last 7 days
        * Color-coded: green gaining, red losing, gray stable
        * Hover to see points per day
      - Disable Karma: setting to turn off entirely
      - Reset Karma: manual reset to 50 points (via support)
    </karma_system>

    <search_functionality>
      - Global search: searches all tasks, comments, projects, labels
      - Search index using MiniSearch:
        * BM25 algorithm for relevance ranking
        * Tokenization and stemming
        * Real-time index updates
        * Fast search (under 50ms for 10k tasks)
      - Search query types:
        * Keyword: plain text search in task names
        * Field-specific: use filter syntax
        * Fuzzy matching for typos
        * Phrase search with quotes: "exact phrase"
      - Search results:
        * Task name with highlighted matches
        * Context snippet from description/comments
        * Project and date information
        * Relevance score sorting
        * Group by project option
        * Click to open task detail
      - Search filters:
        * By project
        * By date range
        * By completion status
        * By assignee
        * By label
      - Search history:
        * Last 10 searches remembered
        * Click to re-run search
        * Clear history option
      - Keyboard shortcut: Cmd+/
    </search_functionality>

    <data_persistence>
      - SQLite database schema:
        * tasks table with all task fields
        * projects table with hierarchy support
        * sections table linked to projects
        * labels table with color and metadata
        * filters table with query strings
        * users table for local user data
        * karma_events table for tracking points
        * comments table with file references
        * attachments table with file paths
        * sync_log table for change tracking
      - Automatic saving (no save button)
      - Write-ahead logging for crash recovery
      - Database backup on app close
      - Export to JSON or CSV
      - Import from backup file
      - Migration system for schema updates
    </data_persistence>

    <keyboard_shortcuts>
      - Task actions:
        * Q: Quick Add
        * A: Add task to bottom of list
        * Shift+A: Add task to top of list
        * E: Complete selected task
        * T: Schedule selected task
        * C: Add comment
        * Del/Backspace: Delete task
        * Cmd+Up/Down: Change priority
        * Cmd+]/[: Indent/outdent (sub-task)
      - Navigation:
        * J or Down: Next task
        * K or Up: Previous task
        * Enter: Open task detail
        * Escape: Close modal/detail
        * Cmd+1-9: Switch to nth favorite/project
        * G then letter: Go to view (Today, Upcoming, etc.)
      - Views and windows:
        * Cmd+K: Command palette
        * Cmd+/: Global search
        * Cmd+\: Toggle sidebar
        * Cmd+,: Settings
        * Cmd+O: Quick switcher (projects/filters)
        * Shift+Cmd+N: New window
      - Selection and editing:
        * Cmd+Click: Multi-select tasks
        * Shift+Click: Range select
        * Cmd+A: Select all visible tasks
        * Cmd+Z: Undo (5 second window)
        * X: Select/deselect task
        * Shift+V: Switch view layout
      - Customization:
        * All shortcuts customizable in settings
        * Conflict detection
        * Reset to defaults option
        * Chord shortcuts (two-key sequences)
        * Print shortcut reference (?)
    </keyboard_shortcuts>

    <comments_and_attachments>
      - Task comments:
        * Add comment from task detail view
        * Rich text with markdown formatting
        * @ mentions with autocomplete
        * Notify specific people or everyone
        * Emoji picker
        * Voice recording option
        * Edit own comments (show edited indicator)
        * Delete own comments
        * Chronological order (can't reorder)
      - Project comments:
        * Attached to project, not individual task
        * For high-level information
        * Same features as task comments
        * Visible to all project members
        * Access via comment icon in project header
      - File attachments:
        * Upload from file picker or drag-and-drop
        * Attach to tasks or comments
        * File size limits: 5MB (free), 100MB (paid)
        * Supported types: images, PDFs, documents, archives
        * Image previews inline
        * PDF previews with thumbnails
        * Document file icons
        * Download button for all files
        * Delete attachments (own only)
        * Attachment count shown on task
      - Audio comments:
        * Record directly in app
        * Waveform visualization during recording
        * Play/pause controls inline
        * Timestamp for length
        * Download audio file
    </comments_and_attachments>

    <templates>
      - Project templates:
        * 50+ pre-made templates in gallery
        * Categories: Work, Personal, Education, Management
        * Examples: Blog Post, Event Planning, Sprint Planning
        * Preview before importing
        * Edit tasks during import process
      - Custom templates:
        * Save any project as template
        * Preserves: tasks, sub-tasks, sections, structure
        * Does not preserve: dates (adjusted on import), assignees
        * Template description (auto-generated with AI option)
        * Personal template library
        * Share templates with team
      - Template application:
        * Apply to new project during creation
        * Apply to existing project (merges content)
        * Date adjustment: relative to today
        * Overwrite vs merge options
      - Template gallery UI:
        * Search and filter templates
        * Template preview cards with screenshots
        * Use count and rating (if community)
        * "Use template" button
        * "Customize template" before import
    </templates>
  </core_functionality>

  <aesthetic_guidelines>
    <design_principles>
      - Clean, minimalist interface emphasizing content over chrome
      - Generous whitespace for breathing room
      - Consistent 8px spacing grid
      - Subtle shadows and borders for depth
      - Fast, smooth animations (150-250ms)
      - Color used purposefully for hierarchy and status
      - Typography optimized for scanning and reading
      - Mobile-first thinking adapted for desktop
    </design_principles>

    <color_palette>
      <light_theme>
        - Primary background: #ffffff (pure white)
        - Secondary background: #fafafa (very light gray)
        - Sidebar background: #fcfcfc (off-white)
        - Text primary: #202020 (near black)
        - Text secondary: #808080 (medium gray)
        - Text tertiary: #b3b3b3 (light gray)
        - Border: #e8e8e8 (very light gray)
        - Hover: #f5f5f5 (subtle highlight)
        - Selected: #eef2ff (light blue tint)
        - Brand red: #db4c3f (Todoist signature color)
        - Success: #25b84c (green for completed)
        - Warning: #ff9a14 (orange for p2, due soon)
        - Error: #db4c3f (red for overdue, p1)
        - Info: #4073ff (blue for p3)
      </light_theme>
      <dark_theme>
        - Primary background: #1f1f1f (dark gray)
        - Secondary background: #282828 (slightly lighter)
        - Sidebar background: #1a1a1a (darker gray)
        - Text primary: #ffffff (white)
        - Text secondary: #b3b3b3 (light gray)
        - Text tertiary: #808080 (medium gray)
        - Border: #333333 (dark border)
        - Hover: #2d2d2d (subtle highlight)
        - Selected: #1e3a5f (dark blue)
        - Brand red: #ff7066 (lighter red for dark bg)
        - Success: #34d058 (brighter green)
        - Warning: #ffab70 (lighter orange)
        - Error: #ff7066 (lighter red)
        - Info: #5b8def (lighter blue)
      </dark_theme>
      <project_and_label_colors>
        - 20 color palette shared between projects, labels, filters:
        * Berry Red, Red, Orange, Yellow
        * Olive Green, Lime Green, Green, Mint Green
        * Teal, Sky Blue, Light Blue, Blue
        * Grape, Violet, Lavender, Magenta
        * Salmon, Charcoal, Gray, Taupe
        - Each color has light theme and dark theme variants
        - Consistent saturation and brightness levels
        - Accessible contrast ratios (WCAG AA)
      </project_and_label_colors>
    </color_palette>

    <typography>
      - System font stack: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif
      - Base font size: 14px (comfortable for task lists)
      - Line height: 1.5 (readable without excessive spacing)
      - Font weights:
        * Regular (400): body text, task names
        * Medium (500): section headers, buttons
        * Semibold (600): view headers, emphasis
      - Monospace font: 'SF Mono', 'Monaco', 'Courier New', monospace
      - Task name: 14px, line-height 1.4, word wrap
      - Section headers: 12px uppercase, letter-spacing 0.5px, semibold
      - View headers: 24px semibold, line-height 1.2
      - Metadata text: 12px, secondary color
      - Button text: 14px medium
      - Input text: 14px, matches task font
    </typography>

    <component_styling>
      <checkbox>
        - Size: 20x20px circle
        - Border: 2px solid, color based on priority
        - Empty (incomplete): white fill, gray border
        - Hover: border thickens to 3px, accent color
        - Checked: filled with checkmark icon
        - Animation: scale and fade on complete (250ms)
        - Priority colors: p1 red, p2 orange, p3 blue, p4 gray
      </checkbox>

      <task_row>
        - Height: auto (min 40px with padding)
        - Padding: 8px 12px
        - Border bottom: 1px solid border color
        - Hover: background changes to hover color
        - Selected: background with selected color, blue left border (4px)
        - Cursor: pointer on entire row
        - Drag handle: 6 dots icon, appears on hover
        - Checkbox on left (20px + 8px margin)
        - Task content: fills remaining space
        - Metadata on right: dates, labels, icons
      </task_row>

      <buttons>
        - Primary button:
          * Background: brand red
          * Text: white
          * Padding: 8px 16px
          * Border radius: 6px
          * Hover: slightly darker red
          * Active: even darker red with slight scale down
        - Secondary button:
          * Background: secondary background
          * Text: primary text color
          * Border: 1px solid border color
          * Hover: border darkens
        - Ghost button:
          * Background: transparent
          * Text: secondary text
          * Hover: background to hover color
        - Icon buttons:
          * Square or circular
          * 32x32px touch target
          * Icon centered 16x16px
          * Hover: background circle
        - Transitions: all 150ms ease
      </buttons>

      <modals>
        - Overlay: rgba(0,0,0,0.4) backdrop
        - Modal background: primary background
        - Border radius: 12px
        - Shadow: 0 20px 60px rgba(0,0,0,0.3)
        - Padding: 24px
        - Max width varies by modal type:
          * Task detail: 800px
          * Quick add: 500px
          * Settings: 900px
          * Confirmation: 400px
        - Animation: fade in + slight scale (200ms)
        - Click outside to close (most modals)
        - Escape key always closes
      </modals>

      <form_inputs>
        - Height: 40px (single line) or auto (multi-line)
        - Padding: 8px 12px
        - Border: 1px solid border color
        - Border radius: 6px
        - Focus: border changes to brand color, 2px
        - Background: white (light) or secondary bg (dark)
        - Placeholder: tertiary text color
        - Error state: red border and red helper text
        - Disabled: gray background, reduced opacity
      </form_inputs>

      <dropdowns>
        - Trigger button with down arrow icon
        - Popover appears below (or above if no space)
        - Max height: 300px with scroll
        - Items: 36px height, padding 8px 12px
        - Hover: background highlight
        - Selected: checkmark icon on right
        - Search input at top for long lists
        - Keyboard navigation (arrows + Enter)
        - Color preview circles for color pickers
        - Recent items section at top (for projects/labels)
      </dropdowns>

      <badges_and_pills>
        - Count badges:
          * Small circles (18x18px)
          * Background: brand red for notifications
          * Background: gray for counts
          * White text, bold
          * Positioned: absolute top-right of icons
        - Label pills:
          * Height: 24px
          * Padding: 4px 8px
          * Border radius: 12px (fully rounded)
          * Background: label color at 20% opacity
          * Text: label color at full saturation
          * X button on hover to remove
          * Multiple labels wrap to next line
        - Date chips:
          * Height: 28px
          * Padding: 4px 10px
          * Border radius: 6px
          * Color-coded: red (overdue), orange (today), green (future)
          * Calendar icon on left
          * Relative text: "Today", "Tomorrow", "Jan 15"
      </badges_and_pills>

      <sidebar_items>
        - Height: 32px
        - Padding: 6px 12px
        - Border radius: 6px
        - Hover: background to hover color
        - Active: background to selected color, subtle left border
        - Icon on left: 20x20px
        - Text: 14px, truncate with ellipsis
        - Badge on right: count or indicator
        - Indent levels: 20px per level for sub-projects
        - Drag indicator: opacity change when dragging
      </sidebar_items>
    </component_styling>

    <animations>
      - Task completion:
        * Checkbox scale 1.0 → 1.2 → 0 (300ms)
        * Task row fade out (200ms)
        * Slide up to close gap (200ms)
        * Undo toast appears (fade in 150ms)
      - Quick add:
        * Modal: fade + scale from 0.95 to 1.0 (200ms)
        * Close: fade + scale to 0.95 (150ms)
      - Sidebar:
        * Collapse/expand: width transition (250ms ease-in-out)
        * Items: fade when appearing/disappearing (150ms)
      - Drag and drop:
        * Pick up: scale to 1.05 + shadow (100ms)
        * Dragging: cursor changes, semi-transparent
        * Drop: scale back + position snap (200ms)
        * Invalid drop: shake animation (300ms)
      - Notifications:
        * Slide in from top-right (250ms)
        * Auto-dismiss after 5 seconds (fade out)
        * Hover: pause auto-dismiss
      - View transitions:
        * Crossfade between views (200ms)
        * List items stagger in (50ms delay each, max 10 items)
      - Loading states:
        * Skeleton screens for content
        * Spinner for operations (pulsing circle)
        * Progress bars for uploads
    </animations>
  </aesthetic_guidelines>

  <advanced_functionality>
    <productivity_features>
      - Daily goal setting:
        * Set target tasks per day (default 5)
        * Visual progress in productivity pie chart
        * Notification when goal reached
        * Streak tracking for consecutive days
        * Days off configuration (exclude weekends)
      - Weekly goal setting:
        * Set target tasks per week (default 25)
        * Weekly view in productivity
        * Weekly streak tracking
        * Color-coded project breakdown
      - Completed task history:
        * View all completed tasks
        * Filter by date range, project, label
        * Chart showing completion over time
        * Export completed tasks
        * Restore completed task (uncomplete)
      - Productivity charts:
        * Daily completion bar chart (last 7 days)
        * Weekly completion bar chart (last 4 weeks)
        * Color-coded by project
        * Goal line overlaid on charts
        * Hover to see details
        * Export as PNG image
    </productivity_features>

    <task_organization>
      - Manual sorting:
        * Drag and drop to reorder
        * Position persisted per view
        * Works in List and Board layouts
      - Auto-sorting options:
        * By date (earliest first or latest first)
        * By priority (p1 → p4 or reverse)
        * By name (alphabetical A-Z or Z-A)
        * By assignee (grouped by person)
        * By date added (newest or oldest first)
      - Grouping options:
        * By date (today, tomorrow, this week, later)
        * By priority (p1, p2, p3, p4 sections)
        * By project (all projects as sections)
        * By label (group by label)
        * By assignee (in team projects)
        * No grouping (flat list)
      - Filtering within views:
        * Show only: assigned to me, unassigned, specific person
        * View completed: on/off toggle
        * Sub-tasks: show inline or hide
        * Recurring: show future occurrences or not
      - Smart lists:
        * No date: tasks without due dates
        * Assigned to me: all your assignments
        * Created by me: tasks you added
        * All tasks: everything across projects
    </smart_lists>

    <integrations>
      - Email integration:
        * Forward email to task (unique email address per project)
        * Subject becomes task name
        * Body becomes description/comment
        * Attachments preserved
        * Reply to comment by email
      - Calendar integration:
        * Export project as iCal feed
        * Subscribe in Google Calendar, Apple Calendar
        * Two-way sync (paid feature)
        * See calendar events in Todoist Calendar view
        * Add tasks to calendar as events
      - Browser extensions:
        * Save webpage as task (Chrome, Firefox, Safari)
        * Context menu: "Add to Todoist"
        * Captures URL, title, selection
        * Quick add from extension popup
      - Automation (Zapier/IFTTT):
        * Triggers: new task, completed task, project created
        * Actions: create task, complete task, add comment
        * Common recipes: email to task, RSS to task
      - Third-party apps:
        * API for developers
        * Webhooks for real-time events
        * OAuth authentication
        * Rate limiting and quotas
    </integrations>

    <themes_and_appearance>
      - Built-in themes:
        * Todoist (default red and white)
        * Dark (dark gray backgrounds)
        * Moonstone (blue-gray tones)
        * Tangerine (orange accents)
        * Kale (green tones) - Pro only
        * Blueberry (blue tones) - Pro only
        * Lavender (purple tones) - Pro only
        * Raspberry (pink tones) - Pro only
      - Theme settings:
        * Select theme from gallery
        * Preview before applying
        * Sync theme across devices (toggle)
        * Auto dark mode (follow system preference)
      - Mystery theme:
        * Unlocked at Karma Enlightened
        * Special visual treatment
        * Exclusive to achievers
      - Customization:
        * Accent color picker (applies to links, buttons)
        * Compact density mode (smaller spacing)
        * Font size scaling (small, medium, large)
        * Show/hide sidebar icons
        * Show/hide task counts
    </themes_and_appearance>

    <smart_features>
      - Smart date recognition:
        * Auto-detects dates while typing
        * Highlights recognized dates in orange
        * Click to disable recognition
        * Setting to turn off globally
        * Handles ambiguity (prefers later occurrence)
      - Smart scheduling suggestions:
        * "Pick a date" shows intelligent suggestions
        * This Evening (6pm today)
        * Tomorrow Morning (9am)
        * This Weekend (Saturday)
        * Next Week (Monday)
        * Adjusts based on current time
      - Postpone shortcuts:
        * Right-click task → Tomorrow
        * Right-click task → Next Week
        * Right-click task → Pick a Date
        * Keyboard: T key for scheduler
      - Duplicate detection:
        * Warns when task name matches existing
        * "Did you mean to create this task?" prompt
        * Option to open existing or create anyway
      - Smart Inbox processing:
        * Suggests projects based on task content
        * One-click to move and classify
        * Batch process multiple tasks
        * "Process Inbox" workflow mode
    </smart_features>

    <accessibility>
      - Full keyboard navigation for all features
      - Screen reader support with ARIA labels
      - Focus indicators on all interactive elements
      - Tab order follows logical flow
      - Skip to content links
      - High contrast mode (respects system setting)
      - Reduced motion option for animations
      - Adjustable font sizes (100-150%)
      - Alt text for icons and images
      - Semantic HTML structure
      - Form labels and error messages
      - Keyboard shortcut for accessibility menu
    </accessibility>
  </advanced_functionality>

  <final_integration_test>
    <test_scenario_1>
      <description>First-Time User Onboarding and Task Creation</description>
      <steps>
        1. Launch AntTodo application
        2. Create new account (name, email, password)
        3. Complete brief onboarding tour
        4. See empty Inbox view with welcome message
        5. Click "Add task" or press Q
        6. Type "Call mom tomorrow at 2pm p1 @personal"
        7. Verify highlighting: date (orange), priority (red flag), label (purple)
        8. Press Enter to create task
        9. Verify task appears in Inbox with all attributes
        10. Open Today view, verify task appears tomorrow section
        11. Complete task by clicking checkbox
        12. Verify completion animation and Karma points earned
        13. Check productivity pie chart shows 1/5 tasks
      </steps>
    </test_scenario_1>

    <test_scenario_2>
      <description>Project Organization and Recurring Tasks</description>
      <steps>
        1. Create new project "Work" with red color
        2. Select Board layout
        3. Add sections: "To Do", "In Progress", "Done"
        4. Add task "Weekly status report every Friday at 4pm"
        5. Verify recurrence pattern recognized
        6. Add task to "To Do" section
        7. Create sub-project "Client A" under Work
        8. Verify hierarchy in sidebar with indent
        9. Add task with sub-tasks structure
        10. Test drag-and-drop task between sections
        11. Complete recurring task
        12. Verify next occurrence created automatically (next Friday)
        13. Check original task moved to completed
      </steps>
    </test_scenario_2>

    <test_scenario_3>
      <description>Filters and Advanced Queries</description>
      <steps>
        1. Create several tasks with various attributes
        2. Navigate to Filters & Labels
        3. Click "+ Add filter"
        4. Name filter "High Priority Work"
        5. Enter query: "#Work & (today | overdue) & (p1 | p2)"
        6. Verify preview shows matching tasks
        7. Pick purple color for filter
        8. Add to favorites
        9. Click filter in sidebar
        10. Verify only matching tasks appear
        11. Test filter layout switching (List → Board)
        12. Create label @urgent with red color
        13. Add @urgent to several tasks
        14. Click label to view all labeled tasks
      </steps>
    </test_scenario_3>

    <test_scenario_4>
      <description>Today and Upcoming Views with Scheduling</description>
      <steps>
        1. Add tasks with various due dates
        2. Open Today view
        3. Verify only today's tasks appear
        4. Verify overdue section at top (if applicable)
        5. Verify tasks sorted by priority (p1 first)
        6. Right-click task, select "Tomorrow"
        7. Verify task disappears from Today
        8. Open Upcoming view
        9. Verify tasks grouped by date
        10. Use week picker to navigate to next week
        11. Switch to Calendar layout
        12. Drag unscheduled task from Plan sidebar to calendar
        13. Resize task block to set duration
        14. Verify time and duration saved
      </steps>
    </test_scenario_4>

    <test_scenario_5>
      <description>Sub-tasks and Task Detail View</description>
      <steps>
        1. Create task "Launch product"
        2. Click task to open detail view
        3. Add description with markdown formatting
        4. Add sub-task "Create landing page"
        5. Add sub-task "Set up analytics"
        6. Add sub-task "Prepare launch email"
        7. Verify progress indicator shows 0/3
        8. Set priority p1 for parent task
        9. Set different due dates for each sub-task
        10. Complete one sub-task
        11. Verify progress updates to 1/3
        12. Test "Hide completed" toggle
        13. Add comment with file attachment
        14. Test @ mention autocomplete
      </steps>
    </test_scenario_5>

    <test_scenario_6>
      <description>Keyboard Shortcuts and Power User Features</description>
      <steps>
        1. Press Q to open Quick Add
        2. Type task with natural language
        3. Press Cmd+Enter to add and add another
        4. Press Escape to close
        5. Press Cmd+K to open command palette
        6. Type "today" and press Enter
        7. Verify Today view opens
        8. Press J/K to navigate tasks
        9. Press E to complete selected task
        10. Press T to schedule selected task
        11. Use G then U to navigate to Upcoming
        12. Press ? to view keyboard shortcuts reference
        13. Test Cmd+\ to toggle sidebar
        14. Verify all shortcuts work as expected
      </steps>
    </test_scenario_6>

    <test_scenario_7>
      <description>Karma System and Productivity Tracking</description>
      <steps>
        1. Navigate to Productivity view
        2. Set daily goal to 5 tasks
        3. Set weekly goal to 25 tasks
        4. Select days off (Saturday, Sunday)
        5. Complete 5 tasks in one day
        6. Verify daily goal achievement notification
        7. Check Karma points increased
        8. Verify streak started (1 day)
        9. Check productivity chart updated
        10. Complete tasks next day to maintain streak
        11. Verify streak incremented to 2 days
        12. Skip a day, verify streak breaks
        13. Enable vacation mode
        14. Verify streak preserved during vacation
      </steps>
    </test_scenario_7>

    <test_scenario_8>
      <description>Collaboration and Team Features</description>
      <steps>
        1. Create team workspace "Acme Corp"
        2. Invite team member via email
        3. Create team project "Marketing Campaign"
        4. Add sections and tasks
        5. Assign task to team member
        6. Verify assignee receives notification
        7. Team member adds comment on assigned task
        8. Verify notification for comment mention
        9. Upload file attachment to task
        10. Test file download and preview
        11. Create restricted project (admin only)
        12. Verify members can't see restricted project
        13. Check activity log shows all team actions
        14. Test filtering: "assigned to: me" in team project
      </steps>
    </test_scenario_8>

    <test_scenario_9>
      <description>Templates and Bulk Operations</description>
      <steps>
        1. Create project with sections and tasks
        2. Right-click project, "Save as template"
        3. Name template "Sprint Planning"
        4. Add description for template
        5. Navigate to template gallery
        6. Find custom template
        7. Click "Use template"
        8. Create new project from template
        9. Verify all structure copied
        10. Verify dates adjusted to today/this week
        11. Test batch operations: select 5 tasks
        12. Bulk reschedule to next week
        13. Bulk add label @waiting
        14. Bulk change priority to p2
      </steps>
    </test_scenario_9>

    <test_scenario_10>
      <description>Search, Favorites, and Navigation</description>
      <steps>
        1. Press Cmd+/ to open search
        2. Type "meeting" to search
        3. Verify relevant tasks appear
        4. Filter results to only #Work project
        5. Click result to open task detail
        6. Create filter for common query
        7. Add filter to favorites
        8. Add important project to favorites
        9. Verify favorites section in sidebar
        10. Drag to reorder favorites
        11. Test Quick Switcher (Cmd+O)
        12. Type project name with fuzzy matching
        13. Verify recent items appear first
        14. Navigate between views using G shortcuts
      </steps>
    </test_scenario_10>

    <test_scenario_11>
      <description>Reminders and Notifications</description>
      <steps>
        1. Create task with date and time
        2. Verify automatic reminder scheduled (30min before)
        3. Add custom reminder "1 hour before"
        4. Add recurring reminder "every day at 8am"
        5. Wait for reminder notification (or simulate)
        6. Verify desktop notification appears
        7. Click notification to open task
        8. Test snooze functionality (10 minutes)
        9. Configure notification settings (email on/off)
        10. Test notification for assignment
        11. Test notification for comment mention
        12. Verify notification center shows all
        13. Mark notification as read
        14. Test "Do Not Disturb" hours
      </steps>
    </test_scenario_11>

    <test_scenario_12>
      <description>Themes and Customization</description>
      <steps>
        1. Open Settings (Cmd+,)
        2. Navigate to Theme section
        3. Preview Dark theme
        4. Apply Dark theme
        5. Verify all UI updates immediately
        6. Test auto dark mode (follow system)
        7. Change system appearance
        8. Verify AntTodo matches system
        9. Try different theme (Lavender)
        10. Toggle sync theme across devices
        11. Customize Quick Add action buttons
        12. Reorder actions and hide some
        13. Test customized Quick Add
        14. Reset Quick Add to defaults
      </steps>
    </test_scenario_12>
  </final_integration_test>

  <success_criteria>
    <functionality>
      - All task operations work: create, complete, edit, delete, reschedule
      - Natural language parsing accurate for dates, recurring patterns
      - Filters execute correctly with complex queries
      - Karma system calculates points and levels accurately
      - Recurring tasks reschedule properly on completion
      - Search returns relevant results quickly (under 100ms)
      - Reminders fire at correct times
      - Multi-device sync keeps data consistent
      - Collaboration features work smoothly (assign, comment, share)
      - No data loss under normal operation
    </functionality>

    <user_experience>
      - Task entry feels fast and effortless
      - Natural language parsing feels magical and helpful
      - Views load instantly (under 200ms)
      - Keyboard shortcuts make power users efficient
      - UI stays out of the way during task entry
      - Clear visual hierarchy guides attention
      - Animations enhance rather than distract
      - Error messages are helpful and actionable
      - Empty states encourage next actions
      - Native macOS feel with standard patterns
    </user_experience>

    <technical_quality>
      - Clean, modular code architecture
      - Efficient database queries with proper indexes
      - Optimistic UI updates (instant feedback)
      - Background sync without blocking UI
      - Graceful error handling throughout
      - Memory usage scales reasonably (under 300MB for 10k tasks)
      - Fast startup time (under 2 seconds)
      - No memory leaks during extended use
      - Automated tests for critical features
      - Type safety with TypeScript (optional)
    </technical_quality>

    <visual_design>
      - Professional, modern aesthetic matching Todoist
      - Consistent spacing using 8px grid
      - Beautiful typography with proper hierarchy
      - Smooth, purposeful animations
      - Excellent color contrast (WCAG AA minimum)
      - Both light and dark themes polished
      - All interactive elements have clear hover states
      - No visual bugs or alignment issues
      - Icons consistent in style and size
      - Loading states and empty states well-designed
    </visual_design>

    <performance_benchmarks>
      - Handle 10,000+ tasks without slowdown
      - Create/complete task in under 50ms
      - Search results in under 100ms
      - View switching in under 200ms
      - Sync completion in under 3 seconds
      - Startup time under 2 seconds
      - Memory usage under 300MB typical
      - Smooth animations at 60fps
      - No UI freezing during intensive operations
      - Database queries optimized with indexes
    </performance_benchmarks>
  </success_criteria>

  <deployment>
    <mac_application>
      - Build with Electron Builder
      - Create .app bundle with code signing
      - DMG installer with background image
      - App icon (1024x1024 source, all sizes generated)
      - Info.plist metadata:
        * Bundle ID: com.anttodo.app
        * Display name: AntTodo
        * Version: semantic versioning
        * Copyright notice
        * URL scheme: anttodo://
      - Native menu bar:
        * Application menu (About, Preferences, Quit)
        * File menu (New Task, New Project, Print)
        * Edit menu (Undo, Cut, Copy, Paste, Select All)
        * View menu (Toggle Sidebar, Layouts, Zoom)
        * Go menu (Inbox, Today, Upcoming, Projects)
        * Window menu (Minimize, Zoom, Bring All to Front)
        * Help menu (Keyboard Shortcuts, Documentation, Report Issue)
      - Dock icon:
        * Badge count for overdue tasks
        * Right-click menu for quick actions
        * Bounce animation for notifications
      - Touch Bar support (if applicable)
      - System notifications
      - File associations (optional .todoist files)
      - Spotlight integration for search
      - Quick Look support for templates
    </mac_application>

    <distribution>
      - Direct download from website
      - Mac App Store distribution (optional)
      - Auto-update mechanism:
        * Check for updates on launch
        * Download in background
        * Prompt to install on quit
        * Release notes in update dialog
      - Beta channel for testing
      - Crash reporting (Sentry or similar)
      - Usage analytics (opt-in)
      - Support for macOS 11.0+ (Big Sur and later)
    </distribution>
  </deployment>

  <key_implementation_notes>
    <critical_paths>
      - Natural language parsing is THE killer feature - must be accurate
      - Recurring task scheduling algorithm must handle edge cases
      - Filter query engine is complex - build parser carefully
      - Karma system calculations need to be precise for user trust
      - Sync engine must prevent conflicts and data loss
      - Database schema must support efficient queries at scale
      - UI performance critical for perception of speed
    </critical_paths>

    <recommended_implementation_order>
      1. Core Electron app with basic window
      2. SQLite database schema and models
      3. Task CRUD operations (create, read, update, delete)
      4. Inbox and Today views with list layout
      5. Natural language date parsing with Chrono.js
      6. Quick Add modal with parsing highlights
      7. Projects and sections system
      8. Labels and priorities
      9. Filter query engine and custom filters
      10. Upcoming view with date grouping
      11. Board and Calendar layouts
      12. Sub-tasks and task detail view
      13. Recurring task engine
      14. Comments and attachments
      15. Search with MiniSearch
      16. Karma system and productivity tracking
      17. Reminders and notifications
      18. Collaboration and team features
      19. Themes and appearance
      20. Keyboard shortcuts throughout
      21. Polish, animations, empty states
      22. Performance optimization and testing
    </recommended_implementation_order>

    <technical_challenges>
      - Natural language parsing accuracy:
        * Chrono.js handles most cases well
        * Need custom rules for Todoist-specific syntax
        * Handle ambiguous dates ("Monday" = next Monday or this Monday?)
        * Multiple date mentions in one task (use last one)
      - Recurring task algorithm:
        * Complex patterns like "every 3rd Tuesday"
        * "every" vs "every!" (due date vs completion date based)
        * Skipping past dates when overdue
        * Ending conditions (date or count)
        * Preserving time across occurrences
      - Filter query parser:
        * Build AST from query string
        * Support Boolean operators with precedence
        * Handle parentheses grouping
        * Date range evaluation
        * Fuzzy matching for project/label names
        * Performance with complex queries
      - Karma calculation:
        * Track all point-earning actions
        * Deduct points for overdue tasks (4+ days)
        * Calculate streaks correctly (handle days off)
        * Update in real-time as tasks complete
        * Historical data for trends
      - Sync conflicts:
        * Last-write-wins for simple fields
        * Merge strategies for complex fields (comments)
        * Conflict detection and resolution UI
        * Offline queue for pending changes
        * Optimistic updates for responsiveness
    </technical_challenges>

    <testing_strategy>
      - Unit tests:
        * Date parsing with variety of inputs
        * Recurrence calculation edge cases
        * Filter query parsing and execution
        * Karma point calculations
        * Sort and group algorithms
      - Integration tests:
        * Task lifecycle (create → complete → archive)
        * Project operations with nested tasks
        * Filter queries across full dataset
        * Sync operations and conflict resolution
      - Performance tests:
        * Load testing with 10k tasks
        * Query performance benchmarks
        * Memory leak detection
        * Animation frame rates
      - User acceptance testing:
        * Real workflows with actual users
        * Onboarding new user experience
        * Power user keyboard-driven usage
        * Team collaboration scenarios
      - Cross-platform testing (if expanding beyond Mac):
        * Windows, Linux versions
        * Mobile apps (iOS, Android)
        * Web application
    </testing_strategy>

    <data_model_considerations>
      - Task hierarchy:
        * Parent-child relationships for sub-tasks
        * 4 indent levels maximum
        * Recursive queries for tree operations
        * Completion status propagation
      - Date handling:
        * Store as UTC timestamps
        * Display in user's timezone
        * All-day vs timed tasks (different storage)
        * Recurrence as RRULE-like string
        * Separate deadline from due date
      - Soft deletes:
        * Don't permanently delete tasks
        * Mark as deleted with timestamp
        * Allow restore within 30 days
        * Permanent purge after 30 days
      - Optimistic locking:
        * Version number per record
        * Detect concurrent modifications
        * Conflict resolution strategy
      - Indexes for performance:
        * tasks(project_id, due_date)
        * tasks(assignee_id, completed)
        * tasks(deleted, due_date)
        * projects(parent_id)
        * labels(name)
        * Full-text index on task names
    </data_model_considerations>
  </key_implementation_notes>

  <natural_language_examples>
    <date_parsing_examples>
      - "tomorrow" → next day at user's default time
      - "next Monday" → next Monday (not today if today is Monday)
      - "Jan 15" → January 15 of current year (or next year if past)
      - "3 days" → 3 days from today
      - "in 2 weeks" → 14 days from today
      - "every Monday" → recurring weekly on Monday
      - "every 2 weeks on Friday" → biweekly on Friday
      - "every month on the 15th" → monthly recurring
      - "every last Friday" → last Friday of each month
      - "every 3 months starting Jan 1" → quarterly
      - "every weekday" → Monday through Friday
      - "every weekend" → Saturday and Sunday
      - "every! 3 days" → every 3 days from completion
      - "tomorrow at 9am for 2 hours" → with time and duration
    </date_parsing_examples>
    <task_quick_add_examples>
      - "Email client proposal tomorrow p1 @work"
        * Task: "Email client proposal"
        * Date: tomorrow
        * Priority: p1
        * Label: @work
      - "Team meeting Friday at 2pm #Work /Meetings +Alice"
        * Task: "Team meeting"
        * Date: Friday at 2pm
        * Project: Work
        * Section: Meetings
        * Assignee: Alice
      - "Buy milk @shopping @quick every Saturday"
        * Task: "Buy milk"
        * Labels: @shopping, @quick
        * Recurrence: every Saturday
      - "Write report every Monday at 9am for 3 hours {Friday}"
        * Task: "Write report"
        * Recurrence: every Monday at 9am
        * Duration: 3 hours
        * Deadline: Friday
    </task_quick_add_examples>
  </natural_language_examples>

  <design_references>
    - Todoist's signature minimalism: focus on task content
    - Generous whitespace for calm, organized feeling
    - Color used to communicate meaning (red = urgent, gray = completed)
    - Subtle animations for delight without distraction
    - Consistent interaction patterns (click, drag, keyboard)
    - Progressive disclosure (advanced features hidden until needed)
    - Fast feedback for all actions (optimistic updates)
    - Empty states that guide users to next action
    - Contextual help text throughout
    - Beauty in simplicity and restraint
  </design_references>

</project_specification>
