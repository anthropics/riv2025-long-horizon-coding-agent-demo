# Dependency Version Audit Trail

This document records the pinned dependency versions as of 2025-12-01.

## Python Dependencies (requirements.txt)

| Package | Version | Notes |
|---------|---------|-------|
| claude-agent-sdk | 0.1.4 | From pip freeze |
| boto3 | 1.40.70 | From pip freeze |
| PyGithub | 1.59.0 | From pip freeze |
| aiofiles | 23.1.0 | From pip freeze |
| python-dotenv | 1.1.1 | From pip freeze |
| opentelemetry-api | 1.36.0 | From pip freeze |
| aws-opentelemetry-distro | 0.13.0 | Not installed locally, kept minimum |
| diagrams | 0.23.0 | Not installed locally, kept minimum |

## Node.js Dependencies (package.json - root)

**Note:** Versions from package-lock.json (actual resolved versions).

### devDependencies

| Package | Version |
|---------|---------|
| @playwright/test | 1.56.1 |
| @types/node | 22.19.1 |
| typescript | 5.9.3 |

## Node.js Dependencies (infrastructure/package.json)

**Note:** Versions from package-lock.json (actual resolved versions).

### devDependencies

| Package | Version |
|---------|---------|
| @types/node | 20.19.24 |
| aws-cdk | 2.1031.1 |
| ts-node | 10.9.2 |
| typescript | 5.9.3 |

### dependencies

| Package | Version |
|---------|---------|
| aws-cdk-lib | 2.221.1 |
| constructs | 10.4.2 |

## Node.js Dependencies (frontend-scaffold-template/package.json)

**Note:** Versions from agent's package-lock.json (actual resolved versions from running agent).

### dependencies

| Package | Version |
|---------|---------|
| @dnd-kit/core | 6.3.1 |
| @dnd-kit/sortable | 8.0.0 |
| @dnd-kit/utilities | 3.2.2 |
| @hookform/resolvers | 5.2.2 |
| @radix-ui/react-accordion | 1.2.12 |
| @radix-ui/react-alert-dialog | 1.1.15 |
| @radix-ui/react-aspect-ratio | 1.1.8 |
| @radix-ui/react-avatar | 1.1.11 |
| @radix-ui/react-checkbox | 1.3.3 |
| @radix-ui/react-collapsible | 1.1.12 |
| @radix-ui/react-context-menu | 2.2.16 |
| @radix-ui/react-dialog | 1.1.15 |
| @radix-ui/react-dropdown-menu | 2.1.16 |
| @radix-ui/react-hover-card | 1.1.15 |
| @radix-ui/react-label | 2.1.8 |
| @radix-ui/react-menubar | 1.1.16 |
| @radix-ui/react-navigation-menu | 1.2.14 |
| @radix-ui/react-popover | 1.1.15 |
| @radix-ui/react-progress | 1.1.8 |
| @radix-ui/react-radio-group | 1.3.8 |
| @radix-ui/react-scroll-area | 1.2.10 |
| @radix-ui/react-select | 2.2.6 |
| @radix-ui/react-separator | 1.1.8 |
| @radix-ui/react-slider | 1.3.6 |
| @radix-ui/react-slot | 1.2.4 |
| @radix-ui/react-switch | 1.2.6 |
| @radix-ui/react-tabs | 1.1.13 |
| @radix-ui/react-toggle | 1.1.10 |
| @radix-ui/react-toggle-group | 1.1.11 |
| @radix-ui/react-tooltip | 1.2.8 |
| @tailwindcss/vite | 4.1.17 |
| class-variance-authority | 0.7.1 |
| clsx | 2.1.1 |
| cmdk | 1.1.1 |
| date-fns | 4.1.0 |
| embla-carousel-react | 8.6.0 |
| framer-motion | 12.23.25 |
| input-otp | 1.4.2 |
| lucide-react | 0.536.0 |
| next-themes | 0.4.6 |
| re-resizable | 6.11.2 |
| react | 19.2.0 |
| react-day-picker | 9.11.3 |
| react-dom | 19.2.0 |
| react-hook-form | 7.67.0 |
| react-resizable-panels | 3.0.6 |
| react-responsive-masonry | 2.7.1 |
| react-slick | 0.30.3 |
| recharts | 2.15.4 |
| slick-carousel | 1.8.1 |
| sonner | 2.0.7 |
| tailwind-merge | 3.4.0 |
| vaul | 1.1.2 |
| zod | 4.1.13 |

### devDependencies

| Package | Version |
|---------|---------|
| @eslint/js | 9.39.1 |
| @types/node | 24.10.1 |
| @types/react | 19.2.7 |
| @types/react-dom | 19.2.3 |
| @types/react-slick | 0.23.13 |
| @vitejs/plugin-react | 4.7.0 |
| autoprefixer | 10.4.22 |
| eslint | 9.39.1 |
| eslint-plugin-react-hooks | 5.2.0 |
| eslint-plugin-react-refresh | 0.4.24 |
| globals | 16.5.0 |
| postcss | 8.5.6 |
| tailwindcss | 4.1.17 |
| tw-animate-css | 1.4.0 |
| typescript | 5.8.3 |
| typescript-eslint | 8.48.0 |
| vite | 7.2.6 |
