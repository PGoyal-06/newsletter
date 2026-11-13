import { Button } from "./Button";

export interface EmptyStateProps {
  message: string;
  detail?: string;
  action?: { label: string; onClick(): void };
}

/** What a list shows when it has nothing in it. Set at reading size, not small print. */
export function EmptyState({ message, detail, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-start gap-sm py-lg">
      <p className="text-body font-semibold">{message}</p>
      {detail && <p className="text-body text-text-muted">{detail}</p>}
      {action && (
        <Button variant="secondary" onClick={action.onClick} className="mt-sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
