export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="relative min-h-screen bg-surface text-ink">{children}</div>;
}
