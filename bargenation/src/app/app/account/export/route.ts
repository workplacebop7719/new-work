import { NextResponse } from 'next/server';
import { readSession } from '@/auth/session';
import { exportAccount, memberFeaturesAvailable } from '@/data/member-repository';

/**
 * EXPORT MY DATA (PRD §37).
 *
 * A route handler rather than a server action, because the honest form of
 * "give me my data" is a file the customer keeps, and only a response with
 * Content-Disposition produces one. An action could render the JSON on screen,
 * which is a demo of an export rather than an export.
 *
 * The scope is decided by row level security, not by this file: `exportAccount`
 * runs as the customer. There is no profile id parameter to get wrong, which
 * matters more here than anywhere — an export that reached another household
 * would hand one customer another's children's sizes in a file they keep.
 *
 * no-store because the response is somebody's personal data and has no
 * business in a shared cache.
 */
export async function GET(): Promise<Response> {
  const session = await readSession();
  if (!session) {
    // Not 403: whether an export exists is not something an anonymous caller
    // gets to learn. The portal is behind a session check anyway.
    return new NextResponse('Not found', { status: 404 });
  }

  if (!memberFeaturesAvailable) {
    return NextResponse.json(
      { error: 'Exports need a database, and none is configured here.' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }

  const data = await exportAccount(session.user.id);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="bargenation-${stamp}.json"`,
      'cache-control': 'no-store',
    },
  });
}
