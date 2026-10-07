// Deine Röhre's calls to Google (app/google-api.mjs) against a stand-in for YouTube: what the search asks and gives.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeApi, unescapeTitle } from '../app/google-api.mjs';

test('titles from a search come back readable', () => {
  assert.equal(unescapeTitle('Rock &amp; Roll &quot;Live&quot; &#39;99 &lt;3 &#x2665;'), 'Rock & Roll "Live" \'99 <3 ♥');
  assert.equal(unescapeTitle('&amp;amp;'), '&amp;');
});

test('search: videos that play in other players, only music when asked, nothing for an empty search', async (t) => {
  const asked = [];
  t.mock.method(globalThis, 'fetch', async (url) => {
    asked.push(new URL(url));
    return new Response(JSON.stringify({ items: [
      { id: { kind: 'youtube#video', videoId: 'dQw4w9WgXcQ' }, snippet: { title: 'Never Gonna &amp; Give', channelTitle: 'Rick', publishedAt: '2009-10-25T06:57:33Z' } },
      { id: { kind: 'youtube#video' }, snippet: { title: 'no id' } },
    ] }), { status: 200 });
  });
  const g = makeApi(async () => 'token');
  assert.deepEqual(await g.search('  rick  ', true), [{ id: 'dQw4w9WgXcQ', title: 'Never Gonna & Give', channel: 'Rick', published: '2009-10-25T06:57:33Z' }]);
  const q = asked[0].searchParams;
  assert.equal(asked[0].pathname, '/youtube/v3/search');
  assert.equal(q.get('q'), 'rick');
  assert.equal(q.get('type'), 'video');
  assert.equal(q.get('videoEmbeddable'), 'true');
  assert.equal(q.get('videoCategoryId'), '10');
  await g.search('rick');
  assert.equal(asked[1].searchParams.get('videoCategoryId'), null);
  assert.deepEqual(await g.search('   '), []);
  assert.equal(asked.length, 2);
});
