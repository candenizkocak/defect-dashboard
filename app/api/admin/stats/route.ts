// app/api/admin/stats/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const operatorsParam = searchParams.get('operators');
    const sortDir = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc'; // Default desc
    
    const sessionFilter: any = {};
    if (operatorsParam) {
        const names = operatorsParam.split(',').filter(Boolean);
        if (names.length > 0) sessionFilter.operator = { name: { in: names } };
    }

    // Common ordering
    const orderBy = { timestamp: sortDir }; // For interventions
    const orderByCreated = { createdAt: sortDir }; // For manuals
    const orderByExport = { exportedAt: sortDir }; // For exports

    const interventions = await db.userIntervention.findMany({
        take: 50,
        orderBy: orderBy,
        where: { session: sessionFilter },
        include: { 
            session: { include: { operator: true } },
            detection: { include: { class: true } }
        }
    });

    const manuals = await db.manualAnnotation.findMany({
        take: 50,
        orderBy: orderByCreated,
        where: { image: { batch: { session: sessionFilter } } },
        include: { 
            image: { include: { batch: { include: { session: { include: { operator: true } } } } } },
            class: true 
        }
    });

    const exports = await db.datasetExport.findMany({
        take: 20,
        orderBy: orderByExport,
        where: { batch: { session: sessionFilter } },
        include: { batch: { include: { session: { include: { operator: true } } } } }
    });

    return NextResponse.json({ interventions, manuals, exports });
}