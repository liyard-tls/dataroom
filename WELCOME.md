# Welcome to Data Room

Welcome to **Data Room**.

This product was built as a **take-home assignment MVP** based on the briefs in `old.docx` and `new.docx`.
It is designed to demonstrate practical UX and end-to-end document workflows.

## Assignment Context

The app simulates a virtual data room used for due diligence:
- organize files and folders
- preview documents in-browser
- import files from Google Drive
- share content via public links

This is a demo-ready implementation focused on functionality, usability, and clean flows.

## Quick Product Tour (2-3 minutes)

1. Sign in with `Email/Password`, `Google`, or `Apple`.
2. Create a folder and upload one or more files.
3. Open a file preview.
4. Use search to find a file/folder.
5. Create a share link for a file or folder.
6. (Optional) Import files from Google Drive.

## What You Can Do in Data Room

- Store files and folders in a structured hierarchy.
- Preview PDF, images, videos, text files, and Markdown.
- Find content quickly with global search.
- Share files or folders using a public link.
- Import files from Google Drive.

## Working with Files

### Uploading

- Drag files into the main area or directly into a target folder.
- Or click **Upload files** and choose files from your device.
- Maximum size per file: **20 MB**.

### Preview

- Click a file to open the built-in viewer.
- Press `Esc` to close the viewer.

### Move and Organize

- Drag and drop files and folders between folders.
- If the target folder already has the same name, the app handles naming safely.

### Delete

- Select one or multiple items.
- Press `Delete` or use the actions menu.

## Search and Navigation

- The search bar returns file and folder results in real time.
- Use `↑` / `↓` to navigate results and `Enter` to open the selected result.
- Press `Backspace` to go up one folder level.

## Sharing

- Use **Share** on any file or folder.
- The app generates a public link you can copy.
- Anyone with the link can view and download content without signing in.
- You can revoke a link at any time.

## Google Drive Import

- Click **Import from Google Drive**.
- Connect your Google account.
- Select files and import them into the current folder.

## Favorites

- Star important files or folders.
- Starred items appear in **Favorites** for quick access.

## Keyboard Shortcuts

| Action                         | Windows / Linux | macOS |
| ------------------------------ | --------------- | ----- |
| Upload files                   | `Ctrl+U`        | `⌘U`  |
| Create folder                  | `Ctrl+Shift+F`  | `⌘⇧F` |
| Import from Google Drive       | `Ctrl+Shift+G`  | `⌘⇧G` |
| Search                         | `Ctrl+F`        | `⌘F`  |
| Select all                     | `Ctrl+A`        | `⌘A`  |
| Toggle sidebar                 | `Ctrl+B`        | `⌘B`  |
| Close viewer / clear selection | `Esc`           | `Esc` |

## Notes for Evaluators

- This project is intentionally scoped as a take-home assignment.
- The implementation prioritizes practical UX flows and requirement coverage over enterprise-hardening.
- Some extended features (auth/search/sharing polish) are included as value-add beyond minimal CRUD.
