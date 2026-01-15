class BasketManager {
    constructor() {
        this.init();
        this.setupPhoneMask();
    }

    async init() {
        try {
            await this.renderBasket();
            this.bindEvents();
            this.setupDeliveryCalculation();

            window.addEventListener('cart-updated', () => {
                this.renderBasket();
            });
        } catch (error) {
            console.error('Error initializing basket:', error);
        }
    }

    async renderBasket() {
        const container = document.getElementById('basketItems');
        const emptyBasket = document.getElementById('emptyBasket');

        if (!container) {
            console.error('Basket container not found');
            return;
        }

        const basket = window.getCart ? window.getCart() : [];
        console.log('Current basket:', basket);

        if (basket.length === 0) {
            container.innerHTML = '';
            if (emptyBasket) {
                emptyBasket.style.display = 'block';
            }
            this.calculateTotal();
            return;
        }

        if (emptyBasket) {
            emptyBasket.style.display = 'none';
        }

        const itemsWithDetails = [];
        for (const basketItem of basket) {
            try {
                if (!basketItem || !basketItem.id) {
                    console.warn('Invalid basket item:', basketItem);
                    continue;
                }

                const good = await examAPI.getGood(basketItem.id);
                if (good) {
                    itemsWithDetails.push({
                        ...basketItem,
                        name: good.name,
                        actual_price: good.actual_price,
                        discount_price: good.discount_price,
                        image_url: good.image_url,
                        rating: good.rating,
                        main_category: good.main_category
                    });
                } else {
                    console.warn(`Product with id ${basketItem.id} not found`);
                }
            } catch (error) {
                console.error('Error loading good:', error);
            }
        }

        if (itemsWithDetails.length === 0) {
            container.innerHTML = '';
            if (emptyBasket) {
                emptyBasket.style.display = 'block';
            }
            if (window.saveCart) window.saveCart([]);
            return;
        }

        container.innerHTML = itemsWithDetails.map(item => this.createBasketItem(item)).join('');
        this.calculateTotal();
    }

    createBasketItem(item) {
        if (!item) return '';

        const price = item.discount_price || item.actual_price || 0;
        const hasDiscount = item.discount_price && item.discount_price < item.actual_price;

        return `
            <div class="basket-item" data-id="${item.id}">
                <div class="basket-item__image">
                    <img src="${item.image_url || 'https://via.placeholder.com/120x120?text=No+Image'}" 
                         alt="${item.name || 'Товар'}" 
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/120x120?text=No+Image'">
                </div>
                <div class="basket-item__info">
                    <h3 class="basket-item__title">${item.name || 'Без названия'}</h3>
                    <div class="basket-item__meta">
                        <span class="rating">${renderRating(item.rating)} ${(item.rating || 0).toFixed(1)}</span>
                        <span class="category">${item.main_category || 'Без категории'}</span>
                    </div>
                    <div class="basket-item__price">
                        ${hasDiscount ? `
                            <span class="old-price">${formatPrice(item.actual_price)}</span>
                        ` : ''}
                        <span class="current-price">${formatPrice(price)}</span>
                    </div>
                </div>
                <div class="basket-item__controls">
                    <div class="cart-controls">
                        <button class="cart-decr" data-id="${item.id}" title="Уменьшить">−</button>
                        <span class="cart-qty">${item.quantity}</span>
                        <button class="cart-incr" data-id="${item.id}" title="Увеличить">+</button>
                        <button class="cart-remove" data-id="${item.id}" title="Удалить">✕</button>
                    </div>
                </div>
            </div>
        `;
    }

    async calculateTotal() {
        const goodsTotalEl = document.getElementById('goodsTotal');
        const deliveryCostEl = document.getElementById('deliveryCost');
        const orderTotalEl = document.getElementById('orderTotal');

        if (!goodsTotalEl || !deliveryCostEl || !orderTotalEl) return;

        try {
            const goodsTotal = await this.calculateGoodsTotal();
            const deliveryCost = this.calculateDeliveryCost();
            const orderTotal = goodsTotal + deliveryCost;

            goodsTotalEl.textContent = formatPrice(goodsTotal);
            deliveryCostEl.textContent = formatPrice(deliveryCost);
            orderTotalEl.textContent = formatPrice(orderTotal);
        } catch (error) {
            console.error('Error calculating total:', error);
            goodsTotalEl.textContent = formatPrice(0);
            deliveryCostEl.textContent = formatPrice(0);
            orderTotalEl.textContent = formatPrice(0);
        }
    }

    async calculateGoodsTotal() {
        const basket = window.getCart ? window.getCart() : [];
        let total = 0;

        for (const basketItem of basket) {
            try {
                if (!basketItem || !basketItem.id) continue;

                const good = await examAPI.getGood(basketItem.id);
                if (good) {
                    const price = good.discount_price || good.actual_price || 0;
                    total += price * basketItem.quantity;
                }
            } catch (error) {
                console.error('Error calculating good total:', error);
            }
        }

        return total;
    }

    calculateDeliveryCost() {
        const deliveryDateInput = document.getElementById('deliveryDate');
        const deliveryIntervalSelect = document.getElementById('deliveryInterval');

        if (!deliveryDateInput || !deliveryIntervalSelect ||
            !deliveryDateInput.value || !deliveryIntervalSelect.value) {
            return 0;
        }

        const deliveryDate = new Date(deliveryDateInput.value);
        const dayOfWeek = deliveryDate.getDay();
        const interval = deliveryIntervalSelect.value;

        let cost = 200;

        if (dayOfWeek === 0 || dayOfWeek === 6) {
            cost += 300;
        } else if (interval === '18:00-22:00') {
            cost += 200;
        }

        return cost;
    }

    setupDeliveryCalculation() {
        const deliveryDate = document.getElementById('deliveryDate');
        const deliveryInterval = document.getElementById('deliveryInterval');

        if (deliveryDate && deliveryInterval) {
            deliveryDate.addEventListener('change', () => this.calculateTotal());
            deliveryInterval.addEventListener('change', () => this.calculateTotal());
        }

        if (deliveryDate) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            deliveryDate.min = tomorrow.toISOString().split('T')[0];

            const defaultDate = tomorrow.toISOString().split('T')[0];
            if (!deliveryDate.value) {
                deliveryDate.value = defaultDate;
                this.calculateTotal();
            }
        }

        if (deliveryInterval && !deliveryInterval.value) {
            deliveryInterval.value = '14:00-18:00';
            this.calculateTotal();
        }
    }

    setupFormValidation() {
        const phoneInput = document.getElementById('phone');

        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.startsWith('7') || value.startsWith('8')) {
                    value = value.substring(1);
                }
                if (value.length > 0) {
                    value = '+7 (' + value.substring(0, 3) + ') ' + value.substring(3, 6) + '-' + value.substring(6, 8) + '-' + value.substring(8, 10);
                }
                e.target.value = value;
            });
        }
    }

    bindEvents() {
        document.addEventListener('click', async (e) => {
            if (!e.target.dataset.id) return;

            const id = parseInt(e.target.dataset.id);
            let basket = window.getCart ? window.getCart() : [];
            const itemIndex = basket.findIndex(item => item && item.id === id);

            if (itemIndex === -1) return;

            if (e.target.classList.contains('cart-incr')) {
                basket[itemIndex].quantity += 1;
                if (window.saveCart) window.saveCart(basket);
                await this.renderBasket();
                if (window.updateCartBadge) window.updateCartBadge();
                notifications.success('Количество товара увеличено');
            }

            if (e.target.classList.contains('cart-decr')) {
                if (basket[itemIndex].quantity > 1) {
                    basket[itemIndex].quantity -= 1;
                    if (window.saveCart) window.saveCart(basket);
                } else {
                    basket.splice(itemIndex, 1);
                    if (window.saveCart) window.saveCart(basket);
                }
                await this.renderBasket();
                if (window.updateCartBadge) window.updateCartBadge();
                notifications.success('Количество товара уменьшено');
            }
            if (e.target.classList.contains('cart-remove')) {
                basket = basket.filter(item => item.id !== id);
                if (window.saveCart) window.saveCart(basket);
                await this.renderBasket();
                if (window.updateCartBadge) window.updateCartBadge();
                notifications.success('Товар удален из корзины');
            }
        });

        const orderForm = document.getElementById('orderForm');
        if (orderForm) {
            orderForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const submitBtn = orderForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.textContent;

                try {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Оформление...';

                    const basket = window.getCart ? window.getCart() : [];
                    if (basket.length === 0) {
                        notifications.error('Корзина пуста');
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                        return;
                    }

                    const rawPhone = document.getElementById('phone').value;

                    const formData = {
                        full_name: document.getElementById('fullName').value,
                        email: document.getElementById('email').value,
                        phone: rawPhone.replace(/\D/g, ''),
                        delivery_address: document.getElementById('deliveryAddress').value,
                        delivery_date: this.formatDateForAPI(document.getElementById('deliveryDate').value),
                        delivery_interval: document.getElementById('deliveryInterval').value,
                        comment: document.getElementById('comment').value || '',
                        subscribe: document.getElementById('subscribe').checked ? 1 : 0,
                        good_ids: basket.map(item => item.id).filter(id => id && id > 0)
                    };

                    console.log('Order data to send:', formData);

                    const requiredFields = ['full_name', 'email', 'phone', 'delivery_address', 'delivery_date', 'delivery_interval'];
                    const missingFields = requiredFields.filter(field => !formData[field] || formData[field].trim() === '');

                    if (missingFields.length > 0) {
                        notifications.error(`Заполните все обязательные поля: ${missingFields.join(', ')}`);
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                        return;
                    }

                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(formData.email)) {
                        notifications.error('Введите корректный email адрес');
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                        return;
                    }

                    const phoneRegex = /^(\+7|8)[\s(]?\d{3}[\s)]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;
                    // if (!phoneRegex.test(rawPhone)) {
                    //     notifications.error('Введите корректный номер телефона');
                    //     submitBtn.disabled = false;
                    //     submitBtn.textContent = originalText;
                    //     return;
                    // }

                    if (formData.good_ids.length === 0) {
                        notifications.error('В корзине нет товаров');
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                        return;
                    }

                    const result = await examAPI.createOrder(formData);
                    console.log('Order created successfully:', result);

                    notifications.success('Заказ успешно оформлен! ID заказа: ' + (result.id || 'получен'));

                    if (window.saveCart) window.saveCart([]);
                    if (window.updateCartBadge) window.updateCartBadge();

                    setTimeout(() => {
                        window.location.href = './orders.html';
                    }, 2000);

                } catch (error) {
                    console.error('Order submission failed:', error);
                    notifications.error('Ошибка при оформлении заказа: ' + (error.message || 'Неизвестная ошибка'));

                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
            });
        }
    }

    formatDateForAPI(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    setupPhoneMask() {
        const phoneInput = document.getElementById('phone');
        if (!phoneInput) return;

        phoneInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');

            if (value.startsWith('7') || value.startsWith('8')) {
                value = value.substring(1);
            }

            if (value.length > 0) {
                let formattedValue = '+7 ';
                if (value.length > 0) formattedValue += '(' + value.substring(0, 3);
                if (value.length >= 3) formattedValue += ') ' + value.substring(3, 6);
                if (value.length >= 6) formattedValue += '-' + value.substring(6, 8);
                if (value.length >= 8) formattedValue += '-' + value.substring(8, 10);

                e.target.value = formattedValue;
            }
        });

        const editPhone = document.getElementById('editPhone');
        if (editPhone) {
            editPhone.addEventListener('input', function (e) {
                let value = e.target.value.replace(/\D/g, '');

                if (value.startsWith('7') || value.startsWith('8')) {
                    value = value.substring(1);
                }

                if (value.length > 0) {
                    let formattedValue = '+7 ';
                    if (value.length > 0) formattedValue += '(' + value.substring(0, 3);
                    if (value.length >= 3) formattedValue += ') ' + value.substring(3, 6);
                    if (value.length >= 6) formattedValue += '-' + value.substring(6, 8);
                    if (value.length >= 8) formattedValue += '-' + value.substring(8, 10);

                    e.target.value = formattedValue;
                }
            });
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('basket.html')) {
        window.basketManager = new BasketManager();
    }
});