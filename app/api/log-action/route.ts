import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db'; 

export async function POST(req: Request) {
  try {
    const { actionType, operatorName, filename, details } = await req.json();

    const operator = await db.operator.findUnique({ where: { name: operatorName || "Admin" } });
    if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

    const session = await db.session.findFirst({
        where: { operatorId: operator.id, isValid: true },
        orderBy: { startedAt: 'desc' }
    });
    
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    let imageId = null;
    if (filename) {
        const img = await db.sourceImage.findFirst({
            where: { metadata: { filename: filename } },
            orderBy: { id: 'desc' } 
        });
        imageId = img?.id;
    }

    if (!imageId && (actionType === 'MANUAL_ANNOTATION' || actionType === 'DELETE_INTERVENTION')) {
        return NextResponse.json({ error: "Image context not found" }, { status: 404 });
    }

    if (actionType === 'MANUAL_ANNOTATION') {
        const defectClass = await db.defectClass.upsert({
            where: { label: details.className },
            update: {},
            create: { label: details.className }
        });

        await db.manualAnnotation.create({
            data: {
                imageId: imageId!,
                classId: defectClass.id,
                box: {
                    create: {
                        x1: Math.round(details.box[0]),
                        y1: Math.round(details.box[1]),
                        x2: Math.round(details.box[2]),
                        y2: Math.round(details.box[3])
                    }
                }
            }
        });
    } 
    
    else if (actionType === 'DELETE_INTERVENTION') {
        // --- IMPROVED FUZZY LOOKUP ---
        const x = Math.round(details.box[0]);
        const y = Math.round(details.box[1]);

        const targetDetection = await db.detection.findFirst({
            where: {
                run: { imageId: imageId! },
                class: { label: details.defectClass },
                box: {
                    // Look for a box within 3 pixels of the click
                    x1: { gte: x - 3, lte: x + 3 },
                    y1: { gte: y - 3, lte: y + 3 }
                }
            }
        });

        if (targetDetection) {
            await db.userIntervention.upsert({
                where: { detectionId: targetDetection.id },
                update: { timestamp: new Date() },
                create: {
                    sessionId: session.id,
                    detectionId: targetDetection.id,
                    actionType: "REJECTED_FALSE_POSITIVE"
                }
            });
            console.log(`✅ Logged rejection for ${details.defectClass} at [${x}, ${y}]`);
        } else {
            console.error(`❌ Could not find detection in DB for ${details.defectClass} at [${x}, ${y}]`);
        }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Log Action Error:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}