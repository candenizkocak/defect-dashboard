// app/api/admin/charts/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { headers } from 'next/headers';

export async function GET() {
  try {
    // 1. Security Check
    const headersList = await headers();
    const token = headersList.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const session = await db.session.findUnique({ where: { id: token }, include: { operator: true } });
    if (session?.operator.role !== 'ADMIN') return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2. Date Range (Last 7 Days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 3. AGGREGATION 1: Daily Production & Yield
    // We fetch runs from the last 7 days
    const recentRuns = await db.analysisRun.findMany({
        where: { timing: { startedAt: { gte: sevenDaysAgo } } },
        select: {
            qualityResult: { select: { passed: true } },
            timing: { select: { startedAt: true } }
        },
        orderBy: { timing: { startedAt: 'asc' } }
    });

    // Bucket by Day
    const dailyStats = new Map();
    recentRuns.forEach(run => {
        const date = run.timing?.startedAt.toISOString().split('T')[0]; // YYYY-MM-DD
        if (!date) return;

        if (!dailyStats.has(date)) {
            dailyStats.set(date, { date, total: 0, passed: 0 });
        }
        const entry = dailyStats.get(date);
        entry.total++;
        if (run.qualityResult?.passed) entry.passed++;
    });

    const trendData = Array.from(dailyStats.values()).map((d: any) => ({
        ...d,
        yieldRate: Math.round((d.passed / d.total) * 100)
    }));

    // 4. AGGREGATION 2: Defect Pareto (Top Defects)
    const defectCounts = await db.detection.groupBy({
        by: ['classId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
    });

    // We need to resolve Class IDs to Names
    const defectTypes = await Promise.all(defectCounts.map(async (d) => {
        const cls = await db.defectClass.findUnique({ where: { id: d.classId } });
        return { name: cls?.label || 'Unknown', count: d._count.id };
    }));

    // 5. AGGREGATION 3: Operator Performance
    // Who is doing the most work?
    const operatorStats = await db.batch.groupBy({
        by: ['sessionId'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5
    });

    // Resolve Sessions to Names
    const topOperators = await Promise.all(operatorStats.map(async (o) => {
        const sess = await db.session.findUnique({ 
            where: { id: o.sessionId },
            include: { operator: true }
        });
        return { name: sess?.operator.name || 'Unknown', batches: o._count.id };
    }));

    return NextResponse.json({
        trend: trendData,
        defects: defectTypes,
        operators: topOperators
    });

  } catch (error) {
    console.error("Chart API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}