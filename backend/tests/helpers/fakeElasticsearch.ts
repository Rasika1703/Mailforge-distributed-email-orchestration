import http from 'http';
import type { Server } from 'http';

export interface FakeEs {
  docs: Map<string, any>;
  requests: { method: string; url: string; body: any }[];
  stop(): Promise<void>;
}

export async function startFakeEs(port = 9299): Promise<FakeEs> {
  const docs = new Map<string, any>();
  const requests: FakeEs['requests'] = [];
  let indexExists = false;

  const server: Server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      res.setHeader('x-elastic-product', 'Elasticsearch');
      res.setHeader('content-type', 'application/json');
      const url = req.url!;
      const isBulk = url.startsWith('/_bulk');
      let body: any = raw;
      if (!isBulk) { try { body = raw ? JSON.parse(raw) : undefined; } catch { /* not json */ } }
      requests.push({ method: req.method!, url, body });

      if (req.method === 'HEAD') { res.statusCode = indexExists ? 200 : 404; return res.end(); }
      if (req.method === 'PUT' && url === '/emails') { indexExists = true; return res.end('{"acknowledged":true}'); }
      if (req.method === 'PUT' && url.startsWith('/emails/_doc/')) {
        docs.set(decodeURIComponent(url.split('/')[3].split('?')[0]), body);
        res.statusCode = 201;
        return res.end('{"result":"created"}');
      }
      if (isBulk) {
        const lines = raw.trim().split('\n').map((l) => JSON.parse(l));
        for (let i = 0; i < lines.length; i += 2) docs.set(lines[i].index._id, lines[i + 1]);
        return res.end('{"errors":false,"items":[]}');
      }
      if (url.includes('/_search')) {
        const { bool } = body.query;
        const terms = (bool.filter as any[]).map((f) => f.term);
        const mm = (bool.must as any[])[0].multi_match;
        let hits = [...docs.values()].filter((d) => terms.every((t) => Object.entries(t).every(([k, v]) => d[k] === v)));
        if (mm) {
          const fields = (mm.fields as string[]).map((f) => f.split('^')[0]);
          const words = String(mm.query).toLowerCase().split(/\s+/);
          hits = hits.filter((d) => words.every((w) => fields.some((f) => String(d[f]).toLowerCase().includes(w))));
        }
        const page = hits.slice(body.from, body.from + body.size);
        return res.end(JSON.stringify({ hits: { total: { value: hits.length }, hits: page.map((d) => ({ _source: d })) } }));
      }
      res.statusCode = 404;
      res.end('{}');
    });
  });

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve));
  return {
    docs,
    requests,
    stop: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }),
  };
}
