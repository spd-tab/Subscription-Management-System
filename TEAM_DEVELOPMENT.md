# Brightloop Team GitHub Collaboration Guide

This guide explains how four developers can work on Brightloop without overwriting one another's work. It assumes Windows 11, PowerShell, Git, and Node.js are installed, and that the Brightloop foundation has been pushed to the GitHub repository's `main` branch.

> Replace `<YOUR-GITHUB-USERNAME>` and `<REPOSITORY-NAME>` in examples with the real GitHub account and repository. Do not type the angle brackets.

## How the workflow works

- `main` is the shared, reviewed version of the application. Do not develop directly on it.
- Each member works on their assigned feature branch.
- Developers push their feature branches to GitHub and open Pull Requests (PRs) to merge changes into `main`.
- The team lead reviews and merges PRs.
- Everyone regularly brings the latest `main` changes into their feature branch.

The flow is:

```text
main -> member's feature branch -> commits and push -> Pull Request -> review -> main
```

## A. Initial setup — team lead

### 1. Create the GitHub repository

On GitHub:

1. Sign in and select **New repository**.
2. Name it, for example, `Subscription_Management_System`.
3. Choose the team's visibility setting.
4. If the project already exists locally, do not initialize the new repository with an extra README, `.gitignore`, or license; the project already has files.
5. Create the repository and copy its HTTPS URL, for example:

   ```text
   https://github.com/<YOUR-GITHUB-USERNAME>/<REPOSITORY-NAME>.git
   ```

### 2. Push the foundation to `main`

If the team lead's local foundation is already committed and the GitHub repository is empty, open PowerShell in the project folder and run:

```powershell
git status
git branch -M main
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/<REPOSITORY-NAME>.git
git push -u origin main
```

If `origin` is already configured, do not add it a second time. Check it with:

```powershell
git remote -v
```

If the foundation has already been pushed, verify it on GitHub and continue to branch protection. Do not force-push to make local and remote history match. If Git reports unrelated histories or a rejected push, stop and ask the team lead to inspect the repository history before proceeding.

### 3. Protect `main`

If repository settings and the team's GitHub plan allow it:

1. Open the repository on GitHub.
2. Go to **Settings → Branches** (or **Rules → Rulesets**, depending on the current GitHub interface).
3. Add a branch protection rule or ruleset targeting `main`.
4. Require a Pull Request before changes can be merged.
5. Require at least one approval if the team can provide one.
6. Require status checks after CI checks have been configured.
7. Disable force pushes and branch deletion for `main`.

GitHub settings and plan features can change. If a protection option is unavailable, the team must follow the same rules by agreement: changes go through PRs, and only the team lead merges them.

## B. Each member's initial setup

Perform these steps once on each developer's computer.

### 1. Clone the repository

Open PowerShell and run:

```powershell
cd $HOME\Projects
git clone https://github.com/<YOUR-GITHUB-USERNAME>/<REPOSITORY-NAME>.git
```

If the `Projects` folder does not exist yet, create it first:

```powershell
New-Item -ItemType Directory -Force "$HOME\Projects"
cd "$HOME\Projects"
```

### 2. Enter the project directory and install dependencies

Use the repository name as the folder name created by `git clone`:

```powershell
cd .\<REPOSITORY-NAME>
npm ci
```

`npm ci` installs the exact dependency versions recorded in `package-lock.json`. If the team intentionally changes dependencies and updates the lock file, run `npm ci` again to install the updated versions.

If the app needs local environment values, create a private `.env` file from the example:

```powershell
Copy-Item .env.example .env
```

Leave values blank until the team lead supplies valid development credentials through an approved private channel. Never paste credentials into chat, source files, commits, or PRs. The app can run without Supabase values.

### 3. Check the current branch and update local `main`

```powershell
git status
git branch --show-current
git switch main
git pull origin main
```

If `git branch --show-current` prints `main`, that is expected at this point. If `git switch main` says the branch does not exist locally, run:

```powershell
git fetch origin
git switch --track origin/main
```

### 4. Create your assigned feature branch from the latest `main`

Create a feature branch only after updating `main`. Choose exactly the branch assigned to you:

```powershell
git switch -c feature/dashboard-analytics
```

```powershell
git switch -c feature/products-plans-customers
```

```powershell
git switch -c feature/subscriptions-billing
```

```powershell
git switch -c feature/auth-payments-portal
```

Each developer runs only the command for their own branch. Confirm the result:

```powershell
git branch --show-current
git status
```

The first command must print your assigned `feature/...` branch. Every member must create their branch from the latest `main`, not from another member's branch.

## C. Branch assignments

| Member | Branch | Main areas |
|---|---|---|
| Member 1 | `feature/dashboard-analytics` | Dashboard, analytics, reports |
| Member 2 | `feature/products-plans-customers` | Customers, products, variants, plans, quotations, tax configuration |
| Member 3 | `feature/subscriptions-billing` | Subscriptions, billing, invoice generation and management |
| Member 4 | `feature/auth-payments-portal` | Authentication, roles, payments, discounts, customer portal, integration |

