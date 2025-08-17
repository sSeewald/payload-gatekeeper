# Contributing to Payload Gatekeeper

Thank you for your interest in contributing to Payload Gatekeeper! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Development Setup](#development-setup)
- [Branch Management & Versioning](#branch-management--versioning)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Git

### Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/payload-gatekeeper.git
   cd payload-gatekeeper
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run tests to verify setup:
   ```bash
   npm test
   ```

5. Start development:
   ```bash
   npm run dev  # Watch mode for TypeScript
   ```

## Branch Management & Versioning

### 🌿 Branch Naming Convention

We use **branch names to automatically determine version bumps**. When you create a PR and merge it to main, the version is automatically updated based on your branch prefix:

| Branch Prefix | Version Bump | Example | Use Case |
|--------------|--------------|---------|----------|
| `fix/*` | **patch** | 1.0.0 → 1.0.1 | Bug fixes |
| `bugfix/*` | **patch** | 1.0.0 → 1.0.1 | Bug fixes |
| `hotfix/*` | **patch** | 1.0.0 → 1.0.1 | Urgent fixes |
| `feature/*` | **minor** | 1.0.0 → 1.1.0 | New features |
| `feat/*` | **minor** | 1.0.0 → 1.1.0 | New features |
| `major/*` | **major** | 1.0.0 → 2.0.0 | Breaking changes |
| `breaking/*` | **major** | 1.0.0 → 2.0.0 | Breaking changes |
| `chore/*` | no bump | - | Maintenance tasks |
| `docs/*` | no bump | - | Documentation only |
| `test/*` | no bump | - | Test improvements |
| `ci/*` | no bump | - | CI/CD changes |
| `refactor/*` | no bump | - | Code refactoring |
| `style/*` | no bump | - | Code style changes |

### 📝 Examples

```bash
# Bug fix - will bump patch version
git checkout -b fix/permission-check-error

# New feature - will bump minor version
git checkout -b feature/add-wildcard-support

# Breaking change - will bump major version
git checkout -b major/redesign-api

# Documentation - no version bump
git checkout -b docs/update-readme
```

### 🤖 Automatic Version & Release Process

When you merge a PR to `main`:

1. **GitHub Actions automatically**:
   - Detects your branch prefix
   - Bumps the version in package.json
   - Creates a git commit with the new version
   - Creates a git tag (e.g., v1.0.1)
   - Creates a GitHub Release with auto-generated notes

2. **npm Publishing** (manual step):
   - Go to Actions → "Publish to npm"
   - Click "Run workflow"
   - Optional: Run with dry-run first to test
   - The current version from package.json will be published

### ⚠️ Important Notes

- **Never manually edit the version** in package.json on feature branches
- **Version bumps are automatic** based on your branch name
- **npm publishing is manual** to ensure control over releases
- Commits from the bot include `[skip ci]` to prevent loops
- **Dependabot PRs** do NOT trigger version bumps (handled separately)

### 🤖 Dependabot Updates

Dependabot automatically creates PRs for dependency updates. These are handled specially:

- **No automatic version bump** - Dependabot branches are ignored
- **Commit prefix**: All Dependabot commits start with `chore:`
- **Labels**: PRs are labeled with `dependencies` and `automated`
- **Grouped updates**: Dependencies are grouped to reduce PR noise

#### When to create a release after Dependabot updates:

| Update Type | Recommended Action | Example Branch |
|------------|-------------------|----------------|
| Security fixes | Create `fix/security-updates` PR | → patch version |
| Major dependency update | Create `feature/update-dependencies` PR | → minor version |
| Breaking dependency changes | Create `major/dependency-breaking-changes` PR | → major version |
| Dev dependency updates only | Just merge, no release needed | → no version |

Example workflow for important dependency updates:
```bash
# After merging Dependabot PR
git checkout -b fix/security-updates
git commit --allow-empty -m "Release for security updates"
git push origin fix/security-updates
# Create PR → will trigger patch version
```

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Provide proper types (avoid `any`)
- Document complex types

### Formatting

We use ESLint and Prettier. Run before committing:

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
npm run type-check  # Check TypeScript
```

### Commit Messages

While not required for versioning (we use branch names), good commit messages help with release notes:

```bash
# Good
git commit -m "Fix permission check for wildcard operations"
git commit -m "Add support for custom operations"
git commit -m "Update TypeScript to 5.0"

# Less helpful
git commit -m "Fix bug"
git commit -m "Update code"
```

## Testing

### Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

### Writing Tests

- Write tests for all new features
- Maintain >80% code coverage
- Use descriptive test names
- Test edge cases

Example test structure:
```typescript
describe('PermissionCheck', () => {
  describe('wildcard permissions', () => {
    it('should grant access with * permission', () => {
      // Test implementation
    })
  })
})
```

## Pull Request Process

### Before Creating a PR

1. **Choose the right branch name** (see Branch Management above)
2. **Ensure all tests pass**: `npm test`
3. **Check linting**: `npm run lint`
4. **Verify types**: `npm run type-check`
5. **Update tests** if needed
6. **Update documentation** if needed

### PR Guidelines

1. **Create a feature branch** with appropriate prefix:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

3. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**:
   - Use a clear, descriptive title
   - Reference any related issues
   - Describe what changes and why
   - Include screenshots if UI changes

5. **PR will automatically**:
   - Run tests
   - Check linting
   - Check types
   - Generate coverage report

### After PR Merge

Your PR merge will automatically:
- ✅ Bump version based on branch prefix
- ✅ Create git tag
- ✅ Create GitHub Release
- ⏸️ npm publish requires manual trigger

## Release Process

### Automatic Steps (on PR merge)

Based on your branch name, the system automatically:

1. **Determines version bump**:
   - `fix/*` → patch (1.0.0 → 1.0.1)
   - `feature/*` → minor (1.0.0 → 1.1.0)
   - `major/*` → major (1.0.0 → 2.0.0)

2. **Updates package.json** with new version
3. **Creates git tag** (e.g., v1.0.1)
4. **Creates GitHub Release** with changelog

### Manual npm Publishing

When ready to publish to npm:

1. Go to [Actions](../../actions) → "Publish to npm"
2. Click "Run workflow"
3. Options:
   - **Dry run**: Test without publishing
   - **Tag**: Choose npm tag (latest, beta, next, alpha)
4. Click "Run workflow"

The workflow will:
- Verify version doesn't already exist
- Run tests
- Build package
- Publish to npm with provenance

### First-Time Setup

For maintainers setting up npm publishing:

1. Create npm account at [npmjs.com](https://www.npmjs.com)
2. Generate access token (Classic, Publish permission)
3. Add as GitHub Secret: `NPM_TOKEN`

## Questions or Issues?

- Open an [issue](https://github.com/sSeewald/payload-gatekeeper/issues)
- Start a [discussion](https://github.com/sSeewald/payload-gatekeeper/discussions)
- Check existing [PRs](https://github.com/sSeewald/payload-gatekeeper/pulls)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.