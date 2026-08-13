import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

export interface UploadDescriptor {
  readonly mimeType: string;
  readonly size: number;
}

export function validateUpload(
  upload: UploadDescriptor,
  options: {
    readonly allowedMimeTypes: readonly string[];
    readonly maxBytes: number;
  },
): void {
  if (upload.size < 0 || !Number.isSafeInteger(upload.size)) {
    throw new BadRequestException({
      code: 'INVALID_UPLOAD_SIZE',
      message: 'Upload size is invalid',
    });
  }
  if (upload.size > options.maxBytes) {
    throw new PayloadTooLargeException({
      code: 'UPLOAD_TOO_LARGE',
      message: `Upload exceeds ${String(options.maxBytes)} bytes`,
    });
  }
  const normalized = upload.mimeType.toLowerCase().split(';', 1)[0]?.trim();
  if (!normalized || !options.allowedMimeTypes.includes(normalized)) {
    throw new BadRequestException({
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'Upload MIME type is not allowed',
    });
  }
}
