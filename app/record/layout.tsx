export default function RecordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {children}
    </div>
  );
}
