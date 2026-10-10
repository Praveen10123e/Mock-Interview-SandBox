import { PrismaClient, DifficultyLevel, QuestionTypeEnum } from '../generated/client';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { parser } from 'stream-json';
import { streamArray } from 'stream-json/streamers/StreamArray';
import { MapperRegistry } from './mappers/MapperRegistry';
import { NormalizedQuestion } from './mappers/NormalizedQuestion';

let _prisma: PrismaClient;
const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    if (!_prisma) _prisma = new PrismaClient();
    return (_prisma as any)[prop];
  },
});

export class ImportService {
  // In-memory caches to avoid massive DB calls during import
  private static categoryCache = new Map<string, string>();
  private static topicCache = new Map<string, string>();
  private static languageCache = new Map<string, string>();
  private static sourceCache = new Map<string, string>();

  /**
   * Imports a dataset file using stream-json pipeline and unified mappers.
   */
  static async importDataset(filepath: string, filename: string): Promise<any> {
    const batch = await prisma.questionImportBatch.create({
      data: { filename, status: 'PROCESSING' },
    });


    let importedCount = 0;
    let skippedCount = 0;
    let totalRecords = 0;
    let failedCount = 0;

    const BATCH_SIZE = 1000;
    let buffer: any[] = [];

    const flushBuffer = async () => {
      if (buffer.length === 0) return;
      try {
        // Pre-cache relations sequentially to avoid Prisma UniqueConstraint race conditions in concurrent upserts
        for (const record of buffer) {
          try {
            const nq = MapperRegistry.map(record);
            if (nq.category) await this.getOrCreateCategory(nq.category);
            if (nq.language) await this.getOrCreateLanguage(nq.language);
            if (nq.datasetName) await this.getOrCreateSource(nq.datasetName);
            if (nq.topic && nq.category) {
              const catId = await this.getOrCreateCategory(nq.category);
              await this.getOrCreateTopic(catId, nq.topic);
            }
          } catch(e) {} // ignore map errors here
        }

        // Now process insertion concurrently
        await Promise.all(buffer.map(async (record) => {
          try {
            const mappedQuestion = MapperRegistry.map(record);
            const sourceId = await this.getOrCreateSource(mappedQuestion.datasetName);
            await this.insertNormalizedQuestion(mappedQuestion, sourceId, batch.id);
            importedCount++;
          } catch (err: any) {
            if (err.message === 'DUPLICATE') {
              skippedCount++;
            } else {
              // Ignore mapping errors for bad data
              failedCount++;
            }
          }
        }));
      } catch (err) {
        console.error('Batch error', err);
        failedCount += buffer.length;
      }
      buffer = [];
    };

    try {
      await pipeline(
        fs.createReadStream(filepath),
        parser(),
        streamArray(),
        async function (sourceStream) {
          for await (const chunk of sourceStream) {
            totalRecords++;
            buffer.push(chunk.value);
            if (buffer.length >= BATCH_SIZE) {
              await flushBuffer();
            }
          }
        }
      );

      // Flush remaining
      await flushBuffer();

      await prisma.questionImportBatch.update({
        where: { id: batch.id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          totalRecords,
          importedCount,
          skippedCount,
          failedCount,
        },
      });
      return { success: true, batchId: batch.id, totalRecords, importedCount, skippedCount, failedCount };
    } catch (error: any) {
      console.error('Import failed', error);
      await prisma.questionImportBatch.update({
        where: { id: batch.id },
        data: {
          status: 'FAILED',
          errorMessage: error.message,
          completedAt: new Date(),
          totalRecords,
          importedCount,
          skippedCount,
          failedCount,
        },
      });
      throw error;
    }
  }

  /**
   * Imports a small curated dataset file directly (no stream).
   * Expects format: { datasetName: string, questions: any[] }
   */
  static async importCuratedDataset(filepath: string, filename: string): Promise<any> {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const questions = data.problems || data.questions;

    if (!Array.isArray(questions)) {
      throw new Error('Invalid curated dataset format: missing problems/questions array');
    }

    const batch = await prisma.questionImportBatch.create({
      data: { filename, status: 'PROCESSING' },
    });

    let importedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const record of questions) {
      try {
        const mappedQuestion = MapperRegistry.map(record);
        // Override datasetName from file root if not mapped
        if (!mappedQuestion.datasetName) {
          mappedQuestion.datasetName = data.dataset_name || data.datasetName || 'Curated - Full-Program Coding Interview Dataset';
        }
        
        const sourceId = await this.getOrCreateSource(mappedQuestion.datasetName);
        await this.insertNormalizedQuestion(mappedQuestion, sourceId, batch.id);
        importedCount++;
      } catch (err: any) {
        if (err.message === 'DUPLICATE') {
          skippedCount++;
        } else {
          console.error(`Curated map/insert failed for record ID ${record.problem_id || record.id}:`, err);
          failedCount++;
        }
      }
    }

