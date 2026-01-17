import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    
    if (token) {
      await db.session.deleteMany({ where: { id: token } });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}