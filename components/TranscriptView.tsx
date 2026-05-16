interface TranscriptViewProps {
  transcript: string | null;
}

export default function TranscriptView({ transcript }: TranscriptViewProps) {
  if (!transcript) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-4/6" />
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-3/4" />
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-y-auto rounded-lg bg-muted/30 p-4">
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
    </div>
  );
}
