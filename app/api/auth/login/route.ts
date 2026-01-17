import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    // 1. Find User
    const operator = await db.operator.findUnique({ where: { name: username } });
    
    if (!operator) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 2. Compare Password (Crypto check)
    const isValid = await bcrypt.compare(password, operator.password);
    
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 3. Create Session
    const session = await db.session.create({
        data: {
            operatorId: operator.id,
            startedAt: new Date()
        }
    });

    return NextResponse.json({ 
        token: session.id, 
        operator: operator.name 
    });

  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}