import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { sendPasswordResetEmail } from '@/app/lib/email';

// Helper to generate a random password (8 chars)
const generateTempPassword = () => Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-2).toUpperCase();

export async function POST(req: Request) {
    try {
        // 1. Verify Admin
        const headersList = await headers();
        const token = headersList.get('authorization')?.split(' ')[1];
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const session = await db.session.findUnique({ where: { id: token }, include: { operator: true } });
        
        // Security Check: Role + Valid Session
        if (!session || !session.isValid || session.operator.role !== 'ADMIN') {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 2. Get Input
        const { userId, email } = await req.json(); 
        if (!userId) return NextResponse.json({ error: "Missing User ID" }, { status: 400 });

        // 3. Find User
        const user = await db.operator.findUnique({ where: { id: userId } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // 4. Handle Email Address
        const targetEmail = email || user.email;
        if (!targetEmail) {
            return NextResponse.json({ error: "User has no email. Please provide one." }, { status: 400 });
        }

        // 5. Generate & Hash Password
        const tempPass = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPass, 10);

        // 6. Update User Record
        await db.operator.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: true,
                email: targetEmail, 
                isActive: true // Re-activate if they were inactive
            }
        });

        // 7. Revoke existing sessions (CRITICAL FIX)
        // We use updateMany instead of deleteMany to prevent foreign key errors
        await db.session.updateMany({ 
            where: { operatorId: userId },
            data: { isValid: false } 
        });

        // 8. Send Email
        await sendPasswordResetEmail(targetEmail, tempPass);

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error("Reset Error:", e);
        return NextResponse.json({ error: "Reset failed. Check server logs." }, { status: 500 });
    }
}