import { rmSync } from 'node:fs';

export default function clean() {
  rmSync('../../perf/results/flow', { recursive: true, force: true });
}
