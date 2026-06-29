import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(() => {
    // Load initial cart data from localStorage if it exists
    const localData = localStorage.getItem('cart');
    return localData ? JSON.parse(localData) : [];
  });

  // Persist cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        // Enforce stock limit
        const newQty = Math.min(existingItem.quantity + 1, product.stock || 99);
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: newQty } : item
        );
      }
      return [
        ...prevCart,
        {
          id: product.id,
          title: product.title,
          price: product.price,
          thumbnail: product.thumbnail || product.images?.[0] || '',
          stock: product.stock || 10,
          quantity: 1,
        },
      ];
    });
  };

  const removeFromCart = (id) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  };

  const updateQuantity = (id, quantity) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        if (item.id === id) {
          const clampedQty = Math.max(1, Math.min(quantity, item.stock));
          return { ...item, quantity: clampedQty };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  // Helper values
  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartSubtotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  
  // Shipping fee is $8.50 (in dollars, i.e., 8.5) if cart is not empty
  const shippingFee = cart.length > 0 ? 8.5 : 0;
  const cartTotal = cartSubtotal + shippingFee;

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        cartSubtotal,
        shippingFee,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
