import { ActionItem } from '@/types';
import { Separator } from '@/components/ui/separator';

interface SummaryPanelProps {
  summary: string | null;
  keyPoints: string[] | null;
  actionItems: ActionItem[] | null;
  decisions: string[] | null;
}

export default function SummaryPanel({ summary, keyPoints, actionItems, decisions }: SummaryPanelProps) {
  if (!summary) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 bg-muted rounded w-full" />
        <div className="h-4 bg-muted rounded w-5/6" />
        <div className="h-4 bg-muted rounded w-3/4" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Summary</h3>
        <p className="text-sm leading-relaxed">{summary}</p>
      </div>

      {keyPoints && keyPoints.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Key Points</h3>
            <ul className="space-y-1">
              {keyPoints.map((point, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-muted-foreground mt-0.5">•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {actionItems && actionItems.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Action Items</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Task</th>
                  <th className="pb-2 font-medium w-32">Owner</th>
                </tr>
              </thead>
              <tbody>
                {actionItems.map((item, i) => (
                  <tr key={i} className="border-t border-muted">
                    <td className="py-2 pr-4">{item.task}</td>
                    <td className="py-2 text-muted-foreground">{item.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {decisions && decisions.length > 0 && (
        <>
          <Separator />
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-2">Decisions</h3>
            <ul className="space-y-1">
              {decisions.map((decision, i) => (
                <li key={i} className="text-sm flex gap-2">
                  <span className="text-muted-foreground mt-0.5">✓</span>
                  <span>{decision}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
