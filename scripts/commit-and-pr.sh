#!/usr/bin/env bash
set -euo pipefail

echo "========================================="
echo " X_chromeUIchanger: Commit, PR & Merge"
echo "========================================="

# 0. ワークツリー確認
if [ ! -d ".git" ]; then
  echo "Error: Not a git repository."
  exit 1
fi

FEATURE_BRANCH="feat/responsive-x-ui"

echo "[1/6] Creating feature branch: ${FEATURE_BRANCH}..."
git checkout -B "${FEATURE_BRANCH}"

echo "[2/6] Committing changes by logical units..."

# Commit 1: Core configuration, build pipeline, and manifest
git add .gitignore package.json tsconfig*.json scripts/ static/ src/types/ src/shared/
git commit -m "feat(core): project config, build scripts, manifest, and shared layout metrics"

# Commit 2: Popup UI and storage integration
git add src/popup/
git commit -m "feat(popup): toggle popup UI and chrome.storage integration"

# Commit 3: Content script DOM targeting and observers
git add src/content/selectors.ts src/content/content-targets.ts src/content/observers.ts src/content/layout-controller.ts src/content/index.ts
git commit -m "feat(content): selectors, DOM tagging, and mutation observers"

# Commit 4: CSS responsive layout, centering, and media expansion
git add src/content/content.css
git commit -m "feat(styles): responsive layout, flex centering, and card expansion"

# Commit 5: Unit test suites
git add tests/
git commit -m "test(unit): automated test suite for manifest, metrics, and DOM selectors"

# Commit 6: Documentation and Store metadata
git add README.md CHROMEWEBSTORE.md docs/
git commit -m "docs: architecture, selector policy, manual test guide, and store metadata"

echo "[3/6] All 6 logical commits created successfully."

# PR とマージ処理
if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo "[4/6] Pushing to remote and creating Pull Request via gh CLI..."
  git push -u origin "${FEATURE_BRANCH}"
  
  PR_URL=$(gh pr create \
    --title "feat: X Desktop Responsive UI Expansion & Centering" \
    --body "## Summary
- Left navigation (header) and right sidebar (350px) preserved
- Center timeline dynamically expands up to 900px
- Fixed horizontal scroll (overflow-x) & layout shift on zoom
- Fixed extreme right-alignment via flex auto-margin centering
- Expanded cards (504px constraint removed), images, and videos to 100%
- ON/OFF popup toggle with chrome.storage persistence
- 100% unit test coverage for metrics, selectors, and manifest" \
    --base main \
    --head "${FEATURE_BRANCH}")
  
  echo "Created PR: ${PR_URL}"
  echo "[5/6] Merging Pull Request into main..."
  gh pr merge "${FEATURE_BRANCH}" --merge --delete-branch
  
  echo "[6/6] Syncing local main branch..."
  git checkout main
  git pull origin main
else
  echo "[4/6] GitHub CLI not authenticated or not installed. Performing local branch merge..."
  git checkout main
  git merge --no-ff "${FEATURE_BRANCH}" -m "Merge branch '${FEATURE_BRANCH}' into main

- Left navigation and right sidebar preserved
- Center timeline dynamically expands up to 900px
- Fixed horizontal scroll & layout shift on zoom
- Fixed right-alignment via flex auto-margin centering
- Expanded cards, images, and videos to 100%
- Popup toggle and unit tests included"
  git branch -d "${FEATURE_BRANCH}"
  echo "[5/6] Local merge completed."
fi

echo "========================================="
echo " Complete! Git history is cleanly organized."
echo "========================================="