    await prisma.questionImportBatch.update({
      where: { id: batch.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        totalRecords: questions.length,
        importedCount,
        skippedCount,
        failedCount,
      },
    });

    return { success: true, batchId: batch.id, totalRecords: questions.length, importedCount, skippedCount, failedCount };
  }

  private static async insertNormalizedQuestion(nq: NormalizedQuestion, sourceId: string, importBatchId: string) {
    // 1. Resolve Foreign Keys
    let categoryId = null;
    if (nq.category) {
      categoryId = await this.getOrCreateCategory(nq.category);
    }

    let topicId = null;
    if (nq.topic && categoryId) {
      topicId = await this.getOrCreateTopic(categoryId, nq.topic);
    }

    let languageId = null;
    if (nq.language) {
      languageId = await this.getOrCreateLanguage(nq.language);
    }

    // 2. Deduplication Check (SHA-256 Hash match)
    if (!nq.hash) {
      throw new Error('Missing hash for record');
    }
    const existing = await prisma.question.findUnique({
      where: {
        hash: nq.hash,
      },
    });

    if (existing) {
      throw new Error('DUPLICATE');
    }

    // 3. Insert Question and Metadata Transactionally
    // We don't need a strict transaction since this is an isolated record, but we map relations.
    await prisma.question.create({
      data: {
        title: nq.title,
        description: nq.description,
        questionType: nq.questionType,
        difficulty: nq.difficulty,
        expectedAnswer: nq.expectedAnswer,
        idealAnswer: nq.idealAnswer,
        status: 'PUBLISHED',
        hash: nq.hash,
        categoryId,
        topicId,
        languageId,
        sourceId,
        importBatchId,
        explanations: nq.explanations && nq.explanations.length > 0 ? {
          create: nq.explanations
        } : undefined,
        metadata: nq.metadata ? {
          create: {
            jsonPayload: nq.metadata,
            originalId: nq.originalId
          }
        } : undefined,
        tags: nq.tags && nq.tags.length > 0 ? {
          connectOrCreate: nq.tags.map(t => ({
            where: { name: t },
            create: { name: t }
          }))
        } : undefined,
      },
    });
  }

  private static async getOrCreateCategory(name: string): Promise<string> {
    const key = name.trim();
    if (this.categoryCache.has(key)) return this.categoryCache.get(key)!;

    const record = await prisma.questionCategory.upsert({
      where: { name: key },
      update: {},
      create: { name: key },
    });
    this.categoryCache.set(key, record.id);
    return record.id;
  }

  private static async getOrCreateTopic(categoryId: string, name: string): Promise<string> {
    const key = `${categoryId}_${name.trim()}`;
    if (this.topicCache.has(key)) return this.topicCache.get(key)!;

    let topic = await prisma.questionTopic.findFirst({
      where: { categoryId, name: name.trim() },
    });
    if (!topic) {
      topic = await prisma.questionTopic.create({
        data: { categoryId, name: name.trim() },
      });
    }
    this.topicCache.set(key, topic.id);
    return topic.id;
  }

  private static async getOrCreateLanguage(name: string): Promise<string> {
    const key = name.trim();
    if (this.languageCache.has(key)) return this.languageCache.get(key)!;

    const record = await prisma.programmingLanguage.upsert({
      where: { name: key },
      update: {},
      create: { name: key },
    });
    this.languageCache.set(key, record.id);
    return record.id;
  }

  private static async getOrCreateSource(name: string): Promise<string> {
    const key = name.trim();
    if (this.sourceCache.has(key)) return this.sourceCache.get(key)!;

    const record = await prisma.questionSource.upsert({
      where: { name: key },
      update: {},
      create: { name: key },
    });
    this.sourceCache.set(key, record.id);
    return record.id;
  }
}
