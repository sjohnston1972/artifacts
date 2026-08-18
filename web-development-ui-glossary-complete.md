# Comprehensive Web Development UI Glossary & Component Encyclopedia

> A practical vocabulary and reference for modern web applications, design systems, enterprise software, dashboards, project-management systems, and AI-assisted application development.

## How to use this glossary

This document is intended to provide a shared vocabulary between:

- Product owners
- UX/UI designers
- Front-end developers
- Back-end developers
- QA engineers
- AI coding agents
- Design-system maintainers

A useful hierarchy is:

**Application → Page → Layout → Pattern → Component → Element → State → Interaction**

For example:

**Projects Page → Master/Detail Layout → Filterable Data Grid → Table Row → Status Badge → Selected State → Inline Edit**

---

# 1. UI Fundamentals

| Term | Definition |
|---|---|
| UI | User Interface; the visual and interactive part of an application. |
| UX | User Experience; how users experience and accomplish tasks within a product. |
| Component | Reusable UI building block. |
| Pattern | Reusable solution to a recurring interaction or layout problem. |
| Primitive | Very low-level reusable UI building block. |
| Element | Individual UI object or HTML element. |
| Control | Interactive UI element allowing the user to perform an action or change a value. |
| View | A particular representation of application information. |
| Screen | A complete application view, especially in mobile/software terminology. |
| Page | A complete web application route/view. |
| Section | Distinct logical area within a page. |
| Surface | Visual layer containing content or controls. |
| Affordance | Visual indication of how an element can be interacted with. |
| Visual Hierarchy | Arrangement of visual emphasis that communicates importance. |
| Information Architecture | Organisation of content, navigation and functionality. |
| Interaction | User action and resulting system response. |
| Microinteraction | Small interaction providing feedback or accomplishing a focused task. |
| Feedback | System response indicating what happened or what is happening. |
| Context | Information about the current user, object, task or application state. |
| Discoverability | How easily users can discover functionality. |

---

# 2. Semantic HTML Elements

| Element / Term | Definition |
|---|---|
| `html` | Root HTML document element. |
| `head` | Contains document metadata and resources. |
| `body` | Contains visible document content. |
| `header` | Introductory/header content for a page or section. |
| `nav` | Navigation region. |
| `main` | Primary content of the document. |
| `section` | Thematic section of content. |
| `article` | Self-contained piece of content. |
| `aside` | Complementary content. |
| `footer` | Footer for a page or section. |
| `div` | Generic block-level container. |
| `span` | Generic inline container. |
| `h1–h6` | Semantic heading hierarchy. |
| `p` | Paragraph. |
| `ul` | Unordered list. |
| `ol` | Ordered list. |
| `li` | List item. |
| `figure` | Self-contained media/content with optional caption. |
| `figcaption` | Caption associated with a figure. |
| `details` | Native expandable disclosure component. |
| `summary` | Visible heading/control for a `details` element. |
| `dialog` | Native dialog element. |
| `form` | Form containing user input controls. |
| `label` | Accessible label for a form control. |
| `button` | Interactive action control. |
| `a` | Hyperlink/navigation element. |
| `input` | User input control. |
| `select` | Native selection control. |
| `textarea` | Multi-line text input. |
| `fieldset` | Groups related form controls. |
| `legend` | Caption for a fieldset. |
| `output` | Represents calculated/output information. |

---

# 3. Page & Layout

| Term | Definition |
|---|---|
| Viewport | Visible browser area. |
| Container | Wrapper limiting content width. |
| Wrapper | Generic grouping/layout container. |
| Header | Top-level page/application header. |
| Footer | Bottom-level page information/navigation. |
| Topbar | Horizontal application toolbar. |
| Sidebar | Vertical navigation or contextual panel. |
| Navigation Rail | Compact vertical navigation. |
| Content Area | Main application content region. |
| Main Content | Primary information/task area. |
| Aside | Secondary contextual area. |
| Panel | Bounded area containing related information. |
| Card | Self-contained content/action block. |
| Tile | Prominent compact card-like UI block. |
| Grid | Two-dimensional layout system. |
| Row | Horizontal grouping. |
| Column | Vertical grouping. |
| Stack | Consistent vertical/horizontal arrangement. |
| Split Pane | Resizable two-panel layout. |
| Master/Detail | List/master area paired with selected-item details. |
| Inspector | Contextual panel for viewing/editing object properties. |
| Property Panel | Panel containing object attributes/settings. |
| Canvas | Free-form visual workspace. |
| Workspace | Persistent application environment containing tools/content. |
| Dashboard | Collection of information widgets. |
| Hero | Prominent introductory section. |
| Divider | Visual separation between sections. |
| Spacer | Intentional empty space used for layout. |
| Sticky Header | Header remaining visible while scrolling. |
| Fixed Header | Header positioned independently of normal document flow. |

---

# 4. Navigation

| Term | Definition |
|---|---|
| Link | Navigational reference. |
| Anchor | Link to a location, commonly within a page. |
| Navbar | Primary navigation. |
| Navigation Menu | Collection of navigation options. |
| Sidebar Navigation | Navigation presented vertically. |
| Dropdown Menu | Menu revealed from a trigger. |
| Mega Menu | Large multi-column navigation menu. |
| Context Menu | Actions relevant to current context. |
| Overflow Menu | Secondary actions hidden behind a menu. |
| Hamburger Menu | Collapsed mobile navigation trigger. |
| Tab Bar | Navigation between related views. |
| Tab | Individual view/navigation control. |
| Breadcrumb | Hierarchical location indicator. |
| Stepper | Sequential navigation through stages. |
| Pagination | Navigation through pages of results. |
| Navigation Rail | Compact vertical navigation. |
| Bottom Navigation | Mobile navigation at bottom of screen. |
| Workspace Switcher | Switches between workspaces. |
| Organisation Switcher | Switches organisational context. |
| Tenant Switcher | Switches tenant/customer context. |
| Account Switcher | Switches user accounts. |
| Back Navigation | Returns to previous view. |
| Deep Link | URL linking directly to a specific application state. |
| Route | Addressable application location. |
| Route Segment | Individual portion of a route. |
| Route Guard | Logic controlling access to a route. |

---

# 5. Buttons & Actions

| Term | Definition |
|---|---|
| Button | Performs an action. |
| Primary Button | Most important action. |
| Secondary Button | Supporting action. |
| Tertiary Button | Low-emphasis action. |
| Ghost Button | Minimal visual button. |
| Text Button | Button represented primarily by text. |
| Icon Button | Button represented primarily by an icon. |
| FAB | Floating Action Button. |
| Split Button | Primary action plus dropdown actions. |
| Toggle Button | Button representing an on/off or selected state. |
| Button Group | Related buttons grouped together. |
| Destructive Action | Action that deletes or causes irreversible change. |
| CTA | Call-to-action. |
| Submit | Submits a form/action. |
| Reset | Resets values. |
| Cancel | Abandons current operation. |
| Save | Persists changes. |
| Apply | Applies changes without necessarily closing the UI. |
| Close | Dismisses an interface element. |
| More Actions | Opens additional actions. |
| Quick Action | Frequently used contextual action. |
| Bulk Action | Action applied to multiple records. |
| Contextual Action | Action relevant to current selection/context. |
| Undo | Reverses a previous operation. |
| Redo | Reapplies a reversed operation. |

---

# 6. Forms

