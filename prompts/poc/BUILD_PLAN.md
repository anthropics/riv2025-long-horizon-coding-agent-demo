<project_specification>
  <project_name>Counter App - Minimal Demo</project_name>

  <overview>
    Build a simple counter application with React + Vite + Tailwind.
    This is a minimal demo to test the agent build pipeline.
    No routing, no persistence, no backend - just a single page with a counter.
  </overview>

  <technology_stack>
    <framework>React 19</framework>
    <build_tool>Vite 7</build_tool>
    <styling>Tailwind CSS 4 with @tailwindcss/vite plugin</styling>
    <package_manager>pnpm</package_manager>
  </technology_stack>

  <requirements>
    <counter_display>
      - Large number showing current count (starts at 0)
      - Centered vertically and horizontally on the page
      - Use a distinctive font (not Inter)
    </counter_display>

    <buttons>
      - "+" button increments count by 1
      - "-" button decrements count by 1
      - "Reset" button sets count back to 0
      - Buttons styled with hover and active states
    </buttons>

    <styling>
      - Mobile responsive layout
      - Use Tailwind for all styling
      - Pick a cohesive color scheme (not purple gradients)
      - Add subtle animations on button interactions
    </styling>
  </requirements>

  <implementation_notes>
    - Use React useState for state management
    - Single App.tsx component is sufficient
    - Dev server should run on port 6174
  </implementation_notes>

  <testing>
    IMPORTANT: This is a minimal POC. Create only 5-10 essential tests in tests.json:
    - Counter displays initial value of 0
    - Increment button works
    - Decrement button works
    - Reset button works
    - Build passes without errors
    - UI is centered and responsive

    Do NOT create exhaustive tests. Keep it minimal.
  </testing>

  <success_criteria>
    - Counter increments and decrements correctly
    - Reset button works
    - `npm run build` passes without errors
    - App runs at localhost:6174
    - UI looks polished and professional
    - All tests in tests.json pass
  </success_criteria>
</project_specification>
