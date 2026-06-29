const DUMMY_API_URL = 'https://dummyjson.com/products';

/**
 * Fetch all dummy products (max 30 limit for sandbox demo)
 */
export const fetchProducts = async () => {
  try {
    const response = await fetch(`${DUMMY_API_URL}?limit=30`);
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.statusText}`);
    }
    const data = await response.json();
    return data.products;
  } catch (error) {
    console.error('❌ [productService] fetchProducts failed:', error);
    throw error;
  }
};

/**
 * Fetch detailed specifications for a single product by numeric ID
 */
export const fetchProductById = async (id) => {
  try {
    const response = await fetch(`${DUMMY_API_URL}/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch product details: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ [productService] fetchProductById failed for ID ${id}:`, error);
    throw error;
  }
};
