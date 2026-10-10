import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { PrismaClient } from '../generated/client';
import { TemporaryMediaStorage } from '../storage/TemporaryInterviewMediaStorage';
import { InterviewSessionService } from './InterviewSessionService';
import { ReportService } from './ReportService';
import { InterviewPdfReportGenerator } from './InterviewPdfReportGenerator';

const createZipArchive = (options?: any) => {
  const pkg = require('archiver');
  if (typeof pkg === 'function') {
    return pkg('zip', options);
  }
  if (pkg && pkg.default && typeof pkg.default === 'function') {
    return pkg.default('zip', options);
  }
  if (pkg && pkg.ZipArchive) {
    return new pkg.ZipArchive(options);
  }
  if (pkg && pkg.create) {
    return pkg.create('zip', options);
  }
  throw new Error('Unable to initialize archiver zip instance');
};

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export interface AnswerMediaMetadataDTO {
  available: boolean;
  mediaId?: string;
  durationSeconds?: number;
  expiresAt?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  status: 'AVAILABLE' | 'EXPIRED' | 'DELETED' | 'UNAVAILABLE';
  reason?: string;
  watchUrl?: string;
  downloadUrl?: string;
}

export class InterviewMediaService {
  /**
   * Save question-specific answer video/audio media.
   * Maps strictly via (interviewId, questionId, responseId).
   */
  static async saveAnswerMedia(params: {
    interviewId: string;
    identityId: string;
    questionId: string;
    durationSeconds: number;
    mimeType: string;
    fileBuffer: Buffer;
  }): Promise<{ success: boolean; mediaId: string; expiresAt: Date }> {
    const { interviewId, identityId, questionId, durationSeconds, mimeType, fileBuffer } = params;

    // 1. Verify access & ownership
    await InterviewSessionService.getInterviewScoped(interviewId, identityId);

    // 2. Fetch HR Session & Question
    const hrSession = await (prisma as any).hRInterviewSession.findUnique({
      where: { interviewId },
      include: {
        questions: {
          where: { id: questionId },
          include: { response: true },
        },
      },
    });

    if (!hrSession) {
      throw Object.assign(new Error('HR Interview session not found.'), { statusCode: 404 });
    }

    const question = hrSession.questions?.[0];
    if (!question) {
      throw Object.assign(new Error(`HR question not found for ID: ${questionId}`), { statusCode: 404 });
    }

    // 3. Ensure an HRInterviewResponse exists to link to
    let responseId = question.response?.id;
    if (!responseId) {
      // Upsert a response placeholder if candidate submitted video before/concurrently with transcript
      const newResponse = await (prisma as any).hRInterviewResponse.upsert({
        where: { questionId },
        create: {
          hrSessionId: hrSession.id,
          questionId,
          transcript: '',
          durationSeconds,
        },
        update: {
          durationSeconds: durationSeconds || undefined,
        },
      });
      responseId = newResponse.id;
    }

    // 4. Calculate retention expiration:
    // If HR session is already completed, expiresAt = completedAt + 1 hour.
    // Otherwise, temporarily set 2 hours from now; will be locked to completedAt + 1 hour on completion.
    const now = new Date();
    const expiresAt = hrSession.completedAt
      ? new Date(new Date(hrSession.completedAt).getTime() + 60 * 60 * 1000)
      : new Date(now.getTime() + 2 * 60 * 60 * 1000);

    // 5. Determine file extension and storage key
    let ext = 'webm';
    if (mimeType.includes('mp4')) ext = 'mp4';
    else if (mimeType.includes('ogg')) ext = 'ogg';
    else if (mimeType.includes('wav')) ext = 'wav';

    const sequenceNum = question.sequence || 1;
    const storageKey = `interviews/${interviewId}/Q${String(sequenceNum).padStart(2, '0')}_${questionId}_${Date.now()}.${ext}`;

    // 6. Save binary to temporary object/file storage
    await TemporaryMediaStorage.save(storageKey, fileBuffer, mimeType);
    const fileSizeBytes = fileBuffer.length;

    // 7. Upsert database metadata record
    const existingMedia = await (prisma as any).interviewAnswerMedia.findUnique({
      where: { responseId },
    });

    let mediaRecord: any;
    if (existingMedia) {
      // Delete old physical file if re-recording before completion
      if (existingMedia.storageKey && existingMedia.storageKey !== storageKey) {
        await TemporaryMediaStorage.delete(existingMedia.storageKey).catch(() => {});
      }

      mediaRecord = await (prisma as any).interviewAnswerMedia.update({
        where: { id: existingMedia.id },
        data: {
          storageKey,
          mimeType,
          durationSeconds: Math.round(durationSeconds),
          fileSizeBytes,
          expiresAt,
          status: 'AVAILABLE',
          deletedAt: null,
        },
      });
    } else {
      mediaRecord = await (prisma as any).interviewAnswerMedia.create({
        data: {
          interviewId,
          questionId,
          responseId,
          sequenceNumber: sequenceNum,
          storageKey,
          mimeType,
          durationSeconds: Math.round(durationSeconds),
          fileSizeBytes,
          expiresAt,
          status: 'AVAILABLE',
        },
      });
    }

    return {
      success: true,
      mediaId: mediaRecord.id,
      expiresAt: mediaRecord.expiresAt,
    };
  }