| Term | Definition |
|---|---|
| Form | Collection of inputs used to submit information. |
| Form Group | Label, control and supporting information grouped together. |
| Label | Describes an input. |
| Input | Generic user-editable control. |
| Text Input | Single-line text control. |
| Textarea | Multi-line text control. |
| Password Input | Obscured text input. |
| Search Input | Search-specific input. |
| Number Input | Numeric input. |
| Email Input | Email input. |
| URL Input | URL input. |
| Telephone Input | Telephone-number input. |
| Date Input | Date entry control. |
| Time Input | Time entry control. |
| Date Picker | Visual date selector. |
| Time Picker | Visual time selector. |
| Date/Time Picker | Combined date and time selector. |
| Date Range Picker | Start/end date selector. |
| File Upload | File selection/upload control. |
| Drag-and-Drop Upload | File upload using a drop zone. |
| Colour Picker | Colour selection control. |
| Masked Input | Input constrained by a format. |
| OTP Input | One-time-password input. |
| PIN Input | Numeric PIN entry. |
| Hidden Input | Input not visibly rendered. |
| Helper Text | Supporting input instructions. |
| Placeholder | Example text shown before input. |
| Required Indicator | Shows a required field. |
| Validation Message | Explains validation result. |
| Inline Validation | Validation displayed alongside the field. |
| Form Validation | Process of checking input correctness. |
| Error State | Invalid input state. |
| Success State | Valid input state. |
| Dirty State | Input has changed since loading/saving. |
| Pristine State | Input has not been changed. |
| Touched State | User has interacted with an input. |

---

# 7. Selection Controls

| Term | Definition |
|---|---|
| Select | Dropdown selection control. |
| Multi-select | Select multiple values. |
| Checkbox | Independent selection control. |
| Radio Button | One choice from a group. |
| Radio Group | Group of mutually exclusive choices. |
| Switch | Binary on/off control. |
| Toggle | Generic binary/selected-state control. |
| Segmented Control | Compact mutually exclusive options. |
| Button Group Selector | Selection through grouped buttons. |
| Combobox | Searchable/selectable input. |
| Autocomplete | Suggests matching values during entry. |
| Token Input | Allows multiple selected values represented as tokens. |
| Tag Editor | Adds/removes tags. |
| User Picker | Selects users. |
| Team Picker | Selects teams. |
| Entity Picker | Selects application entities. |
| Object Picker | Selects an object/resource. |
| Tree Select | Selects from hierarchical data. |
| Cascading Select | Selection changes available options in another control. |
| Range Slider | Selects a minimum and maximum. |
| Slider | Selects a value along a range. |
| Stepper | Increment/decrement control. |

---

# 8. Feedback & Status

| Term | Definition |
|---|---|
| Alert | Important message requiring attention. |
| Banner | Persistent page-level message. |
| Toast | Temporary notification. |
| Snackbar | Temporary message often containing an action. |
| Notification | Message about an event/state. |
| Badge | Compact status/count indicator. |
| Status Badge | Label representing state. |
| Chip | Compact interactive or informational label. |
| Pill | Rounded compact label/control. |
| Tag | Classification label. |
| Progress Bar | Linear progress indicator. |
| Progress Ring | Circular progress indicator. |
| Spinner | Indeterminate loading indicator. |
| Skeleton | Placeholder representing loading content. |
| Empty State | UI displayed when no data exists. |
| Error State | UI displayed after failure. |
| Success State | UI displayed after success. |
| Warning State | UI indicating potential danger. |
| Info State | Informational state. |
| Pending State | Operation awaiting completion. |
| Offline State | Application cannot currently reach required services. |
| Stale State | Displayed data may no longer be current. |
| Retry State | UI offering another attempt. |
| SLA Indicator | Shows progress against a service-level target. |
| Escalation Indicator | Shows that an item requires escalation. |

---

# 9. Overlays & Temporary UI

| Term | Definition |
|---|---|
| Modal | Blocking overlay requiring interaction. |
| Dialog | Interface asking for information/decision. |
| Confirmation Dialog | Requests confirmation before an action. |
| Alert Dialog | Presents important information. |
| Popover | Contextual floating panel. |
| Tooltip | Small explanatory overlay. |
| Dropdown | Floating option/action list. |
| Context Menu | Context-specific floating menu. |
| Lightbox | Enlarged media/content overlay. |
| Overlay | Layer above existing content. |
| Backdrop | Background layer behind an overlay. |
| Drawer | Side panel that slides into view. |
| Side Sheet | Side-mounted temporary panel. |
| Bottom Sheet | Bottom-mounted temporary panel. |
| Action Sheet | Mobile-style collection of actions. |
| Command Palette | Searchable command/action interface. |
| Contextual Toolbar | Toolbar appearing for a current selection/context. |
| Modal Wizard | Multi-step workflow contained in a modal. |

---

# 10. Data Display

| Term | Definition |
|---|---|
| Table | Rows and columns of structured data. |
| Data Grid | Interactive table with advanced capabilities. |
| List | Collection of records/items. |
| List Item | Individual list record. |
| Tree View | Hierarchical expandable list. |
| Tree Node | Individual tree item. |
| Accordion | Expandable/collapsible sections. |
| Timeline | Chronological event display. |
| Activity Feed | Chronological record of activity. |
| Feed | Continuously updated content stream. |
| Kanban Board | Columns containing movable cards. |
| Calendar | Date-based event display. |
| Schedule | Time-based activity display. |
| Gantt Chart | Task timeline with durations/dependencies. |
| Dashboard | Collection of information widgets. |
| Widget | Self-contained information/function block. |
| Metric | Numerical measurement. |
| KPI | Key Performance Indicator. |
| Stat Card | Compact metric display. |
| Summary Card | Overview of an entity or dataset. |
| Detail View | Detailed representation of an object. |
| Profile View | Detailed person/account representation. |
| Audit Log | Record of system/user actions. |
| Activity Log | Chronological activity history. |

---

# 11. Advanced Data Grid

| Term | Definition |
|---|---|
| Column Header | Header identifying a column. |
| Row Header | Header identifying a row. |
| Row Selection | Selecting one or more rows. |
| Cell Selection | Selecting individual cells. |
| Range Selection | Selecting a range of cells/rows. |
| Multi-row Selection | Selecting multiple records. |
| Bulk Selection | Selection intended for bulk operations. |
| Row Actions | Actions attached to a row. |
| Column Actions | Actions attached to a column. |
| Column Chooser | Selects visible columns. |
| Column Reordering | Changes column order. |
| Column Resizing | Changes column width. |
| Column Pinning | Fixes columns while horizontally scrolling. |
| Column Grouping | Groups related columns. |
| Row Grouping | Groups records by a value. |
| Row Expansion | Expands a row to show additional information. |
| Nested Row | Child row displayed under a parent. |
| Inline Editing | Editing directly within the grid. |
| Cell Editing | Editing an individual cell. |
| Row Editing | Editing an entire row. |
| Sort | Changes record ordering. |
| Filter | Restricts records displayed. |
| Saved View | Persisted combination of filters/sort/columns. |
| Density Selector | Changes table spacing/density. |
| Virtualisation | Renders only visible records for performance. |
| Server-side Pagination | Pagination performed by the backend. |
| Server-side Filtering | Filtering performed by the backend. |
| Server-side Sorting | Sorting performed by the backend. |
| Infinite Data Grid | Loads more rows as the user scrolls. |

---

# 12. Search, Filter & Query UI

| Term | Definition |
|---|---|
| Search Bar | Primary search input. |
| Search Results | Results matching a query. |
| Search Suggestion | Suggested query/value. |
| Recent Searches | Previously used searches. |
| Global Search | Searches across the application. |
| Local Search | Searches within the current context. |
| Filter | Restricts displayed data. |
| Filter Bar | Collection of filter controls. |
| Filter Chip | Compact active-filter representation. |
| Filter Drawer | Panel containing filters. |
| Faceted Search | Search with multiple category facets. |
| Advanced Search | Detailed search interface. |
| Query Builder | UI for constructing complex queries. |
| Saved Search | Persisted query. |
| Saved Filter | Persisted filter configuration. |
| Clear Filters | Removes active filters. |
| Sort Control | Changes ordering. |
| Sort Direction | Ascending or descending order. |
| Search Scope | Defines where search is performed. |
| Search Token | Structured portion of a query. |

---

# 13. Charts & Data Visualisation

