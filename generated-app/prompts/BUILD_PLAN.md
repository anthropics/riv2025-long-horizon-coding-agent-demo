<project_specification>
  <project_name>Canopy - Full Featured Project Management Application</project_name>

  <overview>
    Build a fully functional JIRA-like project management application with issues, sprints, Kanban boards, epics,
    dashboards, and powerful filtering. The application runs entirely in the browser with no server required,
    using IndexedDB for persistence.

    Canopy helps teams manage software projects with agile methodologies. Users can create projects, manage
    backlogs, plan sprints, track issues on Kanban boards, and visualize progress through dashboards and reports.
    The interface should feel professional and polished, with a distinctive forest-inspired color palette that
    avoids typical AI-generated aesthetics.

    CRITICAL: This is a pure static web application. There is NO server, NO backend, NO API endpoints.
    All data lives in the browser's IndexedDB. The built output (`npm run build`) produces static HTML, CSS,
    and JS files in the dist/ folder. Deployment is handled separately via CI/CD.
  </overview>

  <technology_stack>
    <frontend_application>
      <framework>React 18 for component-based UI development</framework>
      <build_tool>Vite 6 for fast dev server and optimized static builds</build_tool>
      <styling>Tailwind CSS v4 for utility-first styling (using @tailwindcss/vite plugin)</styling>
      <routing>React Router v7 for client-side navigation</routing>
      <state_management>React Context + useReducer for complex state, Dexie for persistent state</state_management>
    </frontend_application>
    <data_layer>
      <database>Dexie.js v4 wrapping IndexedDB for structured data persistence</database>
      <reactive_queries>useLiveQuery() hook for reactive data that auto-updates across tabs</reactive_queries>
      <note>NO server, NO SQLite, NO API - all data lives in browser IndexedDB</note>
      <export>JSON export/import for data portability and backup</export>
      <search>MiniSearch for fast client-side full-text search with BM25 ranking</search>
    </data_layer>
    <build_output>
      <build_command>`npm run build` produces static `dist/` folder</build_command>
      <output>HTML, CSS, JS files only - no server runtime needed</output>
      <note>Deployment handled via CI/CD pipeline, not by the agent</note>
    </build_output>
    <libraries>
      <dnd>@dnd-kit/core v6.3.1 + @dnd-kit/sortable for drag-and-drop Kanban boards</dnd>
      <charts>Recharts v3.5 for dashboard visualizations (burndown, velocity, pie charts)</charts>
      <dates>date-fns v4 for date handling and formatting</dates>
      <icons>Lucide React for consistent iconography</icons>
      <ids>uuid v11 for generating unique identifiers</ids>
      <markdown>React Markdown for rich text descriptions</markdown>
    </libraries>
  </technology_stack>

  <prerequisites>
    <environment_setup>
      - Node.js 20+ installed for development
      - pnpm or npm for package management
      - Modern browser with IndexedDB support (Chrome, Firefox, Safari, Edge)
    </environment_setup>
    <build_configuration>
      - Vite configured for static build output
      - Tailwind CSS v4 with @tailwindcss/vite plugin
      - React Router configured for client-side routing
      - Build output optimized for CDN delivery (code splitting, minification)
      - Source maps for debugging (optional in production)
    </build_configuration>
  </prerequisites>

  <core_data_entities>
    <projects>
      - id: string (uuid)
      - key: string (unique project key like "CAN", "PROJ", max 10 chars uppercase)
      - name: string (required, max 100 characters)
      - description: string (optional, markdown supported)
      - leadUserId: string (project lead)
      - defaultAssigneeId: string (optional, auto-assign new issues)
      - issueCounter: number (for generating issue keys like CAN-123)
      - createdAt: Date
      - updatedAt: Date
      - color: string (hex color for visual identification)
      - icon: string (emoji or icon name)
      - isArchived: boolean
      - settings: object (workflow customization, permissions)
    </projects>

    <issues>
      - id: string (uuid)
      - projectId: string (required, references project)
      - key: string (generated, e.g., "CAN-123")
      - type: enum (Story, Bug, Task, Epic, Sub-task)
      - status: string (references board column, e.g., "todo", "in-progress", "done")
      - summary: string (required, max 255 characters, the issue title)
      - description: string (optional, markdown supported, rich text)
      - priority: enum (Highest, High, Medium, Low, Lowest)
      - reporterId: string (who created the issue)
      - assigneeId: string (optional, who is working on it)
      - epicId: string (optional, parent epic for Stories/Tasks/Bugs)
      - parentId: string (optional, parent issue for Sub-tasks)
      - sprintId: string (optional, which sprint the issue is in)
      - storyPoints: number (optional, for estimation, 0.5-100)
      - labels: string[] (array of label IDs)
      - components: string[] (array of component IDs)
      - dueDate: Date (optional)
      - createdAt: Date
      - updatedAt: Date
      - resolvedAt: Date (optional, when marked done)
      - sortOrder: number (for manual ordering within columns/backlog)
      - timeEstimate: number (minutes, optional)
      - timeSpent: number (minutes, optional, logged work)
    </issues>

    <sprints>
      - id: string (uuid)
      - projectId: string (required)
      - name: string (required, e.g., "Sprint 1", "Sprint 23")
      - goal: string (optional, sprint objective)
      - startDate: Date (optional, when sprint starts)
      - endDate: Date (optional, when sprint ends)
      - status: enum (future, active, completed)
      - createdAt: Date
      - completedAt: Date (optional)
      - velocity: number (calculated story points completed)
    </sprints>

    <boards>
      - id: string (uuid)
      - projectId: string (required)
      - name: string (default "Board", can have multiple boards per project)
      - columns: array of column objects:
        * id: string
        * name: string (e.g., "To Do", "In Progress", "Done")
        * statusCategory: enum (todo, in_progress, done)
        * sortOrder: number
        * wipLimit: number (optional, work-in-progress limit)
        * color: string (optional, column header color)
      - filterQuery: string (optional, JQL-like filter for board)
      - swimlaneBy: enum (none, assignee, epic, priority)
    </boards>

    <users>
      - id: string (uuid)
      - name: string (required, display name)
      - email: string (required, for identification)
      - avatarUrl: string (optional, or use initials)
      - color: string (avatar background color)
      - role: enum (admin, member, viewer)
      - createdAt: Date
      - settings: object (theme preference, notification settings)
    </users>

    <labels>
      - id: string (uuid)
      - projectId: string (required)
      - name: string (required, e.g., "frontend", "urgent", "tech-debt")
      - color: string (hex color)
      - description: string (optional)
    </labels>

    <components>
      - id: string (uuid)
      - projectId: string (required)
      - name: string (required, e.g., "API", "UI", "Database")
      - description: string (optional)
      - leadUserId: string (optional, component owner)
    </components>

    <comments>
      - id: string (uuid)
      - issueId: string (required)
      - authorId: string (required)
      - body: string (required, markdown supported)
      - createdAt: Date
      - updatedAt: Date
      - isEdited: boolean
    </comments>

    <activity_log>
      - id: string (uuid)
      - issueId: string (required)
      - userId: string (who performed action)
      - action: string (e.g., "status_changed", "assigned", "comment_added")
      - field: string (optional, which field changed)
      - fromValue: string (optional, previous value)
      - toValue: string (optional, new value)
      - timestamp: Date
    </activity_log>

    <filters>
      - id: string (uuid)
      - projectId: string (optional, null for global filters)
      - name: string (required)
      - query: string (JQL-like query string)
      - ownerId: string (who created it)
      - isShared: boolean (visible to all users)
      - isFavorite: boolean
      - createdAt: Date
    </filters>

    <custom_fields>
      - id: string (uuid)
      - projectId: string (required)
      - name: string (required)
      - type: enum (text, number, date, select, multiselect, user)
      - options: string[] (for select/multiselect types)
      - isRequired: boolean
      - sortOrder: number
    </custom_fields>
  </core_data_entities>

  <pages_and_interfaces>
    <global_layout>
      <top_navigation>
        - Height: 56px fixed header
        - Left side elements:
          * App logo/icon "Canopy" with leaf icon (links to home)
          * Global search input (Cmd+K to focus) with icon
        - Center elements:
          * Project selector dropdown (shows current project, quick switch)
          * Create button "+ Create" (primary action, opens issue create modal)
        - Right side elements:
          * Filter/saved searches icon
          * Notifications bell (future feature placeholder)
          * User avatar dropdown (profile, settings, theme toggle, logout)
        - Background: primary forest green (#1B4332) with white text
        - Sticky on scroll
      </top_navigation>

      <sidebar>
        - Width: 240px, collapsible to 60px (icons only)
        - Toggle with Cmd+[ or hamburger icon
        - Sections for current project:
          * Planning section header
            - Roadmap (timeline view)
            - Backlog (prioritized list)
            - Active Sprints (current work)
          * Board section header
            - Board (Kanban view)
          * Reports section header
            - Burndown Chart
            - Velocity Chart
            - Sprint Report
          * Project section header
            - Project Settings
            - Components
            - Labels
        - Bottom section:
          * All Projects link
          * Create Project button
          * Collapse sidebar toggle
        - Active item has accent background (#D4A373 at 20% opacity)
        - Hover state on items
        - Icons use Lucide React, 20x20px
        - Smooth collapse animation (200ms)
      </sidebar>

      <main_content>
        - Fills remaining space (fluid width)
        - Scrollable independently
        - Padding: 24px
        - Max content width: 1400px (centered on large screens)
        - Background: warm off-white (#FAF9F6)
      </main_content>
    </global_layout>

    <home_dashboard>
      - Landing page when no project selected
      - Shows:
        * Recent projects (cards with name, key, issue count)
        * Assigned to me (issues across all projects)
        * Recent activity feed
        * Quick stats (total issues, open, resolved this week)
      - "Create Project" prominent CTA if no projects exist
      - Welcome message for first-time users
    </home_dashboard>

    <project_selector>
      - Dropdown in header
      - Search input at top to filter projects
      - Shows: project icon, name, key
      - Recently viewed projects first
      - "View all projects" link at bottom
      - "Create new project" option
      - Keyboard navigation (arrow keys + Enter)
    </project_selector>

    <backlog_view>
      <header>
        - View title: "Backlog"
        - Sprint planning button (opens sprint planning mode)
        - Filter input (quick filter by text)
        - Create issue button (inline or modal)
        - Group by dropdown (None, Epic, Assignee, Priority)
        - Bulk actions when items selected
      </header>

      <sprint_sections>
        - Active/Future sprints shown at top as collapsible sections
        - Each sprint section shows:
          * Sprint name (editable inline)
          * Date range (start - end)
          * Story points: X of Y completed
          * Issue count
          * "Start Sprint" / "Complete Sprint" actions
          * Collapse/expand toggle
        - Issues within sprint are draggable
        - Drop zone highlights when dragging
      </sprint_sections>

      <backlog_section>
        - "Backlog" header with issue count
        - Story points total
        - All unscheduled issues
        - Drag issues up/down to prioritize
        - Drag issues into sprint sections to plan
        - Right-click context menu on issues
      </backlog_section>

      <issue_row>
        - Height: 40px minimum
        - Checkbox for bulk select (on hover or always visible)
        - Issue type icon (colored by type)
        - Issue key (e.g., "CAN-123", clickable to open detail)
        - Summary text (truncated with ellipsis)
        - Story points badge (if set)
        - Priority icon (arrow up/down, colored)
        - Labels (colored pills, max 2 visible + "+N more")
        - Assignee avatar (small, 24px)
        - Due date (if set, colored if overdue)
        - Drag handle (6 dots, appears on hover)
        - Hover: subtle background change
        - Selected: accent color left border
      </issue_row>

      <empty_state>
        - "Your backlog is empty"
        - "Create your first issue to get started"
        - Create issue button
        - Illustration (simple, minimal)
      </empty_state>
    </backlog_view>

    <board_view>
      <header>
        - View title: "Board" (or custom board name)
        - Active sprint selector (if multiple sprints)
        - Quick filter input
        - Filter dropdown (Assignee, Type, Priority, Label)
        - Swimlane toggle (None, Assignee, Epic)
        - Board settings (gear icon)
        - Fullscreen toggle
      </header>

      <kanban_board>
        - Horizontal scrolling container for columns
        - Column width: 300px fixed
        - Column gap: 16px
        - Each column:
          * Header with name and issue count
          * WIP limit indicator (if set, red when exceeded)
          * Add issue button (+ icon in header)
          * Scrollable issue card container
          * Drop zone styling when dragging over
        - Default columns: "To Do", "In Progress", "In Review", "Done"
        - Configurable columns per board
      </kanban_board>

      <issue_card>
        - Width: fills column (300px - padding)
        - Padding: 12px
        - Background: white
        - Border radius: 8px
        - Shadow: subtle (0 1px 3px rgba(0,0,0,0.1))
        - Content:
          * Issue type icon + Issue key (small, gray text)
          * Summary (2 lines max, truncate)
          * Story points badge (bottom left, if set)
          * Labels (small colored dots or pills, max 3)
          * Bottom row: assignee avatar + due date/flags
        - Hover: lift effect (shadow increase)
        - Dragging: elevated shadow, slight rotation
        - Click: opens issue detail panel
        - Keyboard: Enter to open, Space to select
      </issue_card>

      <swimlanes>
        - Horizontal dividers grouping cards
        - Swimlane header: grouping value (user name, epic name)
        - Collapse/expand individual swimlanes
        - "Unassigned" / "No Epic" section
        - Swimlane issue count
      </swimlanes>

      <column_actions>
        - Add issue at top or bottom
        - Edit column name (click to edit)
        - Set WIP limit
        - Clear done items (archive)
        - Delete column (with confirmation)
      </column_actions>
    </board_view>

    <issue_detail_panel>
      <layout>
        - Slide-in panel from right (width: 680px)
        - OR modal overlay for smaller screens
        - Header with close button (X) and breadcrumb
        - Scrollable content area
        - Sticky action bar at bottom (optional)
      </layout>

      <header>
        - Issue type icon (with dropdown to change type)
        - Issue key "CAN-123" (clickable to copy link)
        - Actions: Watch, Share, More (dropdown: move, clone, delete)
        - Close button
      </header>

      <main_content>
        - Summary field (large, editable, auto-focus on new)
        - Status dropdown (with transition animation)
        - Description field:
          * Markdown editor with preview toggle
          * Toolbar: bold, italic, code, link, list, image
          * Placeholder: "Add a description..."
          * Auto-save on blur
        - Child issues section (for Epics):
          * List of linked stories/tasks/bugs
          * Progress bar (X of Y done)
          * "Link issue" button
        - Sub-tasks section (for Stories/Tasks/Bugs):
          * Inline sub-task list
          * Checkbox to complete
          * "Add sub-task" input
          * Progress indicator
        - Activity section:
          * Tabs: All, Comments, History
          * Comment input with markdown support
          * Activity feed (newest first or oldest first toggle)
          * @ mentions with user autocomplete
      </main_content>

      <detail_sidebar>
        - Width: 200px, right side of panel
        - Fields (each with label and value):
          * Assignee (avatar + name, dropdown to change)
          * Reporter (avatar + name, usually read-only)
          * Priority (icon + text, dropdown)
          * Labels (pills, multi-select dropdown)
          * Sprint (dropdown to move between sprints)
          * Epic (dropdown to link/unlink)
          * Story Points (number input)
          * Due Date (date picker)
          * Components (multi-select)
          * Time Tracking:
            - Estimate (e.g., "2h", "1d")
            - Time Spent (e.g., "3h 30m")
            - Log work button
        - Custom fields section (if any defined)
        - Created/Updated timestamps at bottom
      </detail_sidebar>

      <keyboard_shortcuts>
        - Escape: close panel
        - E: edit summary
        - M: assign to me
        - A: open assignee dropdown
        - L: open labels dropdown
        - P: open priority dropdown
        - C: focus comment input
      </keyboard_shortcuts>
    </issue_detail_panel>

    <create_issue_modal>
      - Modal overlay (500px width)
      - Form fields:
        * Project selector (if not in project context)
        * Issue type dropdown (Story, Bug, Task, Sub-task)
        * Summary input (required, auto-focus)
        * Description (markdown editor, collapsible)
        * Assignee dropdown
        * Priority dropdown (default: Medium)
        * Labels multi-select
        * Sprint dropdown
        * Epic dropdown (for linking)
        * Story points input
        * Due date picker
      - Actions:
        * "Create" button (primary)
        * "Create another" checkbox
        * Cancel button
      - Keyboard: Cmd+Enter to submit
      - Validation: Summary required, show inline errors
    </create_issue_modal>

    <sprint_planning_view>
      <layout>
        - Split view: left = backlog, right = sprint
        - Resizable divider
        - Or tabbed view on smaller screens
      </layout>

      <sprint_selector>
        - Dropdown to select which sprint to plan
        - "Create Sprint" button
        - Sprint details: name, dates, goal
        - Edit sprint inline
      </sprint_selector>

      <planning_actions>
        - Capacity planning (story points available)
        - Auto-assign based on component ownership
        - Filter backlog by epic, label, etc.
        - Drag issues from backlog to sprint
        - Bulk add selected issues
      </planning_actions>

      <sprint_commitment>
        - Story points committed vs capacity
        - Issue count in sprint
        - Warning if over capacity
        - "Start Sprint" button (sets status to active)
      </sprint_commitment>
    </sprint_planning_view>

    <roadmap_view>
      <timeline_display>
        - Horizontal timeline (weeks/months)
        - Epics as horizontal bars
        - Bar length = epic duration (start to due date)
        - Bar color = epic status or custom color
        - Drag bars to adjust dates
        - Resize bar ends to change duration
      </timeline_display>

      <epic_list>
        - Left sidebar showing all epics
        - Expand epic to see child issues
        - Progress bar for each epic
        - Create epic button
        - Filter epics
      </epic_list>

      <timeline_controls>
        - Zoom: day, week, month, quarter
        - Scroll to today button
        - Date range picker
        - Show/hide completed
      </timeline_controls>

      <dependencies>
        - Draw dependency lines between epics (future feature)
        - Visual indicator if dependency conflict
      </dependencies>
    </roadmap_view>

    <reports_dashboard>
      <burndown_chart>
        - X-axis: sprint days
        - Y-axis: story points remaining
        - Ideal line (gray dashed)
        - Actual line (accent color)
        - Scope changes indicated
        - Hover for daily details
        - Sprint selector dropdown
      </burndown_chart>

      <velocity_chart>
        - Bar chart of last 5-10 sprints
        - Committed vs completed story points
        - Average velocity line
        - Click bar to view sprint details
      </velocity_chart>

      <sprint_report>
        - Sprint summary stats
        - Completed issues list
        - Not completed issues (carried over)
        - Added during sprint
        - Removed during sprint
        - Commitment accuracy percentage
      </sprint_report>

      <cumulative_flow>
        - Area chart showing status over time
        - Stacked by status category
        - Shows bottlenecks visually
        - Date range selector
      </cumulative_flow>

      <pie_charts>
        - Issues by type
        - Issues by priority
        - Issues by assignee
        - Issues by label
        - Click slice to filter board
      </pie_charts>
    </reports_dashboard>

    <project_settings>
      <general_settings>
        - Project name and key (key not editable after creation)
        - Project description
        - Project lead
        - Default assignee
        - Project icon/avatar
        - Project color
      </general_settings>

      <issue_types>
        - Enable/disable issue types for project
        - Custom issue types (future)
        - Default type for new issues
      </issue_types>

      <workflow_settings>
        - Board columns configuration
        - Status mapping
        - Transitions (which status can go to which)
        - Auto-assign rules (future)
      </workflow_settings>

      <labels_management>
        - List all project labels
        - Create new label (name + color)
        - Edit label
        - Delete label (with impact warning)
      </labels_management>

      <components_management>
        - List all components
        - Create component (name, description, lead)
        - Edit component
        - Delete component
      </components_management>

      <custom_fields>
        - List custom fields
        - Create field (name, type, options)
        - Edit field
        - Delete field (with impact warning)
        - Reorder fields
      </custom_fields>

      <danger_zone>
        - Archive project (reversible)
        - Delete project (requires confirmation, irreversible)
        - Export project data (JSON)
      </danger_zone>
    </project_settings>

    <global_search>
      <search_modal>
        - Cmd+K to open
        - Large search input with icon
        - Search as you type (debounced 200ms)
        - Results grouped: Issues, Projects, People
      </search_modal>

      <search_results>
        - Issue results show: type icon, key, summary, project
        - Project results show: icon, name, key
        - User results show: avatar, name
        - Highlight matched text
        - Keyboard navigation
        - Enter to select, Escape to close
      </search_results>

      <advanced_search>
        - JQL-like query input
        - Syntax help tooltip
        - Save as filter
        - Recent searches
      </advanced_search>

      <filter_syntax>
        - project = "CAN" (project key)
        - type = Bug (issue type)
        - status = "In Progress" (status name)
        - priority = High (priority level)
        - assignee = "John" (user name)
        - assignee = EMPTY (unassigned)
        - sprint = "Sprint 1" (sprint name)
        - sprint = ACTIVE (current sprint)
        - epic = "CAN-10" (epic issue key)
        - labels = "frontend" (label name)
        - text ~ "search term" (full-text search)
        - created >= -7d (relative dates)
        - due < 2024-01-15 (absolute dates)
        - storyPoints > 5 (numeric comparison)
        - AND, OR, NOT operators
        - Parentheses for grouping
        - ORDER BY field ASC/DESC
      </filter_syntax>
    </global_search>

    <user_profile_settings>
      <profile_section>
        - Avatar upload or initial selection
        - Display name
        - Email (identifier)
        - Avatar background color
      </profile_section>

      <preferences>
        - Theme: Light / Dark / System
        - Default project (auto-select on login)
        - Sidebar collapsed by default
        - Issue detail: panel or modal
        - Date format preference
        - Notifications (future)
      </preferences>

      <data_management>
        - Export all data (JSON backup)
        - Import data (restore from backup)
        - Clear all data (reset app)
      </data_management>
    </user_profile_settings>

    <keyboard_shortcuts_reference>
      - Global:
        * Cmd+K: Global search
        * Cmd+[: Toggle sidebar
        * C: Create issue (when not in input)
        * /: Focus filter input
      - Navigation:
        * G then B: Go to Board
        * G then L: Go to Backlog
        * G then R: Go to Roadmap
        * G then S: Go to Settings
      - Board:
        * Arrow keys: Navigate cards
        * Enter: Open issue detail
        * Space: Select card
        * M: Assign to me
        * T: Change type
        * P: Change priority
      - Issue detail:
        * Escape: Close panel
        * E: Edit summary
        * A: Change assignee
        * L: Change labels
        * C: Add comment
        * Cmd+Enter: Save and close
      - Displayed in modal via ? key
    </keyboard_shortcuts_reference>
  </pages_and_interfaces>

  <core_functionality>
    <issue_management>
      - Create issue: modal or inline quick create
      - Edit issue: inline editing in detail panel
      - Delete issue: with confirmation, option to archive instead
      - Clone issue: duplicate with new key
      - Move issue: change project (updates key prefix)
      - Link issues: parent-child (epic-story, story-subtask)
      - Watch issue: track changes (local notification)
      - Share issue: copy link to clipboard
      - Bulk operations: multi-select and batch update
        * Change assignee
        * Change priority
        * Add/remove labels
        * Move to sprint
        * Delete selected
    </issue_management>

    <sprint_management>
      - Create sprint: name, goal, optional dates
      - Edit sprint: update name, goal, dates
      - Start sprint: activate sprint, set start date
      - Complete sprint: move incomplete to backlog or next sprint
      - Delete sprint: moves all issues to backlog
      - Sprint velocity: auto-calculated on completion
      - Sprint planning: drag issues into sprint
      - Sprint reports: burndown, completion stats
    </sprint_management>

    <board_management>
      - Drag and drop cards between columns
      - Drag to reorder within column
      - Column WIP limits with visual warning
      - Quick filters: assignee, type, priority
      - Swimlanes: group by assignee, epic, or priority
      - Multiple boards per project (future)
      - Board filter: show only sprint or all project issues
    </board_management>

    <backlog_management>
      - Drag to reorder (priority)
      - Drag into sprints (planning)
      - Grouping: by epic, assignee, priority
      - Filtering: quick text search, advanced filter
      - Bulk selection and actions
      - Story point totals
      - Sprint sections with capacity
    </backlog_management>

    <epic_management>
      - Create epic: special issue type
      - Link issues to epic: from issue detail or bulk
      - Epic progress: calculated from child issues
      - Epic timeline: roadmap view
      - Epic color: for visual identification
      - Epic summary panel: aggregate stats
    </epic_management>

    <filtering_and_search>
      - Quick filter: text search in current view
      - JQL-like query language
      - Save filters for reuse
      - Share filters (store in IndexedDB, exportable)
      - Recent searches history
      - Full-text search using MiniSearch
      - Search across: summary, description, comments
      - Filter by: project, type, status, priority, assignee, labels, etc.
    </filtering_and_search>

    <data_persistence>
      - All data stored in IndexedDB via Dexie
      - Automatic saving (no save button)
      - Reactive queries: UI auto-updates on data change
      - Cross-tab sync: changes reflect in other tabs
      - Export: JSON backup of all data
      - Import: restore from JSON backup
      - Data schema versioning for migrations
      - Graceful handling of quota limits
    </data_persistence>

    <time_tracking>
      - Estimate: set time estimate on issues
      - Log work: record time spent
      - Time format: "2h 30m", "1d", "3h"
      - Time rollup: total time on epic from children
      - Remaining estimate: calculated
      - Time report: per issue, per sprint, per user
    </time_tracking>

    <activity_logging>
      - Track all changes to issues
      - Activity types: created, updated, commented, status changed, etc.
      - Show in issue detail activity tab
      - Activity feed on dashboard
      - No external logging (local only)
    </activity_logging>

    <import_export>
      - Export project to JSON
      - Export all data to JSON
      - Import project from JSON
      - Import from CSV (basic format)
      - Data portability for backup
      - Clear all data option
    </import_export>
  </core_functionality>

  <aesthetic_guidelines>
    <design_fusion>
      I'm combining:
      - COLORS: Forest canopy palette (deep greens, warm earth tones, amber accents)
      - TYPOGRAPHY: Space Grotesk for headers (geometric, modern) + DM Sans for body (clean, readable)
      - LAYOUT: JIRA-inspired information density with better whitespace
      - DETAILS: Subtle organic touches (rounded corners, soft shadows, natural color transitions)

      This creates a distinctive look that is professional and functional but avoids the typical
      AI-generated purple gradients, excessive rounded corners everywhere, and generic "modern" aesthetic.
    </design_fusion>

    <color_palette>
      <primary_colors>
        - Forest Green (primary): #1B4332 - main brand color, nav bar, primary buttons
        - Sage (secondary): #52796F - secondary buttons, highlights
        - Amber (accent): #D4A373 - CTAs, active states, links
        - Deep Teal: #2D6A4F - hover states, secondary emphasis
      </primary_colors>

      <background_colors>
        - Page Background: #FAF9F6 (warm off-white, not pure white)
        - Card Background: #FFFFFF
        - Sidebar Background: #F5F3EF
        - Hover Background: #F0EDE8
        - Selected Background: rgba(212, 163, 115, 0.15) (amber tint)
      </background_colors>

      <text_colors>
        - Primary Text: #2D3748 (rich charcoal, not pure black)
        - Secondary Text: #5A6578 (medium gray)
        - Tertiary Text: #8896A6 (light gray)
        - Link Text: #D4A373 (amber accent)
        - Inverse Text: #FFFFFF (on dark backgrounds)
      </text_colors>

      <status_colors>
        - Success/Done: #40916C (fresh green)
        - Warning/Due Soon: #E9C46A (warm amber)
        - Error/Overdue: #BC6C25 (terracotta)
        - Info/In Progress: #2196F3 (clear blue)
        - Neutral/To Do: #8896A6 (gray)
      </status_colors>

      <priority_colors>
        - Highest: #BC6C25 (terracotta)
        - High: #E9C46A (amber)
        - Medium: #40916C (green)
        - Low: #2196F3 (blue)
        - Lowest: #8896A6 (gray)
      </priority_colors>

      <issue_type_colors>
        - Epic: #9B59B6 (purple - visually distinct for epics)
        - Story: #40916C (green - growth, feature)
        - Bug: #BC6C25 (terracotta - attention)
        - Task: #2196F3 (blue - work item)
        - Sub-task: #8896A6 (gray - subordinate)
      </issue_type_colors>

      <dark_theme>
        - Page Background: #1A1F2E
        - Card Background: #242B3D
        - Sidebar Background: #151922
        - Border Color: #3D4556
        - Primary Text: #E8ECF4
        - Secondary Text: #9BA4B5
        - Accent colors stay similar but slightly adjusted for contrast
      </dark_theme>
    </color_palette>

    <typography>
      <font_families>
        - Headers: "Space Grotesk", system-ui, sans-serif
        - Body: "DM Sans", system-ui, sans-serif
        - Monospace: "JetBrains Mono", "SF Mono", monospace
      </font_families>

      <font_sizes>
        - Page title: 24px, font-weight 600
        - Section header: 18px, font-weight 600
        - Card title: 16px, font-weight 500
        - Body text: 14px, font-weight 400
        - Small text: 12px, font-weight 400
        - Label: 11px, font-weight 500, uppercase, letter-spacing 0.5px
      </font_sizes>

      <line_heights>
        - Tight: 1.2 (headers)
        - Normal: 1.5 (body)
        - Relaxed: 1.7 (descriptions, long text)
      </line_heights>
    </typography>

    <spacing>
      - Base unit: 4px
      - Standard spacing: 8px, 12px, 16px, 24px, 32px
      - Card padding: 16px
      - Section gap: 24px
      - Form field gap: 12px
      - Inline element gap: 8px
      - Page margin: 24px
    </spacing>

    <borders_and_shadows>
      <borders>
        - Default border: 1px solid #E5E1DB
        - Focus border: 2px solid #D4A373
        - Error border: 2px solid #BC6C25
        - Border radius (small): 4px (buttons, inputs)
        - Border radius (medium): 8px (cards, dropdowns)
        - Border radius (large): 12px (modals)
      </borders>

      <shadows>
        - Card shadow: 0 1px 3px rgba(0, 0, 0, 0.08)
        - Dropdown shadow: 0 4px 12px rgba(0, 0, 0, 0.12)
        - Modal shadow: 0 8px 24px rgba(0, 0, 0, 0.16)
        - Hover lift: 0 4px 8px rgba(0, 0, 0, 0.1)
      </shadows>
    </borders_and_shadows>

    <component_styling>
      <buttons>
        - Primary: bg #D4A373, text white, hover darken 10%
        - Secondary: bg white, border gray, text dark, hover bg gray-50
        - Ghost: bg transparent, text accent, hover bg accent/10
        - Danger: bg #BC6C25, text white
        - Disabled: opacity 0.5, cursor not-allowed
        - Height: 36px (default), 32px (small), 40px (large)
        - Padding: 12px 16px
        - Border radius: 6px
        - Font weight: 500
        - Transition: all 150ms ease
      </buttons>

      <inputs>
        - Height: 36px (single line)
        - Padding: 8px 12px
        - Border: 1px solid #E5E1DB
        - Border radius: 6px
        - Focus: border #D4A373, ring 2px #D4A373/20
        - Placeholder: color #8896A6
        - Background: white
      </inputs>

      <dropdowns>
        - Trigger: looks like input with chevron icon
        - Menu: white bg, shadow, max-height 300px with scroll
        - Item: padding 8px 12px, hover bg gray-50
        - Selected: checkmark icon, accent text color
        - Search input at top for long lists
        - Border radius: 8px
      </dropdowns>

      <cards>
        - Background: white
        - Border: 1px solid #E5E1DB (subtle)
        - Border radius: 8px
        - Padding: 16px
        - Shadow: card shadow (subtle)
        - Hover: lift shadow (for interactive cards)
      </cards>

      <badges>
        - Height: 20px
        - Padding: 4px 8px
        - Border radius: 10px (pill)
        - Font size: 11px
        - Font weight: 500
        - Priority/status badges use respective colors
        - Label badges use label color at 15% opacity for bg
      </badges>

      <avatars>
        - Sizes: 24px (small), 32px (medium), 40px (large)
        - Border radius: 50% (circle)
        - Border: 2px solid white (for overlap groups)
        - Initials: font-weight 600, uppercase
        - Background: user-assigned color or auto-generated
      </avatars>

      <modals>
        - Backdrop: rgba(0, 0, 0, 0.5)
        - Background: white
        - Border radius: 12px
        - Shadow: modal shadow
        - Padding: 24px
        - Max width: 500px (small), 680px (medium), 900px (large)
        - Animation: fade in + scale from 0.95 (200ms)
      </modals>

      <slide_panels>
        - Width: 680px
        - Background: white
        - Shadow: -4px 0 24px rgba(0, 0, 0, 0.1)
        - Animation: slide in from right (250ms ease-out)
        - Close: slide out (200ms ease-in)
      </slide_panels>
    </component_styling>

    <animations>
      <micro_interactions>
        - Button hover: scale 1.02, shadow increase (150ms)
        - Button click: scale 0.98 (100ms)
        - Card hover: lift effect, shadow increase (200ms)
        - Checkbox check: checkmark draws in (200ms)
        - Dropdown open: fade + slide down (150ms)
        - Toast notification: slide in from top (300ms)
      </micro_interactions>

      <page_transitions>
        - View switching: crossfade (200ms)
        - Panel slide in: translate X from 100% to 0 (250ms ease-out)
        - Modal open: opacity + scale (200ms)
        - Sidebar collapse: width transition (200ms)
      </page_transitions>

      <drag_and_drop>
        - Pick up: scale 1.02, shadow increase, slight rotation (100ms)
        - Dragging: reduced opacity 0.9
        - Drop target: border highlight, background tint
        - Drop: scale back, position snap (200ms spring)
        - Invalid drop: shake animation (300ms)
      </drag_and_drop>

      <loading_states>
        - Skeleton: shimmer animation on placeholder shapes
        - Spinner: rotating circle (1s infinite)
        - Progress bar: width transition (smooth)
      </loading_states>

      <orchestrated_entrance>
        - Page load: stagger card entrances (50ms delay each)
        - Board columns: slide up with stagger (100ms delay each)
        - Issue cards: fade in with slight upward motion
        - Hero section: title then content (300ms sequence)
      </orchestrated_entrance>
    </animations>

    <icons>
      - Icon library: Lucide React
      - Default size: 20px
      - Small size: 16px
      - Large size: 24px
      - Stroke width: 2px
      - Color: inherit from text or explicit
      - Issue type icons: custom colored circles with type initial or specific icons
        * Epic: lightning bolt
        * Story: bookmark
        * Bug: bug icon
        * Task: checkbox
        * Sub-task: checkbox smaller
    </icons>

    <accessibility>
      - Color contrast: WCAG AA minimum (4.5:1 for text)
      - Focus indicators: visible 2px ring on all interactive elements
      - Keyboard navigation: full app navigable via keyboard
      - Screen reader: ARIA labels on all controls
      - Motion: respect prefers-reduced-motion
      - Font scaling: works up to 200% zoom
    </accessibility>
  </aesthetic_guidelines>

  <advanced_functionality>
    <bulk_operations>
      - Select multiple issues (checkboxes or Cmd+click)
      - Select all visible
      - Bulk update: assignee, priority, labels, sprint, status
      - Bulk delete with confirmation
      - Clear selection button
      - Selection count indicator
    </bulk_operations>

    <quick_actions>
      - Inline editing: click to edit summary, click away to save
      - Quick status change: dropdown in card/row
      - Quick assign: avatar click to reassign
      - Quick add: + button in column headers
      - Keyboard shortcuts throughout
    </quick_actions>

    <smart_features>
      - Auto-generate issue key from project key + counter
      - Auto-set reporter to current user
      - Auto-focus summary field in create modal
      - Remember last used project in create modal
      - Remember view preferences (sort, filter, group)
      - Recent items in dropdowns
    </smart_features>

    <notifications>
      - Toast notifications for actions (issue created, saved, etc.)
      - Error toasts for failures
      - Undo action toasts (5 second window)
      - No external push notifications (local only)
    </notifications>

    <offline_support>
      - All data in IndexedDB (works offline)
      - No server dependency
      - Full functionality offline
      - Export/import for backup
    </offline_support>

    <multi_user_simulation>
      - Create multiple users locally
      - Switch between users (simulates team)
      - Assign issues to different users
      - Filter by assignee
      - Note: All users share same browser storage
    </multi_user_simulation>
  </advanced_functionality>

  <final_integration_test>
    <test_scenario_1>
      <description>First-Time User: Create Project and First Issue</description>
      <steps>
        1. Open Canopy app (fresh state)
        2. See welcome screen with "Create your first project" CTA
        3. Click create project button
        4. Enter project name "My First Project", key "MFP", select color
        5. Save project
        6. Verify redirected to project board (empty state)
        7. Click "Create issue" or press C
        8. Fill in summary "Set up project structure"
        9. Set type to Task, priority to High
        10. Save issue
        11. Verify issue appears in "To Do" column as MFP-1
        12. Click issue card to open detail panel
        13. Add description with markdown formatting
        14. Verify description saves and displays correctly
      </steps>
    </test_scenario_1>

    <test_scenario_2>
      <description>Sprint Planning Workflow</description>
      <steps>
        1. Create project "Sprint Test" with key "SPR"
        2. Create 5 issues with different story points
        3. Navigate to Backlog view
        4. Verify all issues appear in backlog section
        5. Create new sprint "Sprint 1"
        6. Drag 3 issues into Sprint 1 section
        7. Verify story point total updates
        8. Click "Start Sprint" on Sprint 1
        9. Verify sprint status changes to active
        10. Navigate to Board view
        11. Verify only sprint issues appear on board
        12. Drag issue from "To Do" to "In Progress"
        13. Verify status updates in issue detail
        14. Complete all issues (move to Done)
        15. Click "Complete Sprint"
        16. Verify sprint completion dialog shows stats
      </steps>
    </test_scenario_2>

    <test_scenario_3>
      <description>Kanban Board Drag and Drop</description>
      <steps>
        1. Open project with active sprint
        2. Navigate to Board view
        3. Verify columns: To Do, In Progress, In Review, Done
        4. Create issue directly from board (+ in column header)
        5. Drag issue from To Do to In Progress
        6. Verify smooth drag animation
        7. Verify status change persists (refresh page)
        8. Set WIP limit of 2 on In Progress column
        9. Add third issue to In Progress
        10. Verify WIP limit warning appears
        11. Enable swimlanes by Assignee
        12. Verify issues grouped by assignee
        13. Drag issue to different swimlane (assigns to user)
        14. Disable swimlanes, verify flat view
      </steps>
    </test_scenario_3>

    <test_scenario_4>
      <description>Epic and Child Issue Management</description>
      <steps>
        1. Create Epic issue "User Authentication"
        2. Open epic detail panel
        3. Verify "Child issues" section exists
        4. Create Story "Login page UI"
        5. Link story to epic using Epic field
        6. Create Bug "Password reset broken"
        7. Link bug to epic
        8. Return to epic detail
        9. Verify child issues listed with progress
        10. Mark one child issue as Done
        11. Verify epic progress updates (33% if 1 of 3)
        12. Navigate to Roadmap view
        13. Verify epic appears as timeline bar
        14. Set due date on epic
        15. Verify timeline bar reflects dates
      </steps>
    </test_scenario_4>

    <test_scenario_5>
      <description>Search and Filter Functionality</description>
      <steps>
        1. Create 10 issues with varied attributes
        2. Add labels: "frontend", "backend", "urgent"
        3. Assign different priorities
        4. Press Cmd+K to open global search
        5. Type partial issue summary
        6. Verify matching issues appear
        7. Select issue from results
        8. Verify issue detail opens
        9. Navigate to Backlog
        10. Use quick filter to search "frontend"
        11. Verify only labeled issues shown
        12. Open advanced filter
        13. Enter query: priority = High AND labels = "urgent"
        14. Verify correct issues displayed
        15. Save filter as "High Priority Urgent"
        16. Access saved filter from sidebar/dropdown
      </steps>
    </test_scenario_5>

    <test_scenario_6>
      <description>Sub-task Workflow</description>
      <steps>
        1. Create Story "Implement checkout flow"
        2. Open story detail panel
        3. Add sub-task "Design checkout UI"
        4. Add sub-task "Implement payment integration"
        5. Add sub-task "Add order confirmation page"
        6. Verify sub-task progress shows 0/3
        7. Check off first sub-task
        8. Verify progress updates to 1/3
        9. Verify sub-task has its own issue key
        10. Click sub-task to expand inline or open detail
        11. Edit sub-task description
        12. Complete all sub-tasks
        13. Verify progress shows 3/3
        14. Parent story remains in original status
      </steps>
    </test_scenario_6>

    <test_scenario_7>
      <description>Board Column Customization</description>
      <steps>
        1. Navigate to Project Settings > Workflow
        2. Add new column "QA Testing" between In Review and Done
        3. Set WIP limit of 3 on new column
        4. Return to Board view
        5. Verify new column appears
        6. Drag issue into QA Testing column
        7. Verify status updates correctly
        8. Edit column name inline (click header)
        9. Rename to "QA"
        10. Verify name updates
        11. Delete column (move issues to Done first)
        12. Verify column removed from board
      </steps>
    </test_scenario_7>

    <test_scenario_8>
      <description>Comments and Activity Log</description>
      <steps>
        1. Open any issue detail panel
        2. Click Activity tab
        3. Verify creation activity logged
        4. Add comment "Starting work on this"
        5. Verify comment appears with timestamp
        6. Edit comment text
        7. Verify "edited" indicator appears
        8. Change issue status
        9. Verify status change logged in activity
        10. Change assignee
        11. Verify assignee change logged
        12. Add another comment with markdown formatting
        13. Verify markdown renders correctly
        14. Switch to History tab (if separate)
        15. Verify all changes listed chronologically
      </steps>
    </test_scenario_8>

    <test_scenario_9>
      <description>Reports and Dashboard</description>
      <steps>
        1. Complete a full sprint (create, start, complete issues, complete sprint)
        2. Navigate to Reports > Burndown Chart
        3. Select completed sprint
        4. Verify chart shows ideal vs actual line
        5. Hover on data points for details
        6. Navigate to Velocity Chart
        7. Verify sprint appears in velocity history
        8. Complete another sprint
        9. Verify velocity chart shows both sprints
        10. Navigate to Sprint Report
        11. Verify completed issues listed
        12. Verify commitment vs completion stats
        13. Navigate to dashboard (home)
        14. Verify recent activity shows sprint completion
      </steps>
    </test_scenario_9>

    <test_scenario_10>
      <description>Keyboard Navigation</description>
      <steps>
        1. Press ? to open keyboard shortcuts reference
        2. Verify shortcuts modal displays
        3. Press Escape to close
        4. Press C to create issue
        5. Fill in and submit with Cmd+Enter
        6. Press G then B to go to Board
        7. Use arrow keys to navigate cards
        8. Press Enter to open issue detail
        9. Press Escape to close panel
        10. Press M to assign issue to me
        11. Press / to focus filter input
        12. Press Cmd+[ to collapse sidebar
        13. Press Cmd+[ again to expand
        14. Verify all shortcuts work correctly
      </steps>
    </test_scenario_10>

    <test_scenario_11>
      <description>Data Export and Import</description>
      <steps>
        1. Create project with several issues, sprints, labels
        2. Navigate to Project Settings
        3. Click "Export Project Data"
        4. Verify JSON file downloads
        5. Open JSON and verify data structure
        6. Go to Settings > Data Management
        7. Click "Export All Data"
        8. Verify complete backup downloads
        9. Create new project for import test
        10. Use Import function with previously exported file
        11. Verify data imports correctly
        12. Test Clear All Data function (with confirmation)
        13. Verify app resets to fresh state
        14. Import backup to restore
      </steps>
    </test_scenario_11>

    <test_scenario_12>
      <description>Theme and Preference Persistence</description>
      <steps>
        1. Open User Settings
        2. Switch theme from Light to Dark
        3. Verify UI updates immediately
        4. Refresh page
        5. Verify dark theme persists
        6. Set default project preference
        7. Return to home, refresh
        8. Verify default project auto-loads
        9. Collapse sidebar, refresh
        10. Verify sidebar state persists
        11. Change date format preference
        12. Navigate to issues
        13. Verify dates display in new format
        14. Switch back to Light theme
        15. Verify complete theme change
      </steps>
    </test_scenario_12>
  </final_integration_test>

  <success_criteria>
    <functionality>
      - All CRUD operations work: projects, issues, sprints, labels, components
      - Drag and drop works smoothly on board and backlog
      - Sprint management: create, start, complete with proper state transitions
      - Search returns relevant results quickly (under 100ms)
      - Filters execute correctly with JQL-like syntax
      - Data persists correctly in IndexedDB
      - Cross-tab sync works (changes reflect in other tabs)
      - Export/import produces valid data and restores correctly
      - Keyboard shortcuts work throughout application
      - No data loss under normal operation
    </functionality>

    <user_experience>
      - Page loads fast (under 2 seconds initial, instant after)
      - Views switch instantly (under 200ms)
      - Drag and drop feels smooth and responsive
      - Issue creation is quick and intuitive
      - Navigation is clear and predictable
      - Empty states guide users to next actions
      - Error messages are helpful and actionable
      - Keyboard-only usage is fully supported
      - Mobile/tablet responsive (functional, not primary target)
    </user_experience>

    <technical_quality>
      - Clean, modular React component architecture
      - Efficient Dexie queries with proper indexes
      - No memory leaks during extended use
      - Build output under 500KB gzipped (excluding charts)
      - Proper TypeScript types (if using TypeScript)
      - Consistent error handling
      - Loading states for all async operations
      - Optimistic UI updates where appropriate
    </technical_quality>

    <visual_design>
      - Forest canopy palette consistently applied
      - Typography hierarchy is clear and readable
      - Spacing is consistent (8px grid)
      - Animations are smooth at 60fps
      - Focus states visible for all interactive elements
      - Dark theme is fully polished (not an afterthought)
      - No visual bugs or alignment issues
      - Responsive layout works on different screen sizes
    </visual_design>

    <build>
      - `npm run build` produces clean static output in dist/
      - Output works when served from any static host
      - No CORS issues or external dependencies at runtime
      - Works offline after initial load (IndexedDB persists data)
      - Handles browser back/forward navigation correctly
      - SPA routing compatible (single index.html entry point)
    </build>
  </success_criteria>

  <build_output>
    <build_command>npm run build</build_command>
    <output_directory>dist/</output_directory>
    <contents>
      - index.html (entry point)
      - assets/ folder with hashed JS/CSS bundles
      - All assets have content hashes for cache busting
    </contents>
    <note>Deployment is handled separately via CI/CD - agent only builds the app</note>
  </build_output>

  <key_implementation_notes>
    <critical_paths>
      - Dexie database schema and indexes are foundation - get right first
      - Drag and drop on board is core UX - must be smooth
      - Issue detail panel performance - many re-renders possible
      - Filter query parser - complex but important for power users
      - Sprint state transitions - need clear rules
      - Cross-tab reactivity - useLiveQuery makes this easier
    </critical_paths>

    <recommended_implementation_order>
      1. Project setup: Vite + React + Tailwind CSS v4
      2. Dexie database schema and initialization
      3. Basic routing structure (React Router)
      4. Global layout: header, sidebar, main content area
      5. Project CRUD and project selector
      6. Issue CRUD with basic fields
      7. Board view with columns and drag-and-drop
      8. Issue detail panel
      9. Backlog view with drag-and-drop
      10. Sprint management (create, start, complete)
      11. Sprint planning (drag to sprint)
      12. Labels and components management
      13. Epic management and issue linking
      14. Search and filtering (MiniSearch integration)
      15. JQL-like filter parser
      16. Reports: burndown chart, velocity chart
      17. Dashboard home page
      18. User preferences and theme switching
      19. Export/import functionality
      20. Keyboard shortcuts throughout
      21. Animations and polish
      22. Dark theme completion
      23. Performance optimization
      24. Final testing and bug fixes
    </recommended_implementation_order>

    <dexie_schema>
      ```javascript
      import Dexie from 'dexie';

      const db = new Dexie('CanopyDB');

      db.version(1).stores({
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
        settings: 'key' // For global settings like theme
      });

      export default db;
      ```
    </dexie_schema>

    <filter_query_parsing>
      - Tokenize query string into tokens
      - Parse into AST (Abstract Syntax Tree)
      - Evaluate AST against issue objects
      - Handle: field comparisons, AND/OR/NOT, parentheses
      - Date parsing: relative dates (-7d, today) and absolute
      - Consider using a parsing library or write simple recursive descent parser
    </filter_query_parsing>

    <performance_considerations>
      - Use useLiveQuery for reactive data - auto-optimizes
      - Paginate large lists if needed (board unlikely to need it)
      - Virtualize very long backlogs (react-window if >100 items)
      - Debounce search input (200ms)
      - Memoize expensive calculations (sprint velocity)
      - Lazy load heavy components (charts)
    </performance_considerations>

    <testing_strategy>
      - Unit tests: filter parser, date utilities, calculations
      - Component tests: key UI components with Testing Library
      - Integration tests: full workflows with Cypress or Playwright
      - Manual testing: each integration test scenario
      - Cross-browser: Chrome, Firefox, Safari, Edge
      - IndexedDB: test data persistence across sessions
    </testing_strategy>

    <playwright_dev_server_requirement>
      CRITICAL: Before taking any Playwright screenshots:
      1. Start the dev server: `pnpm dev &` (runs in background)
      2. Wait for Vite to be ready - look for "VITE ready" or "Local: http://localhost:6174"
      3. Only THEN use Playwright to take screenshots of http://localhost:6174
      4. If Playwright fails to connect, check that the dev server is actually running

      The dev server MUST be running before Playwright can screenshot the app.
    </playwright_dev_server_requirement>

    <playwright_usage>
      Use Playwright CLI for browser automation and screenshots:

      1. Take screenshots: `mkdir -p screenshots/issue-$ISSUE_NUMBER && npx playwright screenshot http://localhost:6174 screenshots/issue-$ISSUE_NUMBER/<name>-<hash>.png`
      2. Read the screenshot file to view it: use the Read tool on the .png file
      3. For different viewports: `mkdir -p screenshots/issue-$ISSUE_NUMBER && npx playwright screenshot --viewport-size="1280,900" http://localhost:6174 screenshots/issue-$ISSUE_NUMBER/<name>-<hash>.png`
      4. For full-page screenshots: `mkdir -p screenshots/issue-$ISSUE_NUMBER && npx playwright screenshot --full-page http://localhost:6174 screenshots/issue-$ISSUE_NUMBER/<name>-<hash>.png`

      Screenshot naming:
      - Use descriptive kebab-case names that describe what the screenshot shows
      - Add a short unique hash (use `$(date +%s | tail -c 7)` or similar)
      - Screenshots are organized by issue: `screenshots/issue-$ISSUE_NUMBER/<name>-<hash>.png`
      - Examples: `screenshots/issue-87/homepage-initial-a1b2c3.png`, `screenshots/issue-87/counter-test-d4e5f6.png`
    </playwright_usage>
  </key_implementation_notes>

  <issue_type_definitions>
    <epic>
      - Large body of work spanning multiple sprints
      - Contains child issues (stories, tasks, bugs)
      - Has progress calculated from children
      - Displayed on Roadmap timeline
      - Can have due dates for timeline
      - Color-coded for visual identification
    </epic>

    <story>
      - User-facing feature or requirement
      - "As a user, I want X so that Y"
      - Can have sub-tasks
      - Estimated in story points
      - Links to parent epic
    </story>

    <task>
      - Technical work item
      - Development, infrastructure, etc.
      - Can have sub-tasks
      - Estimated in story points or time
      - Links to parent epic
    </task>

    <bug>
      - Defect or issue to fix
      - Often urgent/high priority
      - Can have sub-tasks
      - Links to parent epic
      - Red/terracotta color for visibility
    </bug>

    <subtask>
      - Breakdown of parent issue
      - Simple checkbox-style completion
      - Linked to parent (story, task, or bug)
      - No sub-tasks of sub-tasks
      - Contributes to parent progress
    </subtask>
  </issue_type_definitions>

  <workflow_states>
    <status_categories>
      - To Do: work has not started
      - In Progress: work is actively being done
      - Done: work is complete
    </status_categories>

    <default_statuses>
      - To Do (category: To Do)
      - In Progress (category: In Progress)
      - In Review (category: In Progress)
      - Done (category: Done)
    </default_statuses>

    <transitions>
      - By default, any status can transition to any other
      - Done category issues are considered resolved
      - Sprint completion checks Done category
      - Reports use categories for calculations
    </transitions>
  </workflow_states>

  <sample_data>
    <for_development>
      Create seed data function that generates:
      - 1-2 sample projects
      - 3-5 users (for assignee dropdown)
      - 10-15 issues per project with varied attributes
      - 2-3 sprints (past, current, future)
      - Several labels and components
      - Some epics with linked child issues
      - Activity log entries
      This helps during development and for demos.
    </for_development>
  </sample_data>

  <design_references>
    - JIRA's information density and workflows (functional inspiration)
    - Linear's clean, modern aesthetic (visual inspiration)
    - Notion's keyboard-first approach (interaction inspiration)
    - Forest/nature color palettes (color inspiration)
    - GitHub Projects' simplicity (complexity management)
    - Figma's collaboration feel (team features)
    - Avoiding: purple gradients, generic rounded everything, "AI app" look
  </design_references>

</project_specification>
