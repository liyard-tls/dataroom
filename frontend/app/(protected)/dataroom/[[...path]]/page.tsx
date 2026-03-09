// Layout at app/(protected)/dataroom/layout.tsx renders the full UI (Sidebar, MainPanel, DnD).
// This page component intentionally returns null — Next.js requires a page.tsx for the route
// to exist, but all rendering is handled by the stable layout above.
export default function DataRoomPage() {
  return null;
}
