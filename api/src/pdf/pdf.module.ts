import { Module } from '@nestjs/common';
import { PdfOcrService } from './pdf-ocr.service';

/** OCR/parse de PDF compartilhado (Mistral OCR + fallback pdf-parse). */
@Module({
  providers: [PdfOcrService],
  exports: [PdfOcrService],
})
export class PdfModule {}
