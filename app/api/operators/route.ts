// app/api/operators/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { headers } from 'next/headers';

export async function GET() {
    const headersList = await headers();
    const token = headersList.get('authorization')?.split(' ')[1];
    
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const operators = await db.operator.findMany({
        where: { 
            role: 'OPERATOR' // <--- STRICTLY FILTER OPERATORS
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' }
    });

    return NextResponse.json(operators);
}