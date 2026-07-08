import type { Product } from '../../db/schema.js';

export interface ProductDto {
  id: string;
  name: string;
  category: string;
  description?: string;
  image?: string;
  price: number;
  stock: number;
  status: 'active' | 'out_of_stock';
  variants?: {
    colors?: string[];
    sizes?: string[];
    storage?: string[];
  };
}

export function toProductDto(product: Product): ProductDto {
  return {
    id: product.id,
    name: product.name,
    category: product.category,
    description: product.description ?? undefined,
    image: product.imageUrl ?? undefined,
    price: product.price,
    stock: product.stock,
    status: product.status,
    variants: product.variants ?? undefined,
  };
}