These are areas of ownership, not a reason to block necessary shared changes. If you need to change a shared component, route, or file owned by another member, coordinate first and keep the change small.

## D. Daily development workflow

### 1. Start by getting the latest `main`

Open PowerShell in the project directory. Check for local edits before switching branches:

```powershell
git status
git branch --show-current
```

If you have unfinished local changes, save them in a commit or ask for help before switching. Do not discard work just to make Git commands succeed.

Update local `main`, then return to your feature branch:

```powershell
git switch main
git pull origin main
git switch feature/<YOUR-BRANCH-NAME>
```

Replace `<YOUR-BRANCH-NAME>` with your assigned branch suffix, such as `dashboard-analytics`. If you are not sure which branch you are on, run `git branch --show-current` before making changes.

### 2. Make changes and inspect them

Edit your assigned files. Before staging, inspect what changed:

```powershell
git status
git diff
```

Check that you have not accidentally changed secrets, generated files, or another member's work. `.env` must remain untracked and must never be committed.

### 3. Test before committing

At minimum, build the app before opening a PR:

```powershell
npm run build
```

If you changed a screen or interaction, also run the app and check it in the browser:

```powershell
npm run dev
```

Stop the development server with **Ctrl+C** in that PowerShell window when finished.

### 4. Stage and commit your changes

Stage only the files for your task. For example:

```powershell
git add src\pages\Dashboard.jsx src\components\charts\RevenueChart.jsx
```

If you intentionally want to stage every changed file, first inspect `git status` carefully, then run:

```powershell
git add .
```

Review the staged changes and commit with a clear message:

```powershell
git diff --cached
git commit -m "Add dashboard revenue analytics"
```

Good commit messages say what changed, for example:

```text
Add customer search and status filters
Build subscription renewal summary
Connect portal sign-in form validation
```

Commit in small, meaningful steps instead of saving all work in one large commit.

### 5. Push your feature branch

For the first push of a branch:

```powershell
git push -u origin feature/<YOUR-BRANCH-NAME>
```

For later pushes:

```powershell
git push
```

Pushing a feature branch does not merge it into `main`.

### 6. Safely bring the latest `main` into your feature branch

Do this regularly, especially before opening or updating a PR. First ensure your work is committed and your working tree is clean:

```powershell
git status
```

Then fetch the latest remote branches and merge remote `main` into your feature branch:

```powershell
git fetch origin
git switch feature/<YOUR-BRANCH-NAME>
git merge origin/main
```

This uses a merge rather than rewriting the feature branch's published history, so it does not require force-pushing. If Git says there are conflicts, follow the conflict steps below. After a successful merge, test and push:

```powershell
npm run build
git push
```

Do not run `git pull origin main` while you are on your feature branch: that command merges `main` into whichever branch is currently checked out. Use the explicit `git fetch origin` and `git merge origin/main` steps above.

### 7. Resolve merge conflicts

Conflicts happen when two branches change overlapping parts of the same file. Git will list the conflicted files.

1. Check what Git needs:

   ```powershell
   git status
   ```

2. Open each conflicted file in VS Code. Find the conflict markers:

   ```text
   <<<<<<< HEAD
   Your feature branch's version
   =======
   The incoming main branch's version
   >>>>>>> origin/main
   ```

3. Decide on the correct combined content with the other file owner if needed. Edit the file so the final version contains the intended code and **none** of the conflict-marker lines.
4. Save the file, then stage the resolved file:

   ```powershell
   git add src\path\to\resolved-file.jsx
   ```

5. Repeat for every conflicted file. Verify Git reports no remaining unmerged paths:

   ```powershell
   git status
   ```

6. Run the build, then finish the merge:

   ```powershell
   npm run build
   git commit -m "Merge latest main and resolve conflicts"
   git push
   ```

If you do not understand which version should be kept, stop before committing and ask the other contributor or team lead. Do not blindly choose “Accept Current” or “Accept Incoming” for every conflict. To cancel an in-progress merge before resolving it, use:

```powershell
git merge --abort
```

This cancels the merge operation; it does not replace a backup for uncommitted work. Check `git status` first and ask for help if unsure.

### 8. Create a Pull Request on GitHub

Once your branch is pushed and tested:

1. Open the repository on GitHub. GitHub may show a **Compare & pull request** button for your recently pushed branch.
2. Select your feature branch as the source (`compare`) and `main` as the destination (`base`).
3. Use a clear PR title, such as `Add dashboard revenue analytics`.
4. In the description, summarize what changed, list how you tested it (for example, `npm run build`), and mention any known gaps.
5. Assign the team lead as reviewer and add any teammate who owns files affected by the change.
6. Create the PR. Keep working on the same feature branch if requested changes are needed; commit and push them to update the PR.
7. Do not merge your own PR unless the team lead has explicitly asked you to do so.

## Realistic command examples for all four members

