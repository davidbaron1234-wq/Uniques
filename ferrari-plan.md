# PROJECT: The "Ferrari" Polish & Hardening Sprint

## GOAL
Transform our existing, highly-functional prototype ("Uniques") into an enterprise-grade, production-ready application. We need to deploy a cross-functional agent team to audit, optimize, and secure the entire codebase WITHOUT altering the core premium visual identity and dark-mode aesthetics we have carefully established.

## TEAM REQUIRED (3 Agents)
1. **Frontend & UI/UX Expert:** Focus on visual consistency, responsiveness, accessibility, removing stray borders/scrollbars, standardizing padding/margins, and ensuring all animations/transitions feel premium.
2. **Backend & Architecture Lead:** Focus on Next.js best practices, optimizing API routes, improving state management efficiency (preventing unnecessary re-renders), and code modularity.
3. **Security & QA Engineer:** Focus on hunting down edge cases, adding strict null/undefined checks (to prevent fatal runtime crashes), input validation, and general application stability.

## WORKFLOW (CONTRACT-FIRST EXECUTION)
To prevent agents from stepping on each other's toes or ruining the existing UI, you must follow this sequence:

**STEP 1: DEEP AUDIT (Read-Only)**
All agents must first analyze the `src/app` and `src/components` directories in their respective domains. DO NOT write or change any code yet.

**STEP 2: THE CONTRACT (The Report)**
The Lead Agent must compile a unified "Audit Report" summarizing the top vulnerabilities, inefficiencies, and UI bugs found by the team.

**STEP 3: PARALLEL EXECUTION**
Once the audit is clear, spin up the agents to work in parallel. 
- The QA agent fixes crash-prone logic.
- The Architecture agent refactors data fetching and state.
- The UI agent applies polish.

*Critical Constraint:* Do NOT redesign components. Enhance, harden, and polish them. Keep the premium `#1A1818` dark theme and glowing borders intact.