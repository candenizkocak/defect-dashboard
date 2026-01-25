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

    if (operator.isActive === false) {
        return NextResponse.json({ error: "Account is deactivated. Contact Admin." }, { status: 403 });
    }

    const isValid = await bcrypt.compare(password, operator.password);
    
    if (!isValid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // --- NEW LOGIC: FORCE PASSWORD CHANGE ---
    if (operator.mustChangePassword) {
        // Do NOT create a session yet.
        // Return a special flag telling UI to show the "Set New Password" screen.
        return NextResponse.json({ 
            requireChange: true,
            userId: operator.id
        });
    }

    // Normal Login
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