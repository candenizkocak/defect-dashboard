import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Check if exists
    const existing = await db.operator.findUnique({ where: { name: username } });
    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    // Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create User
    const operator = await db.operator.create({
      data: {
        name: username,
        password: hashedPassword,
        role: "ADMIN" // First user is admin
      }
    });

    return NextResponse.json({ success: true, operator: operator.name });

  } catch (error) {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}