| Term | Definition |
|---|---|
| Bar Chart | Values represented by bars. |
| Column Chart | Vertical bar chart. |
| Line Chart | Values plotted over time/axis. |
| Area Chart | Filled line chart. |
| Pie Chart | Circular proportion chart. |
| Donut Chart | Pie chart with centre removed. |
| Scatter Plot | Individual data points showing relationships. |
| Bubble Chart | Scatter plot using bubble size as another dimension. |
| Heatmap | Values represented by visual intensity. |
| Gauge | Radial value indicator. |
| Radar Chart | Multi-axis radial comparison. |
| Sparkline | Small inline trend chart. |
| Histogram | Distribution chart. |
| Treemap | Nested rectangles representing hierarchical data. |
| Network Graph | Nodes and relationships. |
| Axis | Measurement scale. |
| Legend | Explains chart symbols/colours. |
| Data Label | Label attached to chart data. |
| Reference Line | Target/threshold line on a chart. |
| Trend Indicator | Shows direction of change. |
| Comparison Indicator | Compares current and reference values. |
| Drill-down Chart | Chart allowing navigation into detailed data. |
| Chart Tooltip | Detailed information shown for a data point. |

---

# 14. Dashboard UI

| Term | Definition |
|---|---|
| Dashboard | Collection of information and controls. |
| Dashboard Widget | Individual dashboard component. |
| Widget Header | Header containing title/context/actions. |
| Widget Body | Main widget content. |
| Widget Footer | Optional supporting information/actions. |
| Widget Menu | Widget-specific actions/configuration. |
| Dashboard Grid | Layout containing widgets. |
| Dashboard Filter | Filter affecting dashboard content. |
| Global Filter | Filter affecting multiple widgets. |
| Widget Filter | Filter affecting one widget. |
| Date Range Filter | Dashboard-wide time range. |
| Draggable Widget | Widget that can be repositioned. |
| Resizable Widget | Widget whose dimensions can change. |
| Widget Configuration | Settings controlling widget behaviour. |
| KPI Card | Prominent metric display. |
| Target Indicator | Shows performance against a target. |
| Trend Indicator | Shows movement over time. |
| Comparison Indicator | Shows change relative to another period/value. |
| Dashboard Layout | Arrangement of widgets. |
| Saved Dashboard | Persisted dashboard configuration. |
| Dashboard Template | Predefined dashboard arrangement. |

---

# 15. Cards

| Term | Definition |
|---|---|
| Card | Self-contained content block. |
| Card Header | Card title/context area. |
| Card Body | Main card content. |
| Card Footer | Supporting actions/content. |
| Metric Card | Card showing a measurement. |
| Profile Card | Person/profile summary. |
| Project Card | Project summary. |
| Task Card | Task summary. |
| Entity Card | Generic object summary. |
| Interactive Card | Entire card or sections are interactive. |
| Selectable Card | Card can be selected. |
| Expandable Card | Card can reveal more information. |
| Summary Card | High-level information. |
| Action Card | Card primarily encouraging an action. |
| Empty Card | Card representing missing content. |

---

# 16. Lists

| Term | Definition |
|---|---|
| List | Collection of items. |
| List Item | Individual item. |
| List Header | List title/context. |
| List Footer | Supporting list content. |
| List Divider | Separator between items. |
| Selectable List | List with selection capability. |
| Sortable List | List supporting reordering. |
| Virtual List | Efficiently rendered large list. |
| Infinite List | Loads additional records while scrolling. |
| Grouped List | Items grouped into categories. |
| Nested List | Hierarchical list. |
| Action List | List of available actions. |
| Detail List | Label/value list showing object properties. |

---

# 17. Project Management & Kanban

| Term | Definition |
|---|---|
| Project | Container for related work. |
| Portfolio | Collection of projects. |
| Programme | Related projects managed together. |
| Work Item | Generic unit of work. |
| Task | Work item requiring completion. |
| Subtask | Task belonging to another task. |
| Epic | Large body of work containing smaller items. |
| Story | User-focused work requirement. |
| Issue | Problem/work item requiring attention. |
| Milestone | Significant project checkpoint. |
| Kanban Board | Visual workflow board. |
| Kanban Column | Workflow stage. |
| Task Card | Visual task representation. |
| Swimlane | Horizontal grouping on a Kanban board. |
| WIP Limit | Work-in-progress limit. |
| Backlog | Collection of pending work. |
| Sprint | Time-boxed work period. |
| Dependency | Relationship requiring one item to precede another. |
| Blocker | Issue preventing progress. |
| Assignee | Person responsible for work. |
| Owner | Accountable person/team. |
| Priority | Relative importance. |
| Status | Current lifecycle state. |
| Due Date | Completion target date. |
| Estimate | Expected effort/duration. |
| Burndown | Remaining work over time. |
| Burnup | Completed/total work over time. |
| Velocity | Rate at which work is completed. |

---

# 18. Workflow UI

| Term | Definition |
|---|---|
| Workflow | Defined sequence of states/actions. |
| Workflow Stage | Major workflow phase. |
| Workflow Step | Individual step in a process. |
| State | Current workflow condition. |
| Transition | Movement from one state to another. |
| State Machine | Formal model of states and transitions. |
| Approval | Explicit authorisation step. |
| Approval Queue | Collection of pending approvals. |
| Escalation | Movement to a higher level of attention/authority. |
| SLA | Service-level agreement. |
| SLA Timer | Visual countdown/elapsed SLA indicator. |
| Blocker | Condition preventing transition. |
| Gate | Condition that must be met before progression. |
| Milestone | Significant workflow checkpoint. |
| Dependency | Relationship between workflow items. |
| Progress State | Current progression through a workflow. |
| Completion State | Finished workflow state. |
| Exception State | Workflow state representing an exception/failure. |
| Retry | Reattempt failed operation. |
| Rollback | Return to a previous state/configuration. |

---

# 19. Calendar & Scheduling

| Term | Definition |
|---|---|
| Calendar | Date/event interface. |
| Day View | Calendar showing a day. |
| Week View | Calendar showing a week. |
| Month View | Calendar showing a month. |
| Agenda View | Chronological event list. |
| Timeline View | Time-oriented visual schedule. |
| Resource Calendar | Calendar organised around resources/people. |
| Event | Scheduled item. |
| Appointment | Scheduled meeting/activity. |
| Time Slot | Available time interval. |
| Availability Block | Period of availability. |
| Busy Block | Period when a resource is unavailable. |
| Recurring Event | Repeating event. |
| Date Range | Start/end date interval. |
| Drag-to-Reschedule | Drag event to change its time. |
| Resize-to-Change-Duration | Resize event to change duration. |
| Calendar Overlay | Calendar displayed alongside another calendar. |
| Calendar Filter | Restricts visible events. |

---

# 20. People, Teams & Organisations

| Term | Definition |
|---|---|
| Avatar | Visual representation of a person. |
| Avatar Group | Multiple avatars grouped together. |
| Profile | User/person information. |
| Profile Card | Compact profile representation. |
| User Picker | Selects users. |
| Team Picker | Selects teams. |
| Organisation Picker | Selects organisations. |
| Role Selector | Assigns role. |
| Permission Selector | Assigns permissions. |
| Ownership Selector | Assigns ownership. |
| Assignee Selector | Assigns responsibility. |
| Presence Indicator | Shows online/availability status. |
| Skill Badge | Displays a skill. |
| Certification Badge | Displays a certification. |
| Competency Indicator | Displays competency level. |
| Team List | List of teams. |
| Organisation Tree | Hierarchical organisational structure. |
| Org Chart | Visual organisation hierarchy. |
| Skills Matrix | People versus skills/competencies matrix. |
| Capacity Indicator | Shows available workload capacity. |
| Workload Indicator | Shows current workload. |

---

# 21. Enterprise Application UI

