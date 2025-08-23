# GitHub Actions Workflows

This document describes the automated workflows for the Grabby extension located in `.github/workflows/`.

## Workflows

### 1. Development Build (`.github/workflows/development-build.yml`)
- **Trigger**: Automatically runs on every push to main branch
- **Purpose**: Creates/updates a single "Latest Development Release"
- **Actions**:
  - Runs lint checks
  - Builds the extension
  - Creates/updates the `latest-dev` release
  - Uploads the built ZIP file

### 2. Release (`.github/workflows/release.yml`)
- **Trigger**: Manual dispatch only (workflow_dispatch)
- **Purpose**: Creates new release versions
- **Actions**:
  - Tags current version as a release
  - Builds and uploads the ZIP file
  - Bumps version for next development cycle
  - Updates version in all files (package.json, manifest.json, HTML files)
  - Commits version changes

## Usage

### For Development Builds
Simply push to the main branch. The latest development build will be automatically created/updated at:
https://github.com/[your-username]/Grabby/releases/tag/latest-dev

### For Releases
1. Go to Actions tab in GitHub
2. Select "Release" workflow
3. Click "Run workflow"
4. Choose release type (patch/minor/major)
5. Add release notes (optional)
6. Click "Run workflow"

The workflow will automatically:
- Tag the current version as a release
- Build and upload the extension ZIP
- Bump the version for next development cycle
- Create a git commit with the version change

## Notes
- Development builds are marked as pre-releases
- Only one "Latest Development Release" exists at any time (automatically replaced)
- Releases are permanent and tagged with version numbers
- All builds run lint checks before proceeding  
- Build artifacts are retained for 3 days (dev) or 30 days (releases)
- Release tags use format: `latest-dev` (development) and `release-0.0.2` (releases)