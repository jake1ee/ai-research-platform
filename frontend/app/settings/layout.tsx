import { Sidebar } from '@/components/layout/Sidebar';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950">
      <Sidebar />
      <div className="flex-1 overflow-y-auto dark-scroll">{children}</div>
    </div>
  );
}