| Term | Definition |
|---|---|
| Tenant | Isolated customer/application context. |
| Organisation | Organisational boundary. |
| Workspace | User/application working context. |
| Role | Named collection of permissions. |
| Permission | Specific allowed action/access. |
| Permission Matrix | Grid mapping roles to permissions. |
| Access Control | System for controlling access. |
| RBAC | Role-Based Access Control. |
| ABAC | Attribute-Based Access Control. |
| Audit Log | Record of security/system actions. |
| Activity Log | Record of application activity. |
| Approval Queue | Items awaiting approval. |
| Work Queue | Items requiring action. |
| Task Queue | Collection of tasks awaiting processing. |
| Escalation Queue | Items requiring escalation. |
| SLA Indicator | Service-level status. |
| Exception Queue | Items requiring special handling. |
| Bulk Operations | Actions performed on many records. |
| Saved View | Persistent table/filter configuration. |
| Custom View | User-defined representation of data. |
| Column Chooser | Controls visible table columns. |
| Density Selector | Controls UI/table density. |
| Data Export | Exports records/data. |
| Import Wizard | Guided data import. |

---

# 22. Collaboration UI

| Term | Definition |
|---|---|
| Comment | User-generated response. |
| Comment Thread | Conversation around content. |
| Mention | Reference to another user. |
| Reaction | Emoji/quick response. |
| Attachment | File associated with content. |
| Message Composer | Interface for composing a message. |
| Chat Bubble | Individual chat message. |
| Presence | Availability indicator. |
| Typing Indicator | Shows that another user is typing. |
| Read Receipt | Indicates message has been read. |
| Activity Feed | Shared activity stream. |
| Notification | User/system event message. |
| Share Control | Shares an object/content. |
| Collaborative Cursor | Shows another user's current cursor. |
| Presence Indicator | Shows another user's activity/availability. |
| Mention Picker | User selection when typing a mention. |

---

# 23. Files & Documents

| Term | Definition |
|---|---|
| File Picker | Selects a file. |
| File Upload | Upload control. |
| Drop Zone | Area accepting dropped files. |
| File Card | Compact file representation. |
| File List | Collection of files. |
| File Preview | Preview of a file. |
| Document Viewer | Displays documents. |
| Image Viewer | Displays images. |
| PDF Viewer | Displays PDF documents. |
| Attachment List | Files attached to an object/message. |
| File Metadata | Information about a file. |
| Version History | Previous file versions. |
| Version Selector | Selects a file version. |
| Download Action | Downloads a file. |
| Export Action | Generates/export data. |
| Import Action | Brings external data into the application. |

---

# 24. Notifications

| Term | Definition |
|---|---|
| Notification | Message about an event. |
| Notification Centre | Central notification interface. |
| Notification Badge | Count of unread notifications. |
| Unread Indicator | Shows unread content. |
| Notification Toast | Temporary notification. |
| Notification Drawer | Panel containing notifications. |
| Notification Preferences | Controls notification behaviour. |
| Push Notification | OS/browser-level notification. |
| In-app Notification | Notification shown inside the application. |
| Digest | Grouped notification summary. |
| Mention Notification | Notification caused by a mention. |
| Assignment Notification | Notification caused by assignment. |
| Approval Notification | Notification related to approval. |
| System Notification | Application/system event. |

---

# 25. Authentication & Security UI

| Term | Definition |
|---|---|
| Login | Authentication interface. |
| Registration | Account creation. |
| Logout | End authenticated session. |
| Password Input | Password entry control. |
| Password Reset | Password recovery workflow. |
| MFA | Multi-factor authentication. |
| OTP | One-time password. |
| Passkey | Passwordless authentication credential. |
| SSO | Single Sign-On. |
| Identity Provider | Service providing authentication identity. |
| Session | Authenticated user session. |
| Session Timeout | Automatic session expiry. |
| Reauthentication | Request to authenticate again. |
| Permission Prompt | Request for user permission. |
| Security Warning | Security-related warning message. |
| Access Denied | UI indicating insufficient permission. |
| Locked Account | Account unavailable due to security state. |

---

# 26. Responsive & Mobile UI

| Term | Definition |
|---|---|
| Responsive Layout | Layout adapting to available space. |
| Breakpoint | Width at which layout changes. |
| Mobile-first | Designing from small screens upward. |
| Desktop-first | Designing from large screens downward. |
| Fluid Layout | Layout scaling continuously. |
| Adaptive Layout | Layout switching between predefined configurations. |
| Container Query | Styling based on container size. |
| Touch Target | Interactive area sized for touch. |
| Swipe | Horizontal/vertical gesture. |
| Long Press | Touch-and-hold interaction. |
| Pull-to-Refresh | Gesture to refresh content. |
| Bottom Navigation | Mobile navigation at screen bottom. |
| Mobile Drawer | Sliding navigation panel. |
| Bottom Sheet | Bottom-mounted panel. |
| Action Sheet | Mobile action menu. |
| Responsive Table | Table adapted to narrow screens. |
| Mobile Card | Card representation of desktop records. |
| Safe Area | Screen area avoiding device notches/system UI. |

---

# 27. Interaction Patterns

| Term | Definition |
|---|---|
| Click | Pointer activation. |
| Double-click | Two rapid clicks. |
| Right-click | Context-menu activation. |
| Hover | Pointer over an element. |
| Focus | Keyboard/input focus. |
| Keyboard Shortcut | Key combination triggering an action. |
| Drag | Move an object while holding pointer. |
| Drop | Release dragged object onto a target. |
| Scroll | Move through overflowing content. |
| Swipe | Touch gesture. |
| Long Press | Press-and-hold interaction. |
| Pinch | Multi-touch scaling gesture. |
| Expand | Reveal hidden content. |
| Collapse | Hide previously visible content. |
| Select | Choose an item. |
| Deselect | Remove selection. |
| Inline Edit | Edit without navigating away. |
| Quick Edit | Lightweight editing interaction. |
| Quick Create | Create an object without leaving context. |
| Drill-down | Move from summary to detail. |
| Drill-through | Navigate from one data context to another. |

---

# 28. Loading & Asynchronous States

| Term | Definition |
|---|---|
| Initial Loading | First load of a view/resource. |
| Skeleton Loading | Content-shaped placeholder. |
| Spinner | Indeterminate progress indicator. |
| Progress Indicator | Indicates progress. |
| Pending | Operation has started but not completed. |
| Refreshing | Existing data is being refreshed. |
| Background Refresh | Data updates without blocking the UI. |
| Optimistic UI | UI updates before server confirmation. |
| Pessimistic UI | UI waits for server confirmation before updating. |
| Retry | Attempt operation again. |
| Timeout | Operation exceeded allowed time. |
| Partial Loading | Some content loaded while other content remains pending. |
| Streaming | Content delivered incrementally. |
| Lazy Loading | Load content only when needed. |
| Prefetching | Load anticipated content in advance. |
| Preloading | Load important resources early. |
| Virtualisation | Render only visible portions of large datasets. |
| Debounce | Delay execution until input activity settles. |
| Throttle | Limit execution frequency. |

---

# 29. Accessibility

| Term | Definition |
|---|---|
| Accessibility | Designing software usable by people with different abilities. |
| WCAG | Web Content Accessibility Guidelines. |
| ARIA | Accessible Rich Internet Applications specification. |
| ARIA Role | Semantic role exposed to assistive technology. |
| ARIA Label | Accessible name/description. |
| Accessible Name | Name exposed to assistive technology. |
| Screen Reader | Software reading interface content aloud. |
| Keyboard Navigation | Operation without a pointer. |
| Focus | Current keyboard interaction target. |
| Focus Indicator | Visual focus representation. |
| Focus Trap | Restricts focus within an active dialog. |
| Focus Management | Programmatic control of focus. |
| Skip Link | Allows navigation past repeated content. |
| Live Region | Dynamic content announced by screen readers. |
| Alt Text | Text description of an image. |
| Semantic HTML | HTML conveying meaning through element choice. |
| Colour Contrast | Visual difference between foreground/background. |
| Reduced Motion | Preference for minimal animation. |
| Screen Reader Only | Content visually hidden but available to assistive technology. |
| Accessible Error | Error communicated accessibly. |
| Touch Target | Adequately sized interactive target. |

