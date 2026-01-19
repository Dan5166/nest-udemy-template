import { BadRequestException, Controller, Get, Param, Post, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FilesService } from './files.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter, fileNamer } from './helpers';
import { diskStorage } from 'multer';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@Controller('files')
export class FilesController {
  constructor(
    private readonly filesService: FilesService,
    private readonly configService: ConfigService,
  ) {}


  @Get('product/:imageName')
  findProductImage(
    @Res() res: Response,
    @Param('imageName') imageName: string,
  ) {
    const path = this.filesService.getStaticProductImage(imageName);

    res.sendFile(path);
  }

  @Post('product')
  @UseInterceptors(FileInterceptor('file', { 
    fileFilter,
    limits: { fileSize: 1024 * 1024 * 1000 }, // 1000MB
    storage: diskStorage({
      destination: './uploads',
      filename: fileNamer,
    })
  }))
  uploadProductImage(
      @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('Your file is empty' );
    }
    console.log(file);
    const secureUrl = `${ this.configService.get('HOST_API')}/files/product/${file.filename }`;
    return {
      fileName: secureUrl
    }
  }

}
