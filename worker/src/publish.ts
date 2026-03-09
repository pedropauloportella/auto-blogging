// publish.ts - create file on GitHub using GITHUB_TOKEN
import { Env } from './types';
export async function publishHandler(request: Request, env: Env) {
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Bearer ') || auth.split(' ')[1] !== env.API_TOKEN) return new Response('Unauthorized', { status: 401 });
  const { draftId } = await request.json();
  const draftRaw = await env.POSTS_KV.get('draft:' + draftId);
  if (!draftRaw) return new Response('Draft not found', { status: 404 });
  const draft = JSON.parse(draftRaw);
  const path = `posts/${new Date().toISOString().slice(0,10)}-${draft.slug}.md`;
  const content = Buffer.from(draft.content, 'utf8').toString('base64');
  const res = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, 'Content-Type':'application/json' },
    body: JSON.stringify({ message: `chore(ai): publish post ${draft.title}`, content, committer: { name: 'AI Bot', email: 'ai@example.com' } })
  });
  const j = await res.json();
  if (res.status >= 400) return new Response(JSON.stringify({ error: j }), { status: 500, headers: { 'Content-Type':'application/json' }});
  draft.status = 'published';
  await env.POSTS_KV.put('draft:' + draftId, JSON.stringify(draft));
  return new Response(JSON.stringify({ ok: true, commit: j }), { headers: { 'Content-Type':'application/json' }});
}
