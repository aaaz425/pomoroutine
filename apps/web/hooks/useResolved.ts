import { useEffect, useState } from 'react';

export function useResolved<T>(promise: Promise<T>): T | undefined {
  const [value, setValue] = useState<{ resolved: T } | null>(null);

  useEffect(() => {
    let active = true;
    promise.then((resolved) => {
      if (active) setValue({ resolved });
    });
    return () => {
      active = false;
    };
  }, [promise]);

  return value?.resolved;
}
