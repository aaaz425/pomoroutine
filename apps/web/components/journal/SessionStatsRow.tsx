import { formatDuration } from '@pomoroutine/shared';
import type { Session } from '@/types';

interface Props {
  session: Session;
}

export function SessionStatsRow({ session }: Props) {
  return (
    <div className="flex">
      <div className="flex-1 flex flex-col gap-1 pr-4 border-r border-border">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          집중 시간
        </span>
        <span className="text-base font-bold text-foreground">
          {formatDuration(session.focusSeconds)}
        </span>
      </div>
      <div className="flex-1 flex flex-col gap-1 pl-4">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {session.mode === 'free' ? '방식' : '사이클'}
        </span>
        <span className="text-base font-bold text-foreground">
          {session.mode === 'free'
            ? '자유 집중'
            : `${session.completedCycles} / ${session.totalCycles}`}
        </span>
      </div>
    </div>
  );
}