  /**
   * Finalize media expiration timestamp upon interview completion (1-hour TTL from completion).
   */
  static async updateExpirationOnCompletion(interviewId: string, completedAt: Date): Promise<void> {
    const finalExpiresAt = new Date(completedAt.getTime() + 60 * 60 * 1000);

    await (prisma as any).interviewAnswerMedia.updateMany({
      where: {
        interviewId,
        status: 'AVAILABLE',
      },
      data: {
        expiresAt: finalExpiresAt,
      },
    });
  }

  /**
   * Fetch authenticated media record for streaming or download.
   */
  static async getMediaForAccess(
    interviewId: string,
    mediaId: string,
    identityId: string,
    userRole?: string
  ): Promise<{
    media: any;
    filePath: string;
    fileSizeBytes: number;
    mimeType: string;
  }> {
    // 1. Scoped ownership check
    await InterviewSessionService.getInterviewScoped(interviewId, identityId, userRole);

    const media = await (prisma as any).interviewAnswerMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.interviewId !== interviewId) {
      throw Object.assign(new Error('Media recording not found.'), { statusCode: 404 });
    }

    // 2. Check expiration
    const now = new Date();
    if (media.status !== 'AVAILABLE' || new Date(media.expiresAt) <= now) {
      // Lazy cleanup if expired
      if (media.status === 'AVAILABLE' && new Date(media.expiresAt) <= now) {
        await this.deleteSingleMedia(media.id);
      }
      throw Object.assign(
        new Error('This answer recording has expired and was automatically deleted after 1 hour.'),
        { statusCode: 410 }
      );
    }

    const filePath = TemporaryMediaStorage.getFilePath(media.storageKey);
    const exists = await TemporaryMediaStorage.exists(media.storageKey);
    if (!exists) {
      throw Object.assign(new Error('Media file not found on storage server.'), { statusCode: 404 });
    }

    const fileSizeBytes = await TemporaryMediaStorage.getSize(media.storageKey);

