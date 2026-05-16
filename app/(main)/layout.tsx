import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { MeetingsProvider } from "@/context/MeetingsContext";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <MeetingsProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </MeetingsProvider>
  );
}
