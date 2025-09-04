# GitHub Commands for sign-pdf Repository

## GitHub CLI Issue Management
```bash
# Create new issue
gh issue create --title "Issue Title" --body-file FILENAME.md --label "bug"

# List issues
gh issue list

# View issue details
gh issue view 1

# Close issue
gh issue close 1

# Reopen issue  
gh issue reopen 1

# Add comment to issue
gh issue comment 1 --body "Comment text"
```

## Available Labels
- `bug` - Something isn't working
- `documentation` - Improvements or additions to documentation  
- `enhancement` - New feature or request
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed

## Issue References
- Current critical issue: https://github.com/mattsilv/sign-pdf/issues/1
- Investigation guide: `docs/COORDINATE_BUG_INVESTIGATION.md`
- Test PDF: `coordinate_test.pdf`