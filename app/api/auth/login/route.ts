// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    // 1. Find operator (Check isActive status implicitly or explicitly)
    const operator = await db.operator.findUnique({ where: { name: username } });
    
    // Check if user exists
    if (!operator || !operator.password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 2. CHECK IF ACTIVE (New Logic)
    if (operator.isActive === false) {
        return NextResponse.json({ error: "Account is deactivated. Contact Admin." }, { status: 403 });
    }

    // 3. Verify Password
    const isValid = await bcrypt.compare(password, operator.password);
    
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const session = await db.session.create({
        data: {
            operatorId: operator.id,
            startedAt: new Date()
        }
    });

    return NextResponse.json({ 
        token: session.id, 
        operator: operator.name,
        role: operator.role 
    });

  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}