---

# 30. Interaction States

| State | Definition |
|---|---|
| Default | Normal resting state. |
| Hover | Pointer is over the element. |
| Focus | Element has keyboard/input focus. |
| Active | Element is being activated/interacted with. |
| Selected | User has selected the element. |
| Checked | Checkbox/radio is selected. |
| Expanded | Component is open. |
| Collapsed | Component is closed. |
| Disabled | Interaction unavailable. |
| Readonly | Visible but not editable. |
| Loading | Operation in progress. |
| Pending | Awaiting completion. |
| Success | Operation succeeded. |
| Error | Operation failed. |
| Warning | Potential problem exists. |
| Empty | No content/data exists. |
| Offline | Required network service unavailable. |
| Stale | Data may be outdated. |
| Dirty | Unsaved changes exist. |
| Valid | Input passes validation. |
| Invalid | Input fails validation. |
| Dragging | Element is being dragged. |
| Drop Target | Element is a valid drop destination. |

---

# 31. Design System Terminology

| Term | Definition |
|---|---|
| Design System | Reusable components, patterns, rules and tokens. |
| Component Library | Collection of reusable components. |
| Primitive | Fundamental low-level component. |
| Pattern | Reusable solution to a UX problem. |
| Template | Reusable page/layout structure. |
| Variant | Alternative component configuration. |
| Size | Component scale variant. |
| Density | Amount of information/spacing in a component. |
| State | Component interaction/status condition. |
| Design Token | Named reusable design value. |
| Semantic Token | Token whose name describes its purpose. |
| Colour Token | Named colour value. |
| Spacing Token | Named spacing value. |
| Typography Token | Named typography value. |
| Radius Token | Named corner-radius value. |
| Shadow Token | Named elevation/shadow value. |
| Component API | Properties/events/configuration exposed by a component. |
| Composition | Combining components to create larger structures. |
| Theming | Applying a visual configuration across a system. |
| Theme Variant | Alternative theme such as light/dark. |
| Design Primitive | Fundamental visual/interaction building block. |

---

# 32. Visual Design

| Term | Definition |
|---|---|
| Typography | System governing text presentation. |
| Font Family | Typeface. |
| Font Size | Text size. |
| Font Weight | Text thickness. |
| Line Height | Vertical spacing between lines. |
| Letter Spacing | Horizontal character spacing. |
| Colour | Visual colour value. |
| Accent Colour | Highlight colour for important interactions. |
| Surface | Background layer. |
| Background | Underlying visual layer. |
| Border | Edge around an element. |
| Radius | Corner rounding. |
| Shadow | Visual depth effect. |
| Elevation | Perceived distance above a surface. |
| Opacity | Transparency. |
| Contrast | Difference between visual elements. |
| Whitespace | Deliberate empty space. |
| Alignment | Positioning elements along common edges/axes. |
| Rhythm | Repetition/consistency of spacing. |
| Density | Amount of information per area. |
| Visual Weight | Perceived prominence of an element. |
| Emphasis | Degree of visual attention. |

---

# 33. CSS & Layout Vocabulary

| Term | Definition |
|---|---|
| CSS | Cascading Style Sheets. |
| Box Model | Content, padding, border and margin model. |
| Margin | Space outside an element. |
| Padding | Space inside an element. |
| Border | Edge around an element. |
| Width | Element width. |
| Height | Element height. |
| Min/Max Width | Constraints on element width. |
| Flexbox | One-dimensional CSS layout system. |
| Flex Container | Parent using Flexbox. |
| Flex Item | Child within Flexbox. |
| CSS Grid | Two-dimensional layout system. |
| Grid Container | Parent using CSS Grid. |
| Grid Item | Child within CSS Grid. |
| Gap | Space between layout items. |
| Position: Relative | Establishes positioning context. |
| Position: Absolute | Positions relative to containing block. |
| Position: Fixed | Positions relative to viewport. |
| Position: Sticky | Sticks relative to scroll container. |
| Z-index | Controls stacking order. |
| Overflow | Controls overflowing content. |
| Container Query | Query based on container dimensions. |
| Media Query | Query based on viewport/device features. |
| Breakpoint | Responsive threshold. |
| CSS Variable | Reusable CSS custom property. |

---

# 34. Component Architecture

| Term | Definition |
|---|---|
| Parent Component | Component containing another component. |
| Child Component | Component nested inside another. |
| Atomic Component | Very small reusable component. |
| Composite Component | Component composed of several components. |
| Compound Component | Related components designed to work together. |
| Container Component | Handles state/data/business logic. |
| Presentational Component | Primarily responsible for rendering. |
| Layout Component | Controls structure/positioning. |
| Page Component | Represents an application page. |
| Controlled Component | Parent controls component state. |
| Uncontrolled Component | Component manages its own state. |
| State | Current component data/condition. |
| Props | Data/configuration passed to a component. |
| Event | Something that happens in the interface. |
| Event Handler | Code responding to an event. |
| Callback | Function supplied to another component/function. |
| Composition | Building components from smaller components. |
| Reusability | Ability to use a component in multiple contexts. |
| Encapsulation | Keeping implementation details within a component. |
| Component Contract | Expected inputs, outputs and behaviour. |

---

# 35. Application State Terminology

| Term | Definition |
|---|---|
| State | Current application/component condition. |
| Local State | State belonging to one component/context. |
| Global State | State shared across the application. |
| Server State | Data originating from a backend/API. |
| Client State | State maintained in the browser/application. |
| URL State | State represented in the URL. |
| Form State | Current form values/validation state. |
| Loading State | State representing an active operation. |
| Error State | State representing a failed operation. |
| Derived State | State calculated from other state. |
| Persisted State | State stored across sessions. |
| Session State | State valid for a session. |
| Cache | Stored copy of data for faster access. |
| Cache Invalidation | Process of marking cached data as outdated. |
| Optimistic State | State updated before server confirmation. |

---

# 36. AI & Agent UI

| Term | Definition |
|---|---|
| AI Assistant | UI for interacting with an AI system. |
| Chat Interface | Conversational UI. |
| Conversation | Sequence of user/AI messages. |
| Message Bubble | Individual conversation message. |
| Prompt Input | Input used to provide instructions. |
| Prompt | Instruction/request supplied to AI. |
| Prompt Suggestion | Suggested prompt/action. |
| Prompt Chip | Compact selectable prompt. |
| Streaming Response | AI response displayed incrementally. |
| AI Status | Indicates AI processing state. |
| Tool Invocation | AI calling an external/system tool. |
| Tool Status | Status of an AI tool operation. |
| Citation | Source reference associated with generated content. |
| Source Panel | Displays supporting sources. |
| Generated Content | AI-produced content. |
| AI Action | Action initiated or recommended by AI. |
| Agent | AI system capable of performing multi-step tasks. |
| Agent Activity | Record of agent actions. |
| Agent Status | Current agent state. |
| Human Approval | User approval required before an action. |
| Human-in-the-loop | Workflow requiring human participation. |
| AI Recommendation | AI-generated suggested decision/action. |
| AI Confidence | Indication of confidence in an AI result. |
| Prompt History | Previous prompts. |
| Conversation History | Previous conversation content. |
| Context Window | Information supplied to the AI for a response. |
| Agent Workspace | UI/environment in which an agent operates. |
| AI Copilot | AI assistant embedded within an existing workflow. |

---

# 37. Performance & Rendering Concepts

