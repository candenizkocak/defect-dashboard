import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { userId, oldPassword, newPassword } = await req.json();

        // 1. Fetch User
        const operator = await db.operator.findUnique({ where: { id: userId } });
        if (!operator) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // 2. Verify Old (Temp) Password again for security
        const isValid = await bcrypt.compare(oldPassword, operator.password);
        if (!isValid) return NextResponse.json({ error: "Invalid temporary password" }, { status: 401 });

        // 3. Hash New Password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 4. Update User
        await db.operator.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: false // Clear the flag
            }
        });

        // 5. Create Session (Log them in automatically)
        const session = await db.session.create({
            data: { operatorId: operator.id, startedAt: new Date() }
        });

        return NextResponse.json({ 
            token: session.id, 
            operator: operator.name,
            role: operator.role
        });

    } catch (e) {
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}