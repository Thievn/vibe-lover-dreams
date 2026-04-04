

# Fix: Preview Not Loading

## Diagnosis

The app builds successfully with zero errors. All dependencies are installed. The dev server is running on port 8080. The console logs show only WebSocket HMR connection failures — this is a transient preview connectivity issue, not a code problem.

## Root Cause

The preview iframe's WebSocket connection to the dev server dropped. This prevents the page from hot-reloading and can sometimes cause the preview to appear blank or stuck.

## Fix

**No code changes needed.** A simple page refresh or a trivial code touch will restart the connection:

1. Make a no-op edit (add a comment or whitespace) to any file to trigger a dev server rebuild and re-establish the preview connection
2. This will force the preview to reconnect and render the app

## What You Should See After

- The age verification gate (if not previously verified)
- Or the full landing page with navbar, hero, companion gallery, features, and footer