| Term | Definition |
|---|---|
| Lazy Loading | Load resources when required. |
| Eager Loading | Load resources immediately. |
| Prefetching | Load resources likely to be needed. |
| Preloading | Explicitly prioritise resource loading. |
| Code Splitting | Divide application code into smaller bundles. |
| Tree Shaking | Remove unused code from production bundles. |
| Virtualisation | Render only visible portions of large datasets. |
| Debouncing | Delay execution until activity stops. |
| Throttling | Limit execution frequency. |
| Optimistic UI | Update UI before confirmation. |
| Progressive Rendering | Display content as it becomes available. |
| Skeleton Screen | Loading placeholder shaped like final content. |
| Hydration | Attaching client behaviour to server-rendered HTML. |
| SSR | Server-Side Rendering. |
| CSR | Client-Side Rendering. |
| SSG | Static Site Generation. |
| ISR | Incremental Static Regeneration. |

---

# 38. Common Application Patterns

| Pattern | Definition |
|---|---|
| CRUD | Create, Read, Update, Delete. |
| Master/Detail | List/master with selected record detail. |
| Dashboard | Overview composed of widgets. |
| Wizard | Multi-step guided workflow. |
| Onboarding | Initial user setup journey. |
| Progressive Disclosure | Reveal complexity only when needed. |
| Drill-down | Navigate from summary to detail. |
| Inline Editing | Edit directly in context. |
| Bulk Editing | Edit multiple records together. |
| Quick Create | Create without leaving the current context. |
| Quick Edit | Lightweight contextual editing. |
| Command Palette | Searchable command execution. |
| Contextual Toolbar | Actions shown for current selection. |
| Split View | Multiple related views displayed simultaneously. |
| Inspector Pattern | Selected object properties shown alongside content. |
| Infinite Scroll | Automatically load more content during scrolling. |
| Virtual List | Efficient large list rendering. |
| Saved View | Persisted view configuration. |
| Filtered View | Data restricted by criteria. |
| Empty State | Guidance when no records exist. |
| Progressive Onboarding | Introduces functionality gradually. |

---

# 39. Common Dashboard Components

## Navigation

- Sidebar
- Topbar
- Breadcrumbs
- Workspace switcher
- Organisation switcher
- User menu
- Command palette
- Global search

## Dashboard

- KPI card
- Metric card
- Trend indicator
- Comparison indicator
- Chart
- Activity feed
- Notification panel
- Quick-action panel
- Recent-items panel
- Progress indicator
- Dashboard filter

## People & Skills

- Avatar
- Profile card
- Skill badge
- Certification badge
- Skill matrix
- Competency indicator
- Progress bar
- Rating
- User picker
- Team selector
- Capacity indicator
- Workload indicator

## Projects

- Project card
- Kanban board
- Kanban column
- Task card
- Status badge
- Priority badge
- Assignee avatar
- Timeline
- Gantt chart
- Dependency indicator
- Milestone
- Progress indicator
- Work queue
- Approval queue

## Tables

- Data grid
- Column chooser
- Filter bar
- Search
- Sort
- Pagination
- Bulk selection
- Bulk actions
- Row actions
- Inline editing
- Saved views
- Density selector

## Forms

- Text input
- Select
- Combobox
- Multi-select
- Date picker
- Date range picker
- Checkbox
- Switch
- Radio group
- File upload
- Validation message

---

# 40. Workspace Foundry-Oriented Component Vocabulary

For a workforce/skills/project-management application, the following names provide a useful consistent component vocabulary.

## Application Shell

- `AppShell`
- `Sidebar`
- `Topbar`
- `Breadcrumbs`
- `WorkspaceSwitcher`
- `OrganisationSwitcher`
- `UserMenu`
- `CommandPalette`
- `GlobalSearch`
- `NotificationCentre`

## People

- `PersonCard`
- `PersonAvatar`
- `PersonPicker`
- `TeamCard`
- `TeamPicker`
- `OrganisationTree`
- `OrgChart`
- `RoleBadge`
- `PermissionMatrix`

## Skills

- `SkillCard`
- `SkillBadge`
- `SkillLevel`
- `SkillMatrix`
- `CompetencyIndicator`
- `CertificationCard`
- `CertificationBadge`
- `SkillProgress`
- `SkillGap`
- `SkillAssessment`
- `SkillsProfile`

## Projects

- `ProjectCard`
- `ProjectHeader`
- `ProjectStatus`
- `ProjectProgress`
- `ProjectTimeline`
- `TaskCard`
- `TaskList`
- `TaskTable`
- `KanbanBoard`
- `KanbanColumn`
- `Milestone`
- `DependencyIndicator`
- `AssigneePicker`
- `PriorityBadge`

## Workforce

- `ResourceCard`
- `ResourcePlanner`
- `CapacityIndicator`
- `WorkloadIndicator`
- `AvailabilityCalendar`
- `ResourceCalendar`
- `AllocationBar`
- `UtilisationMetric`
- `WorkQueue`

## Time

- `Timesheet`
- `TimesheetRow`
- `TimeEntry`
- `TimePicker`
- `DateRangePicker`
- `Calendar`
- `Schedule`
- `Timeline`

## Reporting

- `Dashboard`
- `DashboardWidget`
- `KpiCard`
- `MetricCard`
- `TrendIndicator`
- `ComparisonIndicator`
- `Chart`
- `ReportBuilder`
- `ReportTable`
- `ExportControl`

## Administration

- `AdminPanel`
- `UserManagement`
- `RoleManagement`
- `PermissionMatrix`
- `AuditLog`
- `ActivityLog`
- `SystemSettings`
- `OrganisationSettings`
- `WorkspaceSettings`

## AI

- `AiAssistant`
- `AiChat`
- `AiPromptInput`
- `AiSuggestion`
- `AiStatus`
- `AiActivity`
- `AiRecommendation`
- `AiSourcePanel`
- `AiApproval`
- `AgentActivity`

---

# 41. Component Naming Convention

A consistent naming convention makes large applications easier to maintain.

Prefer:

```text
Component
ComponentHeader
ComponentBody
ComponentFooter
ComponentItem
ComponentList
ComponentCard
ComponentPicker
ComponentDialog
ComponentDrawer
ComponentPanel
ComponentTable
ComponentRow
ComponentCell
```

Examples:

```text
ProjectCard
ProjectCardHeader
ProjectCardBody
ProjectCardFooter

SkillCard
SkillCardHeader
SkillLevel
SkillProgress

TaskTable
TaskTableHeader
TaskTableRow
TaskTableCell
TaskTableActions
```

Avoid vague names such as:

```text
Box
Thing
Stuff
Container2
BluePanel
BigCard
NewThing
Widget2
```

Prefer names based on **purpose**, not appearance.

---

# 42. Component Variants

Common component variant dimensions include:

## Visual Variant

- Primary
- Secondary
- Tertiary
- Ghost
- Outline
- Destructive
- Success
- Warning
- Info

## Size

- XS
- Small
- Medium
- Large
- XL

## Density

- Compact
- Comfortable
- Spacious

## State

- Default
- Hover
- Focus
- Active
- Selected
- Disabled
- Loading
- Error
- Success

## Behaviour

- Static
- Interactive
- Expandable
- Selectable
- Draggable
- Resizable
- Editable

---

# 43. UI Anti-Patterns

| Term | Definition |
|---|---|
| Dark Pattern | UI intentionally designed to manipulate users against their interests. |
| Mystery Meat Navigation | Navigation where purpose is unclear until interacted with. |
| Modal Overuse | Excessive use of blocking dialogs. |
| Hidden Actions | Important functionality hidden from users. |
| Button Soup | Too many competing buttons/actions. |
| Overloaded Dashboard | Excessive information presented simultaneously. |
| Infinite Scroll Trap | Scroll experience that makes navigation difficult. |
| Ambiguous Icon | Icon whose meaning is unclear. |
| Poor Empty State | Empty interface without useful guidance. |
| Dead End | View with no obvious next action/navigation. |
| Inconsistent Component | Same concept presented differently in different areas. |
| Excessive Nesting | Deeply nested UI making comprehension difficult. |
| Tiny Touch Target | Interactive control too small for reliable touch use. |
| Focus Trap Bug | Keyboard focus becomes inaccessible. |
| Layout Shift | Content unexpectedly moves as the page loads. |
| Loading Without Feedback | Long operation with no indication of progress. |
| Destructive Action Without Confirmation | Dangerous action lacks appropriate safeguards. |
| Error Without Recovery | Error state provides no useful recovery path. |

