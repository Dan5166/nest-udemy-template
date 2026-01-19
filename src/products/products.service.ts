import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';
import { Product, ProductImage } from './entities';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productsImageRepository: Repository<ProductImage>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const { images = [], ...productDetails } = createProductDto;

      if (!createProductDto.slug) {
        createProductDto.slug = createProductDto.title.toLocaleLowerCase().replaceAll(' ', '_').replaceAll("'", '');
      }
      const product = this.productsRepository.create({
        ...createProductDto,
        images: images.map( (image) => this.productsImageRepository.create({ url: image }) )
      });
      await this.productsRepository.save(product);
      return { ...product, images };
    } catch (error) {
      console.log(error);
      if (error.code === '23505') {
        throw new InternalServerErrorException('Product with this title or slug already exists');
      }
      this.logger.error('Error creating product', error);
      throw new InternalServerErrorException('Error creating product');
    }
    
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit, offset } = paginationDto;
    const products = await this.productsRepository.find({
      take: limit,
      skip: offset,
      relations: { images: true },
    });

    if (!products) {
      throw new NotFoundException('No products found');
    }
    
    return products.map( product => ({
      ...product,
      images: product.images ? product.images.map( img => img.url ) : []
    }));
  }

  async findOne(term: string) {
    
    let product;

    if (isUUID(term)) {
      product = await this.productsRepository.findOneBy({ id: term });
    } else {
      const queryBuilder = this.productsRepository.createQueryBuilder();
      product = await queryBuilder
        .where('UPPER(title) = :title OR slug = :slug', { // Esta notacion es para evitar SQL Injection
          title: term.toUpperCase(),
          slug: term.toLowerCase(),
        })
        .leftJoinAndSelect('Product.images', 'productImage')
        .getOne();
    }

    // const product = await this.productsRepository.findOneBy({ id });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async findOnePlain(term: string) {
    const { images = [], ...product } = await this.findOne(term);
    return {
      ...product,
      images: images ? images.map( img => img.url ) : []
    };
  }

  async update(id: string, updateProductDto: UpdateProductDto) {

    const { images, ...toUpdate } = updateProductDto;

    const product = await this.productsRepository.preload({
      id,
      ...toUpdate
    });
    if (!product) {
      throw new NotFoundException(`Product with id ${id} not found`);
    }

    // Create query runner // Procedimientos en transacciones que no impacten la base de datos si algo falla
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        // Delete previous images
        await queryRunner.manager.delete(ProductImage, { product: { id } });
        product.images = images.map( imageUrl => this.productsImageRepository.create({ url: imageUrl }) );
      }
      await queryRunner.manager.save(product);

      await queryRunner.commitTransaction();
      await queryRunner.release();

      return this.findOnePlain(id);

    } catch (error) {
      console.log(error);
      if (error.code === '23505') {
        throw new BadRequestException('Product with this title or slug already exists');
      }
      this.logger.error('Error updating product', error);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    await this.productsRepository.remove(product);
  }

  async deleteAllProducts() {
    const query = this.productsRepository.createQueryBuilder('product');

    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.logger.error('Error deleting all products', error);
      throw new InternalServerErrorException('Error deleting all products');
    }
  }
}
