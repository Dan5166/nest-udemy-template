import { BadRequestException } from '@nestjs/common';
import {v4 as uuid} from 'uuid';

export const fileNamer = (
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
  const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';

  const fileName = `${uuid()}.${fileExtension}`;

  callback(null, fileName);
};
