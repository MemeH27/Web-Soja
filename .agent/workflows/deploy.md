---
description: commit and push all changes to git so Vercel deploys the latest updates
---

// turbo-all
1. Stage all changes:
```
git add -A
```

2. Commit with a descriptive message (replace MESSAGE with a summary of the changes):
```
git commit -m "MESSAGE"
```

3. Push to origin main:
```
git push origin main
```

4. Verify the push was successful:
```
git log --oneline -3
```
