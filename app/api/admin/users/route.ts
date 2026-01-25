// app/api/admin/users/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';

// Helper: Verify Admin Access
async function verifyAdmin() {
    const headersList = await headers();
    const token = headersList.get('authorization')?.split(' ')[1];
    
    if (!token) return null;

    const session = await db.session.findUnique({
        where: { id: token },
        include: { operator: true }
    });

    if (!session || session.operator.role !== 'ADMIN') return null;
    return session.operator;
}

// GET: List all users
export async function GET() {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const users = await db.operator.findMany({
        select: { 
            id: true, 
            name: true,       // Username
            firstName: true,  // New
            lastName: true,   // New
            role: true, 
            isActive: true, 
            createdAt: true 
        },
        orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(users);
}

// POST: Create new user
export async function POST(req: Request) {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        // 1. Destructure email from the request body
        const { username, firstName, lastName, email, password, role } = await req.json();

        if (!username || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

        const existing = await db.operator.findUnique({ where: { name: username } });
        if (existing) return NextResponse.json({ error: "Username already exists" }, { status: 400 });

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await db.operator.create({
            data: {
                name: username,
                firstName: firstName || "",
                lastName: lastName || "",
                email: email || null, // <--- 2. Save the email
                password: hashedPassword,
                role: role || 'OPERATOR',
                isActive: true
            }
        });

        return NextResponse.json(newUser);
    } catch (e) {
        return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }
}

// DELETE: Soft Delete (Deactivate)
export async function DELETE(req: Request) {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        if (id === admin.id) return NextResponse.json({ error: "Cannot deactivate yourself" }, { status: 400 });

        // Fetch current name to append suffix
        const current = await db.operator.findUnique({ where: { id } });
        if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Prevent double deactivation
        if (!current.isActive) return NextResponse.json({ success: true });

        await db.operator.update({ 
            where: { id },
            data: { 
                isActive: false,
                name: `${current.name} (Inactive)` 
            }
        });

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Deactivation failed" }, { status: 500 });
    }
}

// PATCH: Reactivate User
export async function PATCH(req: Request) {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
        const { id } = await req.json();

        if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

        const current = await db.operator.findUnique({ where: { id } });
        if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // Restore Name (Remove " (Inactive)")
        const restoredName = current.name.replace(" (Inactive)", "");

        await db.operator.update({
            where: { id },
            data: {
                isActive: true,
                name: restoredName
            }
        });

        return NextResponse.json({ success: true });

    } catch (e) {
        return NextResponse.json({ error: "Reactivation failed" }, { status: 500 });
    }
}