// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const operator = await db.operator.findUnique({ where: { name: username } });
    
    if (!operator || !operator.password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, operator.password);
    
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if user is suspended (Future proofing)
    // if (!operator.isActive) return NextResponse.json({ error: "Account Suspended" }, { status: 403 });

    const session = await db.session.create({
        data: {
            operatorId: operator.id,
            startedAt: new Date()
        }
    });

    return NextResponse.json({ 
        token: session.id, 
        operator: operator.name,
        role: operator.role // <--- CRITICAL: Return the role
    });

  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}