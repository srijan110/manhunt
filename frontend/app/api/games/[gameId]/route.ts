import { NextResponse } from 'next/server';

export async function GET(request: Request, { params }: { params: { gameId: string } }) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/games/${params.gameId}`, {
      method: 'GET',
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
