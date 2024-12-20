function applyPercentageDiscount(cartTotal: number, discountValue: number): number {
    const discount = (cartTotal * discountValue) / 100;
    return cartTotal - discount;
  }

  function applyFixedDiscount(cartTotal: number, discountValue: number): number {
    const discount = discountValue > cartTotal ? cartTotal : discountValue; // Avoid negative total
    return cartTotal - discount;
  }

  function applyBogoOffer(cartItems: { productId: string; quantity: number; price: number }[]): number {
    let total = 0;
    cartItems.forEach(item => {
      const freeItems = Math.floor(item.quantity / 2); // Free items for every pair
      const paidItems = item.quantity - freeItems;
      total += paidItems * item.price;
    });
    return total;
  }
  
  function applyFreeShipping(cartTotal: number, shippingCost: number, minPurchaseAmount: number): number {
    if (cartTotal >= minPurchaseAmount) {
      return cartTotal; // Shipping is free
    }
    return cartTotal + shippingCost; // Add shipping cost if minimum amount not met
  }

  function applyBundleOffer(cartItems: { productId: string; price: number; quantity: number }[], bundleDetails: { productIds: string[]; discountValue: number }): number {
    let discount = 0;
    const isBundleEligible = bundleDetails.productIds.every(productId =>
      cartItems.some(item => item.productId === productId)
    );
  
    if (isBundleEligible) {
      discount = bundleDetails.discountValue;
    }
  
    const cartTotal = cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
    return cartTotal - discount;
  }

  function applyCoupon(cartTotal: number, coupon: { code: string; discountValue: number; minPurchase: number }, providedCode: string): number {
    if (coupon.code === providedCode && cartTotal >= coupon.minPurchase) {
      return applyPercentageDiscount(cartTotal, coupon.discountValue); // Reuse percentage function
    }
    return cartTotal; // No discount if code is invalid or minimum purchase not met
  }

  function applyOffers(
    cart: { items: { productId: string; quantity: number; price: number }[]; total: number },
    offers: { type: string; conditions: any }[]
  ): number {
    let updatedTotal = cart.total;
  
    offers.forEach(offer => {
      switch (offer.type) {
        case 'percentage':
          updatedTotal = applyPercentageDiscount(updatedTotal, offer.conditions.discountValue);
          break;
  
        case 'fixed':
          updatedTotal = applyFixedDiscount(updatedTotal, offer.conditions.discountValue);
          break;
  
        case 'bogo':
          updatedTotal = applyBogoOffer(cart.items);
          break;
  
        case 'free_shipping':
          updatedTotal = applyFreeShipping(updatedTotal, offer.conditions.shippingCost, offer.conditions.minPurchaseAmount);
          break;
  
        case 'bundle':
          updatedTotal = applyBundleOffer(cart.items, offer.conditions);
          break;
  
        default:
          console.warn(`Unsupported offer type: ${offer.type}`);
      }
    });
  
    return updatedTotal;
  }
  