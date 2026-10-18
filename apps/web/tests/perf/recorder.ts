import { gzipSync } from 'node:zlib';
import type { CDPSession, Page } from '@playwright/test';

export interface RequestRecord {
  step: string;
  method: string;
  url: string;
  key: string;
  bodyBytes: number;
  encodedBytes: number;
  gzipBytes: number;
  durationMs: number;
}

interface Pending {
  step: string;
  method: string;
  url: string;
  key: string;
  startedAt: number;
  bodyBytes: number;
}

export class SupabaseRecorder {
  readonly records: RequestRecord[] = [];
  private readonly pending = new Map<string, Pending>();
  private readonly finishing = new Set<Promise<void>>();
  private step = 'setup';

  private constructor(
    private readonly cdp: CDPSession,
    private readonly supabaseUrl: string,
  ) {}

  static async attach(page: Page, supabaseUrl: string) {
    const cdp = await page.context().newCDPSession(page);
    const recorder = new SupabaseRecorder(cdp, supabaseUrl);
    await cdp.send('Network.enable', {
      maxResourceBufferSize: 64 * 1024 * 1024,
      maxTotalBufferSize: 256 * 1024 * 1024,
    });
    recorder.listen();
    return recorder;
  }

  setStep(step: string) {
    this.step = step;
  }

  get inFlight() {
    return this.pending.size + this.finishing.size;
  }

  private listen() {
    this.cdp.on('Network.requestWillBeSent', (e) => {
      const { method, url, postData } = e.request;
      if (!url.startsWith(this.supabaseUrl) || method === 'OPTIONS') return;
      const path = url.slice(this.supabaseUrl.length);
      if (path.startsWith('/auth/')) return;
      this.pending.set(e.requestId, {
        step: this.step,
        method,
        url: path,
        key: `${method} ${path} ${postData ?? ''}`,
        startedAt: e.timestamp,
        bodyBytes: 0,
      });
    });
    this.cdp.on('Network.dataReceived', (e) => {
      const p = this.pending.get(e.requestId);
      if (p) p.bodyBytes += e.dataLength;
    });
    this.cdp.on('Network.loadingFinished', (e) => {
      const p = this.pending.get(e.requestId);
      if (!p) return;
      this.pending.delete(e.requestId);
      const done = this.finish(e.requestId, p, e.encodedDataLength, e.timestamp);
      this.finishing.add(done);
      void done.finally(() => this.finishing.delete(done));
    });
    this.cdp.on('Network.loadingFailed', (e) => {
      this.pending.delete(e.requestId);
    });
  }

  private async finish(requestId: string, p: Pending, encodedBytes: number, finishedAt: number) {
    let gzipBytes = 0;
    try {
      const { body, base64Encoded } = await this.cdp.send('Network.getResponseBody', { requestId });
      const buffer = Buffer.from(body, base64Encoded ? 'base64' : 'utf8');
      gzipBytes = buffer.length > 0 ? gzipSync(buffer).length : 0;
    } catch {
      gzipBytes = 0;
    }
    this.records.push({
      step: p.step,
      method: p.method,
      url: p.url.split('?')[0],
      key: p.key,
      bodyBytes: p.bodyBytes,
      encodedBytes,
      gzipBytes,
      durationMs: (finishedAt - p.startedAt) * 1000,
    });
  }

  async waitForQuiet(page: Page, quietMs = 800) {
    let quietSince = Date.now();
    while (Date.now() - quietSince < quietMs) {
      await page.waitForTimeout(100);
      if (this.inFlight > 0) quietSince = Date.now();
    }
  }
}
