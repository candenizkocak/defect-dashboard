// app/api/admin/settings/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { headers } from 'next/headers';

export async function GET() {
    // FIXED: Order by createdAt instead of id
    const config = await db.analysisConfig.findFirst({ orderBy: { createdAt: 'desc' } }); 
    const rule = await db.qualityRule.findFirst({ orderBy: { createdAt: 'desc' } });

    return NextResponse.json({
        confThreshold: config?.confidence ?? 0.35,
        useRoi: config?.useRoi ?? true,
        maxAllowedDefects: rule?.maxAllowedDefects ?? 0
    });
}

export async function POST(req: Request) {
    const headersList = await headers();
    const token = headersList.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const session = await db.session.findUnique({ 
        where: { id: token }, 
        include: { operator: true } 
    });
    
    if (session?.operator.role !== 'ADMIN') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { confThreshold, useRoi, maxAllowedDefects } = await req.json();

    // Create new records with unique hashes to ensure they are treated as the "latest"
    await db.analysisConfig.create({
        data: {
            confidence: parseFloat(confThreshold),
            useRoi: !!useRoi,
            hash: `config-${Date.now()}-${Math.random()}` // Ensure uniqueness for the new latest
        }
    });

    await db.qualityRule.create({
        data: { maxAllowedDefects: parseInt(maxAllowedDefects) }
    });

    return NextResponse.json({ success: true });
}