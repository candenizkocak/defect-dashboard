// app/api/analyze/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db'; 
import { headers } from 'next/headers';

// Configuration Constants
const PYTHON_API_URL = "https://candenizkocak--tile-defect-api-json-model-analyze.modal.run";

export async function POST(req: Request) {
  const startTimer = performance.now(); 

  try {
    const headersList = await headers();
    const authHeader = headersList.get('authorization');
    const token = authHeader?.split(' ')[1]; // Bearer <token>

    // <--- 2. AUTHENTICATION (Security Check)
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    // Validate Session exists AND IS VALID (Fix)
    const session = await db.session.findUnique({ where: { id: token } });
    
    if (!session || !session.isValid) {
        return NextResponse.json({ error: "Session Expired" }, { status: 403 });
    }

    const body = await req.json();
    const { image, imageUrl, conf_threshold, use_roi, filename, maxAllowedDefects, clientBatchId } = body;

    // <--- 3. BATCHING
    let batch = await db.batch.findUnique({ where: { id: clientBatchId } });
    
    if (!batch) {
        batch = await db.batch.create({
            data: {
                id: clientBatchId, 
                sessionId: session.id,
                name: `Upload set ${new Date().toLocaleTimeString()}`
            }
        });
    }

    // Capture User Agent
    const userAgent = headersList.get('user-agent') || 'Unknown';
    await db.clientInfo.upsert({
        where: { sessionId: session.id },
        update: { userAgent },
        create: { sessionId: session.id, userAgent, platform: "Web" }
    });

    // Save Source Image
    const sourceImage = await db.sourceImage.create({
        data: {
            batchId: batch.id,
            url: imageUrl,
            metadata: {
                create: {
                    filename: filename,
                    sizeBytes: Math.floor(image.length * 0.75),
                    mimeType: "image/png",
                }
            }
        }
    });

    // Call AI
    const aiResponse = await fetch(PYTHON_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image, conf_threshold, use_roi })
    });

    if (!aiResponse.ok) throw new Error("AI Model Failed");
    const aiData = await aiResponse.json();

    // <--- 4. DIMENSIONS
    if (aiData.width && aiData.height) {
        await db.imageMetadata.update({
            where: { imageId: sourceImage.id },
            data: { width: aiData.width, height: aiData.height }
        });
    }

    // Save Config & Model
    const analysisConfig = await db.analysisConfig.upsert({
        where: { hash: `${conf_threshold}-${use_roi}` },
        update: {},
        create: { confidence: conf_threshold, useRoi: use_roi, hash: `${conf_threshold}-${use_roi}` }
    });

    let aiModel = await db.aiModelVersion.findFirst({ where: { name: "YOLO11-Tile" } });
    if (!aiModel) aiModel = await db.aiModelVersion.create({ data: { name: "YOLO11-Tile", apiVersion: "v1", endpoint: PYTHON_API_URL } });

    let qualityRule = await db.qualityRule.findFirst({ where: { maxAllowedDefects } });
    if (!qualityRule) qualityRule = await db.qualityRule.create({ data: { maxAllowedDefects } });

    // <--- 5. TIMING
    const endTimer = performance.now();
    const duration = Math.round(endTimer - startTimer);

    const run = await db.analysisRun.create({
        data: {
            imageId: sourceImage.id,
            modelId: aiModel.id,
            configId: analysisConfig.id,
            qualityRuleId: qualityRule.id,
            status: { create: { status: "SUCCESS" } },
            timing: { create: { startedAt: new Date(), completedAt: new Date(), durationMs: duration } }
        }
    });

    // Save Results
    const defectCount = aiData.defects.length;
    await db.qualityResult.create({
        data: { runId: run.id, passed: defectCount <= maxAllowedDefects, defectCount }
    });

    for (const d of aiData.defects) {
        const defectClass = await db.defectClass.upsert({
            where: { label: d.class },
            update: {},
            create: { label: d.class }
        });

        await db.detection.create({
            data: {
                runId: run.id,
                classId: defectClass.id,
                score: { create: { score: d.score } },
                box: { create: { x1: Math.round(d.box[0]), y1: Math.round(d.box[1]), x2: Math.round(d.box[2]), y2: Math.round(d.box[3]) } }
            }
        });
    }

    return NextResponse.json(aiData);

  } catch (error) {
    console.error("API Route Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}