    return {
      media,
      filePath,
      fileSizeBytes,
      mimeType: media.mimeType || 'video/webm',
    };
  }

  /**
   * Builds the media DTO for API serialization in reports.
   */
  static formatMediaDTO(media: any, interviewId: string): AnswerMediaMetadataDTO {
    if (!media) {
      return {
        available: false,
        status: 'UNAVAILABLE',
        reason: 'Answer recording unavailable.',
      };
    }

    const now = new Date();
    const isExpired = new Date(media.expiresAt) <= now;
    const isAvailable = media.status === 'AVAILABLE' && !isExpired;

    if (!isAvailable) {
      return {
        available: false,
        status: isExpired || media.status === 'DELETED' ? 'EXPIRED' : 'UNAVAILABLE',
        expiresAt: media.expiresAt ? new Date(media.expiresAt).toISOString() : undefined,
        reason: 'This recording was automatically deleted after 1 hour.',
      };
    }

    return {
      available: true,
      mediaId: media.id,
      durationSeconds: media.durationSeconds,
      expiresAt: new Date(media.expiresAt).toISOString(),
      mimeType: media.mimeType,
      fileSizeBytes: media.fileSizeBytes,
      status: 'AVAILABLE',
      watchUrl: `/api/v1/interviews/${interviewId}/media/${media.id}/stream`,
      downloadUrl: `/api/v1/interviews/${interviewId}/media/${media.id}/download`,
    };
  }

  /**
   * Delete a single media record and physical file.
   */
  static async deleteSingleMedia(mediaId: string): Promise<boolean> {
    const media = await (prisma as any).interviewAnswerMedia.findUnique({
      where: { id: mediaId },
    });
    if (!media) return false;

    if (media.storageKey) {
      await TemporaryMediaStorage.delete(media.storageKey).catch(() => {});
    }

    await (prisma as any).interviewAnswerMedia.update({
      where: { id: mediaId },
      data: {
        status: 'DELETED',
        deletedAt: new Date(),
      },
    });

    return true;
  }

  /**
   * Periodic Server-side Cleanup Routine:
   * Identifies all media where expiresAt <= now and status == AVAILABLE.
   * Deletes physical files and marks records as DELETED.
   * Completely idempotent.
   */
  static async cleanupExpiredMedia(): Promise<number> {
    const now = new Date();
    const expiredRecords = await (prisma as any).interviewAnswerMedia.findMany({
      where: {
        expiresAt: { lte: now },
        status: 'AVAILABLE',
      },
      take: 100, // Batch limit per cycle
    });

    let cleanedCount = 0;
    for (const record of expiredRecords) {
      try {
        if (record.storageKey) {
          await TemporaryMediaStorage.delete(record.storageKey).catch(() => {});
        }
        await (prisma as any).interviewAnswerMedia.update({
          where: { id: record.id },
          data: {
            status: 'DELETED',
            deletedAt: now,
          },
        });
        cleanedCount++;
      } catch (err) {
        console.warn(`[InterviewMediaService] Cleanup error on media record ${record.id}:`, err);
      }
    }

    return cleanedCount;
  }

  /**
   * Generate full PDF Report Document using pdfkit.
   */
  static async generateReportPdfBuffer(
    interviewId: string,
    identityId: string,
    userRole?: string
  ): Promise<Buffer> {
    return InterviewPdfReportGenerator.generatePdf({
      interviewId,
      identityId,
      userRole,
    });
  }

  /**
   * Generate Full Interview Package ZIP:
   * Contains:
   * - Interview_Report.pdf
   * - Answer_Videos/Q01.webm (for all available videos)
   * - Answer_Videos/README.txt (explaining retention status)
   */
  static async generateInterviewPackageZip(
    interviewId: string,
    identityId: string,
    userRole?: string
  ): Promise<NodeJS.ReadableStream> {
    // 1. Ownership & scoping
    await InterviewSessionService.getInterviewScoped(interviewId, identityId, userRole);

    // 2. Generate PDF Report Buffer
    const pdfBuffer = await this.generateReportPdfBuffer(interviewId, identityId, userRole);

    // 3. Query all Answer Media for this interview
    const mediaRecords = await (prisma as any).interviewAnswerMedia.findMany({
      where: { interviewId },
      orderBy: { sequenceNumber: 'asc' },
    });

    const now = new Date();
    const availableVideos: Array<{ sequence: number; storageKey: string; filename: string }> = [];
    const expiredVideos: Array<{ sequence: number; filename: string; expiresAt: Date }> = [];

    for (const record of mediaRecords) {
      const isExpired = record.status !== 'AVAILABLE' || new Date(record.expiresAt) <= now;
      const ext = record.mimeType?.includes('mp4') ? 'mp4' : 'webm';
      const filename = `Q${String(record.sequenceNumber).padStart(2, '0')}.${ext}`;

      if (!isExpired && (await TemporaryMediaStorage.exists(record.storageKey))) {
        availableVideos.push({
          sequence: record.sequenceNumber,
          storageKey: record.storageKey,
          filename,
        });
      } else {
        expiredVideos.push({
          sequence: record.sequenceNumber,
          filename,
          expiresAt: record.expiresAt,
        });
      }
    }

    // 4. Create streaming Zip Archive
    const archive = createZipArchive({
      zlib: { level: 6 },
    });

    // Append PDF Report
    archive.append(pdfBuffer, { name: 'Interview_Report.pdf' });

    // Append available video files
    for (const vid of availableVideos) {
      const filePath = TemporaryMediaStorage.getFilePath(vid.storageKey);
      archive.file(filePath, { name: `Answer_Videos/${vid.filename}` });
    }

    // Append README notes explaining video availability
    let readmeText = `NM MOCK INTERVIEW PACKAGE
Interview ID: ${interviewId}
Generated At: ${now.toISOString()}

ANSWER VIDEO EVIDENCE RETENTION POLICY:
Spoken answer recordings are temporary evidence stored to verify speech-to-text accuracy.
Recordings automatically expire and are permanently deleted 1 hour after interview completion.

SUMMARY OF RECORDINGS IN THIS PACKAGE:
- Total Recorded Questions: ${mediaRecords.length}
- Available Videos Included: ${availableVideos.length} (${availableVideos.map((v) => v.filename).join(', ') || 'None'})
- Expired / Deleted Recordings: ${expiredVideos.length} (${expiredVideos.map((v) => v.filename).join(', ') || 'None'})
`;

    if (expiredVideos.length > 0) {
      readmeText += `\nNote: Expired recordings were automatically removed according to the 1-hour privacy retention policy.\n`;
    }

    archive.append(readmeText, { name: 'Answer_Videos/README.txt' });

    // Finalize the archive stream asynchronously
    process.nextTick(() => {
      archive.finalize();
    });

    return archive;
  }
}