---

# 44. Recommended State Model

For complex application components, consider explicitly modelling:

```text
idle
loading
success
empty
error
disabled
readonly
pending
stale
refreshing
```

For editable entities:

```text
clean
dirty
saving
saved
save-error
```

For workflow entities:

```text
draft
pending
active
blocked
in-review
approved
rejected
completed
cancelled
archived
```

---

# 45. Recommended UI Specification Format

When describing a component to a developer or AI coding agent, specify:

```text
Component:
Purpose:
Location:
Data:
Actions:
Variants:
States:
Interactions:
Validation:
Accessibility:
Responsive behaviour:
Permissions:
Loading behaviour:
Error behaviour:
Related components:
```

Example:

```text
Component: ProjectCard

Purpose:
Display a concise summary of a project.

Data:
- Project name
- Customer
- Owner
- Status
- Progress
- Due date
- Priority

Actions:
- Open
- Edit
- Archive
- More actions

Variants:
- Compact
- Standard
- Expanded

States:
- Default
- Hover
- Selected
- Loading
- Error
- Archived

Interactions:
- Click card opens project
- More Actions opens contextual menu
- Status can be changed inline

Accessibility:
- Keyboard accessible
- Visible focus state
- Accessible action names
- Status not communicated by colour alone

Responsive:
- Full card on desktop
- Condensed card on mobile
```

---

# 46. Quick Reference: UI Hierarchy

The most useful mental model for a modern application is:

```text
APPLICATION
│
├── APPLICATION SHELL
│   ├── Sidebar
│   ├── Topbar
│   ├── Global Search
│   ├── Notifications
│   └── User Menu
│
├── PAGE
│   ├── Page Header
│   ├── Breadcrumbs
│   ├── Toolbar
│   └── Content
│
├── LAYOUT
│   ├── Grid
│   ├── Stack
│   ├── Columns
│   ├── Panels
│   └── Split View
│
├── PATTERN
│   ├── Dashboard
│   ├── Master/Detail
│   ├── Kanban
│   ├── Wizard
│   └── CRUD
│
├── COMPONENT
│   ├── Card
│   ├── Table
│   ├── Form
│   ├── Modal
│   ├── Drawer
│   └── Chart
│
├── ELEMENT
│   ├── Button
│   ├── Input
│   ├── Badge
│   ├── Icon
│   └── Label
│
├── STATE
│   ├── Default
│   ├── Hover
│   ├── Focus
│   ├── Selected
│   ├── Loading
│   ├── Error
│   └── Disabled
│
└── INTERACTION
    ├── Click
    ├── Keyboard
    ├── Drag
    ├── Drop
    ├── Scroll
    ├── Swipe
    └── Type
```

---

# 47. Core Principle

When specifying UI, describe **what something is and what it does**, rather than merely what it looks like.

Prefer:

> `ProjectCard` with `status`, `owner`, `progress` and `priority` properties.

Instead of:

> A rounded rectangle with a blue label and a person icon.

This keeps the interface:

- Consistent
- Accessible
- Responsive
- Reusable
- Easier to test
- Easier to maintain
- Easier for AI coding agents to understand
- Easier to evolve into a design system

---

# 48. Final Vocabulary Map

```text
UI
├── Layout
│   ├── Page
│   ├── Container
│   ├── Grid
│   ├── Stack
│   ├── Panel
│   └── Split View
│
├── Navigation
│   ├── Sidebar
│   ├── Navbar
│   ├── Tabs
│   ├── Breadcrumbs
│   └── Command Palette
│
├── Actions
│   ├── Button
│   ├── Icon Button
│   ├── Menu
│   ├── Context Menu
│   └── Bulk Action
│
├── Forms
│   ├── Input
│   ├── Select
│   ├── Combobox
│   ├── Checkbox
│   ├── Radio
│   ├── Switch
│   └── Date Picker
│
├── Data
│   ├── Table
│   ├── Data Grid
│   ├── List
│   ├── Tree
│   ├── Kanban
│   └── Timeline
│
├── Visualisation
│   ├── KPI
│   ├── Chart
│   ├── Gauge
│   ├── Heatmap
│   └── Sparkline
│
├── Feedback
│   ├── Alert
│   ├── Toast
│   ├── Badge
│   ├── Progress
│   ├── Loading
│   └── Error
│
├── Overlays
│   ├── Modal
│   ├── Dialog
│   ├── Drawer
│   ├── Popover
│   └── Tooltip
│
├── Marketing
│   ├── Hero
│   ├── Pricing Table
│   ├── Testimonial
│   ├── FAQ
│   └── Lead Capture
│
├── Media
│   ├── Carousel
│   ├── Gallery
│   ├── Video Player
│   ├── Lightbox
│   └── Map Embed
│
├── Enterprise
│   ├── Permissions
│   ├── Roles
│   ├── Audit Log
│   ├── Approval Queue
│   └── Work Queue
│
├── AI
│   ├── Assistant
│   ├── Prompt
│   ├── Agent
│   ├── Tool Status
│   ├── Recommendation
│   └── Human Approval
│
└── Accessibility
    ├── ARIA
    ├── Focus
    ├── Keyboard Navigation
    ├── Screen Reader
    └── WCAG
```

---

# 49. Marketing & Content Site Patterns

| Term | Definition |
|---|---|
| Landing Page | Standalone page designed around a single goal or campaign. |
| Above the Fold | Content visible before any scrolling. |
| Hero Section | Prominent opening section carrying the page's main message. |
| Hero Image | Primary image or visual within the hero. |
| Tagline | Short memorable phrase summarising the offer or brand. |
| Value Proposition | Statement of the benefit the product/service provides. |
| Announcement Bar | Slim persistent bar above the header for offers or notices. |
| Feature Grid | Grid of features, each with icon, title and description. |
| Feature Card | Individual feature summary block. |
| Benefits Section | Section framing features in terms of user outcomes. |
| Pricing Table | Side-by-side presentation of pricing tiers. |
| Pricing Tier | Individual plan within a pricing table. |
| Billing Toggle | Switch between monthly and annual pricing display. |
| Comparison Table | Feature-by-feature comparison across plans or products. |
| Testimonial | Quoted customer endorsement. |
| Testimonial Carousel | Rotating display of testimonials. |
| Review Embed | Third-party reviews rendered on the site (e.g. Google reviews). |
| Star Rating | Rating displayed as filled/unfilled stars. |
| Social Proof | Evidence others use and trust the product/service. |
| Logo Cloud | Grid or row of client/partner logos. |
| Trust Badge | Icon signalling security, accreditation or guarantee. |
| Case Study Card | Summary block linking to a detailed customer story. |
| FAQ Accordion | Frequently asked questions in expandable sections. |
| CTA Section | Dedicated section prompting the primary action. |
| Sticky CTA | Call-to-action that remains visible while scrolling. |
| Newsletter Signup | Email capture form for a mailing list. |
| Lead Capture Form | Form collecting contact details from prospects. |
| Quote Request Form | Form requesting a price or estimate. |
| Booking Widget | Embedded appointment or reservation interface. |
| Contact Section | Section combining contact details, form and/or map. |
| Opening Hours | Display of business operating times. |
| Location Map | Embedded map showing a business location. |
| Team Section | Grid of team member profiles. |
| About Section | Section describing the business or people behind it. |
| Portfolio Grid | Grid showcasing previous work. |
| Blog Card | Summary block for an article. |
| Article Layout | Page layout for long-form written content. |
| Author Byline | Attribution line showing author and date. |
| Related Posts | Suggested further articles. |
| Footer Navigation | Grouped link columns within the footer. |
| Social Links | Icon links to social media profiles. |
| Cookie Consent Banner | Notice requesting consent for cookies/tracking. |
| Exit-Intent Modal | Overlay triggered when the visitor moves to leave. |

