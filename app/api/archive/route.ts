import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db'; 
import { headers } from 'next/headers';

export async function GET(req: Request) {
  try {
    const headersList = await headers();
    const token = headersList.get('authorization')?.split(' ')[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    const operatorParam = searchParams.get('operator');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const status = searchParams.get('status');
    const sortField = searchParams.get('sortField') || 'date'; 
    const sortDir = searchParams.get('sortDir') || 'desc';

    // Build Where Clause
    const whereClause: any = {};
    if (status === 'passed') whereClause.qualityResult = { passed: true };
    if (status === 'failed') whereClause.qualityResult = { passed: false };
    
    if (operatorParam) {
        const names = operatorParam.split(',').filter(Boolean);
        if (names.length > 0) {
            whereClause.image = { batch: { session: { operator: { name: { in: names } } } } };
        }
    }

    if (startDate || endDate) {
        whereClause.timing = { startedAt: {} };
        if (startDate) whereClause.timing.startedAt.gte = new Date(startDate);
        if (endDate) whereClause.timing.startedAt.lte = new Date(new Date(endDate).setHours(23, 59, 59));
    }

    // Build Order Clause
    let orderBy: any = {};
    if (sortField === 'defects') {
        orderBy = { detections: { _count: sortDir === 'asc' ? 'asc' : 'desc' } };
    } else {
        orderBy = { timing: { startedAt: sortDir === 'asc' ? 'asc' : 'desc' } };
    }

    const history = await db.analysisRun.findMany({
        take: limit,
        skip: (page - 1) * limit,
        where: whereClause,
        orderBy: orderBy,
        include: {
            image: {
                select: {
                    url: true,
                    metadata: { select: { filename: true, width: true, height: true } }, 
                    batch: {
                        select: {
                            name: true,
                            session: { select: { operator: { select: { name: true } } } }
                        }
                    },
                    // --- NEW: Fetch Manual Annotations (Additions) ---
                    manuals: {
                        include: { class: true, box: true }
                    }
                }
            },
            qualityResult: true,
            detections: {
                include: { 
                    class: true,
                    box: true,
                    score: true,
                    // --- NEW: Fetch Interventions (Deletions) ---
                    intervention: true 
                }
            }
        }
    });

    const formatted = history.map(run => {
        // 1. Process AI Detections (Filter out ones with Interventions)
        const activeAiDetections = run.detections
            .filter(d => !d.intervention) // If intervention exists, it was deleted/rejected
            .map(d => ({
                class: d.class.label,
                score: d.score?.score || 1.0,
                box: d.box ? [d.box.x1, d.box.y1, d.box.x2, d.box.y2] : [0,0,0,0]
            }));

        // 2. Process Manual Annotations (Additions)
        const manualDetections = run.image.manuals.map(m => ({
            class: m.class.label,
            score: 1.0, // Manual is always 100% confidence
            box: m.box ? [m.box.x1, m.box.y1, m.box.x2, m.box.y2] : [0,0,0,0]
        }));

        // 3. Merge Lists
        const finalDefects = [...activeAiDetections, ...manualDetections];

        return {
            id: run.id,
            imageUrl: run.image.url,
            filename: run.image.metadata?.filename || 'Unknown',
            timestamp: run.timing?.startedAt || new Date(),
            operator: run.image.batch.session.operator.name,
            // Recalculate status based on current valid defect count? 
            // For now, keep original status, or you could re-evaluate against qualityRule here.
            status: run.qualityResult?.passed ? 'PASS' : 'FAIL', 
            defectCount: finalDefects.length, // Update count to match reality
            results: {
                width: run.image.metadata?.width || 1000,
                height: run.image.metadata?.height || 1000,
                defects: finalDefects
            }
        };
    });

    return NextResponse.json(formatted);

  } catch (error) {
    console.error("Archive API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}