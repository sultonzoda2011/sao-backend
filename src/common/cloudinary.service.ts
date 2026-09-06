import { Injectable } from '@nestjs/common';
import { UploadApiResponse } from 'cloudinary';
import { cloudinary, configureCloudinary } from './cloudinary.config';

@Injectable()
export class CloudinaryService {
  constructor() {
    configureCloudinary();
  }

  uploadImageBuffer(buffer: Buffer, folder = 'sao-messenger/avatars'): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'face' }],
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
          resolve(result);
        },
      );
      stream.end(buffer);
    });
  }
}
