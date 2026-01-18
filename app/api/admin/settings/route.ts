import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { headers } from 'next/headers';

// GET: Anyone can read settings (Operators need to know the rules)
export async function GET() {
    // Get latest config
    const config = await db.analysisConfig.findFirst({ orderBy: { id: 'desc' } }); // Ideally orderBy createdAt if available, id works for simple seq
    const rule = await db.qualityRule.findFirst({ orderBy: { id: 'desc' } });

    return NextResponse.json({
        confThreshold: config?.confidence || 0.35,
        useRoi: config?.useRoi ?? true,
        maxAllowedDefects: rule?.maxAllowedDefects || 0
    });
}

// POST: Only Admin can write settings
export async function POST(req: Request) {
    const headersList = await headers();
    const token = headersList.get('authorization')?.split(' ')[1];
    const session = await db.session.findUnique({ where: { id: token }, include: { operator: true } });
    
    if (session?.operator.role !== 'ADMIN') return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { confThreshold, useRoi, maxAllowedDefects } = await req.json();

    // Create new immutable records (Versioning)
    await db.analysisConfig.create({
        data: {
            confidence: parseFloat(confThreshold),
            useRoi: !!useRoi,
            hash: `${confThreshold}-${useRoi}-${Date.now()}` // Ensure uniqueness
        }
    });

    await db.qualityRule.create({
        data: { maxAllowedDefects: parseInt(maxAllowedDefects) }
    });

    return NextResponse.json({ success: true });
}