These examples assume each member has already cloned the repo, installed dependencies, and is in the repository folder. Each example shows updating `main`, creating the assigned branch if it does not exist yet, making a commit, and pushing.

### Member 1 — Dashboard and analytics

Initial branch creation (after updating `main`):

```powershell
git switch main
git pull origin main
git switch -c feature/dashboard-analytics
```

Example daily commit and first push:

```powershell
git status
npm run build
git add src\pages\ReferencePages.jsx src\components\charts\TrendChart.jsx
git diff --cached
git commit -m "Improve dashboard revenue analytics"
git push -u origin feature/dashboard-analytics
```

### Member 2 — Products, plans, and customers

Initial branch creation:

```powershell
git switch main
git pull origin main
git switch -c feature/products-plans-customers
```

Example daily commit and first push:

```powershell
git status
npm run build
git add src\pages\ModulePage.jsx src\data\mockData.js
git diff --cached
git commit -m "Add product and plan management tables"
git push -u origin feature/products-plans-customers
```

### Member 3 — Subscriptions and billing

Initial branch creation:

```powershell
git switch main
git pull origin main
git switch -c feature/subscriptions-billing
```

Example daily commit and first push:

```powershell
git status
npm run build
git add src\pages\ReferencePages.jsx src\data\mockData.js
git diff --cached
git commit -m "Add subscription billing summary"
git push -u origin feature/subscriptions-billing
```

### Member 4 — Auth, payments, and portal

Initial branch creation:

```powershell
git switch main
git pull origin main
git switch -c feature/auth-payments-portal
```

Example daily commit and first push:

```powershell
git status
npm run build
git add src\pages\AuthPages.jsx src\components\layouts\AuthGuard.jsx
git diff --cached
git commit -m "Improve portal authentication flow"
git push -u origin feature/auth-payments-portal
```

The example paths are illustrative. Stage the actual files you changed for your task; coordinate with teammates before committing changes to shared files.

## E. Integration workflow — team lead

For every PR:

1. Confirm the PR targets `main` and comes from the correct feature branch.
2. Read the PR summary and inspect the changed-file list and diff.
3. Check that the change belongs in the PR and does not include `.env`, credentials, `node_modules`, or generated `dist` output.
4. Ask the author to explain unclear code or resolve conflicts; use the PR conversation so decisions are visible to the team.
5. Verify the app builds. If automated checks are configured, confirm they pass. Review the affected screen or flow where practical.
6. Request changes or approve the PR. Do not merge until required changes and checks are complete.
7. Merge using the repository's agreed GitHub merge option. For a small hackathon team, **Squash and merge** keeps `main` history concise; use one consistent merge style for the project.
8. Delete the remote feature branch on GitHub after it is merged, if it is no longer needed.

After a PR is merged, every member should update local `main` and their feature branch before starting the next task:

```powershell
git status
git switch main
git pull origin main
git switch feature/<YOUR-BRANCH-NAME>
git fetch origin
git merge origin/main
git push
```

If the feature branch was deleted from GitHub after merge and work on it is complete, the developer can leave it locally or remove it after switching to another branch:

```powershell
git switch main
git branch -d feature/<YOUR-BRANCH-NAME>
```

Do not delete a branch that still contains unmerged work.

## F. Important team rules

1. **Never work directly on `main`.** Create and use your assigned feature branch.
2. **Never force-push to `main`.** Do not use `git push --force` as a conflict-resolution shortcut.
3. **Avoid editing another member's assigned files.** Coordinate first when a shared change is necessary.
4. **Never commit `.env` files, API keys, passwords, tokens, or credentials.** `.env` is ignored by Git; still check `git status` and staged changes before committing.
5. **Pull the latest `main` before beginning work.** Create each feature branch from the latest `main`.
6. **Commit frequently with meaningful messages.** Small commits are easier to review and recover.
7. **Test before creating or updating a PR.** Run at least `npm run build`.
8. **Do not commit generated or dependency folders.** `node_modules` and `dist` should stay out of Git.
9. **Do not overwrite a teammate's work to resolve a conflict.** Understand both changes and coordinate with the file owner.
10. **Keep PRs focused.** One PR should describe a related piece of work, not unrelated changes from several modules.

## Quick troubleshooting

### “Your branch is behind”

Bring the latest `main` into your feature branch using the safe update steps in section D, test, then push.

### “Nothing to commit”

Run `git status`. Your changes may already be committed, may not have been saved in the editor, or may be ignored. Do not force Git to add `.env` or credentials.

### “The requested upstream branch does not exist”

Use the first-push command with `-u`:

```powershell
git push -u origin feature/<YOUR-BRANCH-NAME>
```

### A commit accidentally includes a secret

Do not push it. If it has already been pushed, tell the team lead immediately and rotate/revoke the exposed credential. Removing it in a later commit does not make the old secret safe.

### Check remotes and branches

```powershell
git remote -v
git branch
git branch --show-current
git status
```

These read-only commands are safe ways to confirm which repository and branch you are using before making changes.
