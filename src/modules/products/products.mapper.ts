import type { Product } from '../../db/schema/index.js';

export interface ProductDto {
  id: string;
  name: string;
  category: string;
  description?: string;
  image?: string;
  images?: string[];
  price: number;
  stock: number;
  status: 'active' | 'out_of_stock';
  orderCount: number;
  unitsSold: number;
  variants?: {
    colors?: string[];
    sizes?: string[];
    storage?: string[];
  };
}

export function toProductDto(product: Product, orderCount = 0, unitsSold = 0): ProductDto {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description ?? undefined,
    image: product.imageUrl ?? undefined,
    images: product.images ?? undefined,
    price: product.price,
    stock: product.stock,
    status: product.status,
    orderCount,
    unitsSold,
    variants: product.variants ?? undefined,
  };
}
