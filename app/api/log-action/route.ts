// app/api/log-action/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db'; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { actionType, operatorName, filename, details } = body;

    console.log(`📝 Log Action Received: ${actionType} for ${operatorName}`);

    // 1. Resolve Identity
    const operator = await db.operator.findUnique({ where: { name: operatorName || "Admin" } });
    if (!operator) {
        console.error("❌ Operator not found:", operatorName);
        return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    // Find the most recent session for this operator (don't restrict by 'today' strictly to avoid TZ issues)
    const session = await db.session.findFirst({
        where: { operatorId: operator.id },
        orderBy: { startedAt: 'desc' }
    });
    
    if (!session) {
        console.error("❌ Session not found for:", operatorName);
        return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // 2. Resolve Image Context (RELAXED CHECK)
    // Just find the most recent image with this filename. 
    // In a real app we'd pass imageId from frontend, but this fixes the "Empty Log" issue for the demo.
    let imageId = null;
    if (filename) {
        const img = await db.sourceImage.findFirst({
            where: { 
                metadata: { filename: filename } 
                // Removed strict batch/session check here to ensure we find the image even if sessions drifted
            },
            orderBy: { id: 'desc' } 
        });
        imageId = img?.id;
    }

    if ((actionType === 'MANUAL_ANNOTATION' || actionType === 'DELETE_INTERVENTION') && !imageId) {
        console.warn(`⚠️ Could not find image for filename: ${filename}. Skipping DB insert.`);
        return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    // 3. EXECUTE DB INSERT
    
    // --- A. USER DREW A BOX ---
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
    
    // --- B. USER DELETED A DETECTION ---
    else if (actionType === 'DELETE_INTERVENTION') {
        // Find the most recent analysis run for this image
        const lastRun = await db.analysisRun.findFirst({
            where: { imageId: imageId! },
            orderBy: { id: 'desc' },
            include: { detections: { include: { class: true } } }
        });

        if (lastRun) {
            // Find a detection matching the class label
            const targetDetection = lastRun.detections.find(d => d.class.label === details.defectClass);
            
            if (targetDetection) {
                // Check dupes
                const exists = await db.userIntervention.findUnique({ where: { detectionId: targetDetection.id } });
                if (!exists) {
                    await db.userIntervention.create({
                        data: {
                            sessionId: session.id,
                            detectionId: targetDetection.id,
                            actionType: "REJECTED_FALSE_POSITIVE"
                        }
                    });
                }
            } else {
                console.warn("⚠️ Could not match detection for intervention log");
            }
        }
    }

    // --- C. USER EXPORTED DATASET ---
    else if (actionType === 'DATASET_EXPORT') {
        // Attach to the current session's latest batch, or just the latest batch globally for safety
        const batch = await db.batch.findFirst({ 
            where: { sessionId: session.id },
            orderBy: { uploadedAt: 'desc' }
        });
        
        if (batch) {
            await db.datasetExport.create({
                data: {
                    batchId: batch.id,
                    format: "YOLO_TXT",
                    imageCount: details.count || 0
                }
            });
        }
    }

    console.log("✅ Action Logged Successfully");
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Log Action Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}