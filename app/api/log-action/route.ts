// app/api/log-action/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db'; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { actionType, operatorName, filename, details } = body;

    // 1. Resolve Session based on Operator Name
    // (In a stricter app, we would use the Auth Token here too, but looking up by name works for this logging context)
    const operator = await db.operator.findUnique({ where: { name: operatorName || "Admin" } });
    if (!operator) return NextResponse.json({ error: "Operator not found" }, { status: 404 });

    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Find active session
    const session = await db.session.findFirst({
        where: { operatorId: operator.id, startedAt: { gte: today } }
    });
    
    // If no session exists (rare race condition), create one or fail. Let's fail for strictness.
    if (!session) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // 2. Resolve Image Context
    let imageId = null;
    if (filename) {
        // Find the most recent upload of this filename in the current session's batches
        const img = await db.sourceImage.findFirst({
            where: { 
                metadata: { filename: filename },
                batch: { sessionId: session.id } 
            },
            orderBy: { id: 'desc' } 
        });
        imageId = img?.id;
    }

    // 3. HANDLE SPECIFIC ACTIONS
    
    // --- A. USER DREW A BOX ---
    if (actionType === 'MANUAL_ANNOTATION') {
        if (!imageId) return NextResponse.json({ error: "Image not found" }, { status: 404 });
        
        // Ensure defect class exists
        const defectClass = await db.defectClass.upsert({
            where: { label: details.className },
            update: {},
            create: { label: details.className }
        });

        await db.manualAnnotation.create({
            data: {
                imageId: imageId,
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
        if (!imageId) return NextResponse.json({ error: "Image not found" }, { status: 404 });

        // Find the most recent analysis run for this image
        const lastRun = await db.analysisRun.findFirst({
            where: { imageId },
            orderBy: { id: 'desc' },
            include: { detections: { include: { class: true } } }
        });

        if (lastRun) {
            // Heuristic: Find a detection matching the deleted class label
            // In a fully synced app, we would send the Detection UUID from frontend.
            // Since frontend uses array index, we try to match by label.
            const targetDetection = lastRun.detections.find(d => d.class.label === details.defectClass);
            
            if (targetDetection) {
                // Check if already intervened to avoid duplicates
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
            }
        }
    }

    // --- C. USER EXPORTED DATASET ---
    else if (actionType === 'DATASET_EXPORT') {
        // Find the batch associated with this session (or the specific batch if we tracked ID)
        // Here we attach to the latest batch of the session
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

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Log Action Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}