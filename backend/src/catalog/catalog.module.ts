import { Module } from '@nestjs/common';
import { InventoryModule } from '../inventory/inventory.module';
import { BannersController } from './banners.controller';
import { BrandsController } from './brands.controller';
import { CategoriesController } from './categories.controller';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ShopController } from './shop.controller';

@Module({
  imports: [InventoryModule],
  controllers: [CategoriesController, BrandsController, ProductsController, BannersController, ShopController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class CatalogModule {}
