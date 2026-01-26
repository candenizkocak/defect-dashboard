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
    const limit = parseInt(searchParams.get('limit') || '12');
    const operatorParam = searchParams.get('operator');
    const status = searchParams.get('status');
    const sortField = searchParams.get('sortField') || 'date';
    const sortDir = searchParams.get('sortDir') || 'desc';

    const whereClause: any = {};
    if (status === 'passed') whereClause.qualityResult = { passed: true };
    if (status === 'failed') whereClause.qualityResult = { passed: false };
    
    if (operatorParam) {
        const names = operatorParam.split(',').filter(Boolean);
        whereClause.image = { batch: { session: { operator: { name: { in: names } } } } };
    }

    const history = await db.analysisRun.findMany({
        take: limit,
        skip: (page - 1) * limit,
        where: whereClause,
        orderBy: sortField === 'defects' 
            ? { detections: { _count: sortDir as any } } 
            : { timing: { startedAt: sortDir as any } },
        include: {
            image: {
                include: {
                    metadata: true,
                    batch: { include: { session: { include: { operator: true } } } },
                    manuals: { include: { class: true, box: true } }
                }
            },
            qualityResult: true,
            detections: { include: { class: true, box: true, intervention: true } }
        }
    });

    const formatted = history.map(run => {
        const aiDefects = run.detections
            .filter(d => !d.intervention) 
            .map(d => ({
                class: d.class.label,
                score: 0.99,
                box: [d.box!.x1, d.box!.y1, d.box!.x2, d.box!.y2]
            }));

        const manualDefects = run.image.manuals.map(m => ({
            class: m.class.label,
            score: 1.0,
            box: [m.box!.x1, m.box!.y1, m.box!.x2, m.box!.y2]
        }));

        const allDefects = [...aiDefects, ...manualDefects];

        return {
            id: run.id,
            imageUrl: run.image.url,
            filename: run.image.metadata?.filename || 'Unknown',
            timestamp: run.timing?.startedAt || new Date(),
            operator: run.image.batch.session.operator.name,
            status: run.qualityResult?.passed ? 'PASS' : 'FAIL',
            defectCount: allDefects.length,
            results: {
                width: run.image.metadata?.width || 1000,
                height: run.image.metadata?.height || 1000,
                defects: allDefects
            }
        };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Archive API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}