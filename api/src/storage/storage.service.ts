import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class StorageService {
  private readonly bucketName: string;
  private readonly storage: Storage;

  constructor(private readonly config: ConfigService) {
    this.bucketName = this.config.get<string>('GCS_BUCKET_NAME') ?? '';
    this.storage = new Storage();
  }

  /**
   * Uploads a file to GCS and returns its public URL.
   * Path: question-statements/{examBaseId}/{uuid}.{ext}
   * Assumes the bucket allows public read (bucket policy or uniform bucket-level access).
   */
  async uploadStatementImage(
    examBaseId: string,
    buffer: Buffer,
    mimetype: string,
  ): Promise<string> {
    if (!this.bucketName) {
      throw new BadRequestException(
        'GCS_BUCKET_NAME is not configured. Set it in .env to use image uploads.',
      );
    }
    const ext = this.getExtensionFromMimetype(mimetype);
    const filename = `${examBaseId}/${crypto.randomUUID()}${ext}`;
    const path = `question-statements/${filename}`;

    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(path);

    await file.save(buffer, {
      metadata: {
        contentType: mimetype,
      },
    });

    return `https://storage.googleapis.com/${this.bucketName}/${path}`;
  }

  /**
   * Deletes an object from GCS by its public URL.
   * Parses bucket and path from the URL (must be https://storage.googleapis.com/...).
   * Ignores 404 (object already deleted).
   */
  async deleteByPublicUrl(url: string): Promise<void> {
    const parsed = this.parseGcsPublicUrl(url);
    if (!parsed) return;
    const bucket = this.storage.bucket(parsed.bucket);
    const file = bucket.file(parsed.path);
    await file.delete({ ignoreNotFound: true });
  }

  private parseGcsPublicUrl(
    url: string,
  ): { bucket: string; path: string } | null {
    try {
      const u = new URL(url);
      if (u.origin !== 'https://storage.googleapis.com') return null;
      const pathname = u.pathname.replace(/^\/+/, '');
      const i = pathname.indexOf('/');
      if (i <= 0) return null;
      return {
        bucket: pathname.slice(0, i),
        path: pathname.slice(i + 1),
      };
    } catch {
      return null;
    }
  }

  private getExtensionFromMimetype(mimetype: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
    };
    return map[mimetype] ?? '.bin';
  }
}