---

# 50. Media & Rich Content

| Term | Definition |
|---|---|
| Carousel | Rotating sequence of content panels. |
| Image Slider | Carousel specifically for images. |
| Image Gallery | Collection of images presented for browsing. |
| Masonry Grid | Gallery layout with varied item heights packed together. |
| Lightbox Gallery | Gallery whose images open enlarged in an overlay. |
| Thumbnail | Small preview version of an image or video. |
| Thumbnail Strip | Row of thumbnails used to navigate media. |
| Image Zoom | Magnified inspection of an image on hover or click. |
| Before/After Slider | Draggable divider comparing two images. |
| Video Player | Component for video playback. |
| Video Controls | Play/pause, seek, volume and fullscreen controls. |
| Poster Frame | Still image shown before video playback begins. |
| Autoplay | Media that begins playing without user action. |
| Background Video | Ambient video used as a section background. |
| Picture-in-Picture | Floating mini video player. |
| Audio Player | Component for audio playback. |
| Waveform | Visual representation of audio amplitude. |
| Playlist | Ordered queue of media items. |
| Media Embed | Third-party media rendered in the page (e.g. YouTube). |
| Responsive Embed | Embed that scales with its container. |
| Aspect Ratio Box | Container preserving a fixed width-to-height ratio. |
| Map Embed | Third-party map rendered in the page. |
| Interactive Map | Map supporting pan, zoom and selectable markers. |
| Map Marker | Pin indicating a location on a map. |
| Responsive Image | Image served at sizes appropriate to the device. |
| Lazy-Loaded Image | Image loaded only as it approaches the viewport. |
| Placeholder Blur | Low-quality blurred preview shown while an image loads. |
| Icon Set | Consistent family of icons used across an interface. |
| Favicon | Small icon representing the site in browser tabs. |
| Open Graph Image | Preview image shown when a link is shared. |

---

# 51. Content Editing & Authoring

| Term | Definition |
|---|---|
| Rich Text Editor | Editor producing formatted text. |
| WYSIWYG Editor | Editor whose display matches the published output. |
| Markdown Editor | Editor using markdown syntax for formatting. |
| Block Editor | Editor composing content from discrete blocks. |
| Block | Individual unit of content within a block editor. |
| Formatting Toolbar | Controls for applying text formatting. |
| Inline Toolbar | Formatting controls appearing beside selected text. |
| Slash Command | Typing `/` to insert blocks or trigger actions. |
| Mention | Referencing a user/entity with `@`, creating a link. |
| Emoji Picker | Interface for inserting emoji. |
| Link Editor | Interface for creating and editing hyperlinks. |
| Code Block | Formatted block for code snippets. |
| Blockquote | Formatted block for quoted text. |
| Heading Selector | Control choosing heading levels. |
| Character Counter | Live count of characters entered. |
| Word Count | Live count of words entered. |
| Autosave Indicator | Shows content is being saved automatically. |
| Draft | Unpublished saved content. |
| Preview Mode | Displays content as it will appear when published. |
| Split Preview | Editor and preview shown side by side. |
| Find and Replace | Locating and substituting text within content. |
| Undo History | Sequence of reversible editing operations. |

---

# 52. Onboarding & Help

| Term | Definition |
|---|---|
| Product Tour | Guided sequence introducing an interface. |
| Walkthrough | Step-by-step guidance through a task. |
| Coachmark | Contextual callout pointing at a UI element. |
| Hotspot | Pulsing indicator inviting interaction. |
| Spotlight | Dimmed interface highlighting one element. |
| Tour Step | Individual stage within a product tour. |
| Welcome Screen | Introductory view for new users. |
| Onboarding Checklist | Task list guiding initial setup. |
| Progress Checklist | Checklist showing completion of setup steps. |
| Sample Data | Placeholder content demonstrating the product. |
| Empty-State Onboarding | Empty state doubling as a getting-started prompt. |
| Contextual Help | Assistance relevant to the current screen or task. |
| Inline Hint | Small piece of guidance within the interface. |
| Help Centre Widget | Embedded access point to support content. |
| Help Beacon | Persistent button opening help options. |
| Knowledge Base | Searchable library of support articles. |
| Changelog | Record of product changes. |
| What's New Panel | In-app announcement of recent changes. |
| Feature Announcement | Highlight introducing a new capability. |
| Feedback Widget | Control for submitting user feedback. |
| Survey Prompt | In-app request to answer questions. |
| NPS Prompt | Survey asking likelihood of recommending the product. |
| Keyboard Shortcut Overlay | Reference sheet of shortcuts, often opened with `?`. |

---

# 53. Motion & Animation

| Term | Definition |
|---|---|
| Animation | Change of visual properties over time. |
| Transition | Animated change between two states. |
| Keyframes | Defined points within an animation sequence. |
| Duration | How long an animation runs. |
| Delay | Wait before an animation begins. |
| Easing | Rate-of-change curve of an animation. |
| Ease-In / Ease-Out | Easing that accelerates in / decelerates out. |
| Spring Animation | Physics-based motion with natural overshoot. |
| Micro-animation | Small animation providing feedback on an interaction. |
| Enter/Exit Animation | Motion applied as elements appear or leave. |
| Stagger | Sequential offsetting of animations across items. |
| Page Transition | Animated change between pages/views. |
| View Transition | Browser-native animated navigation between views. |
| Scroll-Triggered Animation | Animation started by scroll position. |
| Scroll Reveal | Content animating in as it enters the viewport. |
| Parallax | Layers scrolling at different speeds for depth. |
| Scroll Snapping | Scrolling that settles at defined points. |
| Sticky Scroll Effect | Element pinning in place during part of the scroll. |
| Marquee | Continuously scrolling horizontal content. |
| Skeleton Shimmer | Moving highlight across loading placeholders. |
| Pulse | Rhythmic scaling/opacity drawing attention. |
| Hover Effect | Visual response to pointer hover. |
| Loading Animation | Motion indicating an operation in progress. |
| Lottie Animation | Vector animation played from an exported file. |
| Reduced Motion | User preference to minimise animation, which interfaces must respect. |

---

# 54. Internationalisation & Localisation

| Term | Definition |
|---|---|
| Internationalisation (i18n) | Building software so it can support multiple languages/regions. |
| Localisation (l10n) | Adapting content and formats for a specific language/region. |
| Locale | Combination of language and region (e.g. en-GB). |
| Language Switcher | Control for changing the interface language. |
| Region Selector | Control for choosing a country/region. |
| Translation | Content rendered in another language. |
| String Catalogue | Store of translatable interface text. |
| Fallback Language | Language used when a translation is missing. |
| Pluralisation | Grammatical handling of quantities across languages. |
| Date Formatting | Locale-appropriate date presentation. |
| Number Formatting | Locale-appropriate number presentation. |
| Currency Formatting | Locale-appropriate currency presentation. |
| Timezone Selector | Control for choosing a timezone. |
| RTL | Right-to-left text direction (e.g. Arabic, Hebrew). |
| LTR | Left-to-right text direction. |
| Bidirectional Text | Mixed-direction text handling. |

---

## Summary

A comprehensive UI vocabulary should cover more than visual controls. It should describe:

**Structure + Navigation + Actions + Forms + Data + Feedback + States + Interactions + Accessibility + Responsive Behaviour + Design Systems + Application Architecture + Domain Patterns + AI Interfaces + Marketing & Content Patterns + Media + Content Editing + Onboarding & Help + Motion + Internationalisation.**

This glossary is intended to provide that shared vocabulary.
