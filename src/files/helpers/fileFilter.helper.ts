import { BadRequestException } from '@nestjs/common';

export const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  callback: Function,
) => {
  if (!file) {
    return callback(
      new BadRequestException('File is empty'),
      false,
    );
  }
  const allowedMimeTypes = ['image/jpeg', 'image/png'];
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif'];

  const mimeType = file.mimetype;
  const extension = file.originalname
    .split('.')
    .pop()
    ?.toLowerCase();

  if (!allowedMimeTypes.includes(mimeType)) {
    return callback(
      new BadRequestException('Invalid mime type'),
      false,
    );
  }

  if (!extension || !validExtensions.includes(extension)) {
    return callback(
      new BadRequestException('Invalid file extension'),
      false,
    );
  }

  console.log({ mimeType, extension });

  callback(null, true);
};
