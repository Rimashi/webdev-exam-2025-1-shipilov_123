const modals = {
    "order_info": `
    <div class="modal__background" role="presentation" data-modal="order_info">
        <div class="modal__active" role="dialog" aria-modal="true">
            <div class="modal__close" data-modal-close>
                <span>×</span>
            </div>
            <div class="modal__window">
                <h2>Детали заказа #<span id="orderNumber"></span></h2>
                <div class="order__details-content">
                    <div class="order__info-section">
                        <h3>Информация о заказе</h3>
                        <div class="info__grid">
                            <div class="info__item">
                                <span class="info__label">Дата создания:</span>
                                <span class="info__value" id="orderDate"></span>
                            </div>
                            <div class="info__item">
                                <span class="info__label">Дата доставки:</span>
                                <span class="info__value" id="deliveryDate"></span>
                            </div>
                            <div class="info__item">
                                <span class="info__label">Интервал доставки:</span>
                                <span class="info__value" id="deliveryInterval"></span>
                            </div>
                            <div class="info__item">
                                <span class="info__label">Адрес доставки:</span>
                                <span class="info__value" id="deliveryAddress"></span>
                            </div>
                        </div>
                    </div>

                    <div class="customer__info-section">
                        <h3>Данные клиента</h3>
                        <div class="info__grid">
                            <div class="info__item">
                                <span class="info__label">Имя:</span>
                                <span class="info__value" id="customerName"></span>
                            </div>
                            <div class="info__item">
                                <span class="info__label">Телефон:</span>
                                <span class="info__value" id="customerPhone"></span>
                            </div>
                            <div class="info__item">
                                <span class="info__label">Email:</span>
                                <span class="info__value" id="customerEmail"></span>
                            </div>
                        </div>
                    </div>

                    <div class="order__items-section">
                        <h3>Состав заказа</h3>
                        <div class="order__items-list" id="orderItemsList"></div>
                        <div class="order__total-section">
                            <div class="total__line">
                                <span>Итого:</span>
                                <span class="total__amount" id="orderTotalAmount"></span>
                            </div>
                        </div>
                    </div>

                    <div class="order__notes-section">
                        <h3>Комментарий к заказу</h3>
                        <p id="orderNotes" class="order__notes"></p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    "edit_order": `
    <div class="modal__background" role="presentation" data-modal="edit_order">
        <div class="modal__active" role="dialog" aria-modal="true">
            <div class="modal__close" data-modal-close>
                <span>×</span>
            </div>
            <div class="modal__window">
                <h2>Редактирование заказа #<span id="editOrderNumber"></span></h2>
                <form id="editOrderForm" class="order-form">
                    <div class="form-group">
                        <label for="editFullName">Имя *</label>
                        <input type="text" id="editFullName" required>
                    </div>
                    <div class="form-group">
                        <label for="editEmail">Email *</label>
                        <input type="email" id="editEmail" required>
                    </div>
                    <div class="form-group">
                        <label for="editPhone">Телефон *</label>
                        <input type="tel" id="editPhone" required>
                    </div>
                    <div class="form-group">
                        <label for="editDeliveryAddress">Адрес доставки *</label>
                        <input type="text" id="editDeliveryAddress" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editDeliveryDate">Дата доставки *</label>
                            <input type="date" id="editDeliveryDate" required>
                        </div>
                        <div class="form-group">
                            <label for="editDeliveryInterval">Временной интервал *</label>
                            <select id="editDeliveryInterval" required>
                                <option value="08:00-12:00">08:00-12:00</option>
                                <option value="12:00-14:00">12:00-14:00</option>
                                <option value="14:00-18:00">14:00-18:00</option>
                                <option value="18:00-22:00">18:00-22:00</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editComment">Комментарий</label>
                        <textarea id="editComment"></textarea>
                    </div>
                    <div class="modal__actions">
                        <button type="button" class="btn btn-secondary" data-modal-close>Отмена</button>
                        <button type="submit" class="btn btn-primary btn-accent">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `
};

class OrdersManager {
    constructor() {
        this.orders = [];
        this.completedOrders = [];
        this.currentOrderId = null;
        this.goodsCache = new Map();
        this.init();
    }

    async init() {
        await this.loadOrders();
        this.setupActiveTabHighlight();
        this.bindEvents();
        this.renderOrders();
        this.updateStats();
    }

    setupActiveTabHighlight() {
        const currentPage = window.location.pathname.split('/').pop();
        const menuLinks = document.querySelectorAll('.menu__link');

        menuLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href === currentPage ||
                (currentPage === '' && href === 'index.html') ||
                (currentPage === 'index.html' && href === 'index.html')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    async loadOrders() {
        try {
            this.orders = await examAPI.getOrders();

            const savedCompleted = localStorage.getItem('completedOrders');
            this.completedOrders = savedCompleted ? JSON.parse(savedCompleted) : [];

            console.log('Заказы загружены:', this.orders);
            console.log('Завершенные заказы:', this.completedOrders);
        } catch (error) {
            console.error('Ошибка загрузки заказов:', error);
            notifications.error('Не удалось загрузить заказы');
            this.orders = [];
            this.completedOrders = [];
        }
    }

    async loadGoodsForOrder(goodIds) {
        const goods = [];

        for (const id of goodIds) {
            try {
                let good;
                if (this.goodsCache.has(id)) {
                    good = this.goodsCache.get(id);
                } else {
                    good = await examAPI.getGood(id);
                    if (good) {
                        this.goodsCache.set(id, good);
                    }
                }
                if (good) {
                    goods.push(good);
                }
            } catch (error) {
                console.error(`Ошибка загрузки товара ${id}:`, error);
            }
        }

        return goods;
    }

    updateStats() {
        const activeOrdersCount = document.getElementById('activeOrdersCount');
        const totalOrdersCount = document.getElementById('totalOrdersCount');
        const completedOrdersCount = document.getElementById('completedOrdersCount');

        if (activeOrdersCount) {
            activeOrdersCount.textContent = this.orders.length;
        }
        if (totalOrdersCount) {
            totalOrdersCount.textContent = this.orders.length + this.completedOrders.length;
        }
        if (completedOrdersCount) {
            completedOrdersCount.textContent = this.completedOrders.length;
        }
    }

    formatDate(dateString) {
        try {
            if (!dateString) return 'Не указана';

            if (dateString.includes('.')) {
                const [day, month, year] = dateString.split('.');
                const date = new Date(year, month - 1, day);
                return date.toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            } else {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) {
                    return dateString;
                }
                return date.toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            }
        } catch {
            return dateString || 'Неизвестно';
        }
    }

    formatDateTime(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return this.formatDate(dateString);
            }
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return this.formatDate(dateString);
        }
    }

    canEditOrder(order) {
        try {
            if (!order.delivery_date) return true;

            const deliveryDate = this.parseDeliveryDate(order.delivery_date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            return deliveryDate >= today;
        } catch (error) {
            console.error('Ошибка проверки возможности редактирования:', error);
            return false;
        }
    }

    parseDeliveryDate(dateString) {
        try {
            if (dateString.includes('.')) {
                const [day, month, year] = dateString.split('.').map(Number);
                return new Date(year, month - 1, day);
            } else {
                return new Date(dateString);
            }
        } catch {
            return new Date();
        }
    }

    async calculateOrderTotal(goods) {
        return goods.reduce((total, good) => {
            const price = good.discount_price || good.actual_price || 0;
            return total + price;
        }, 0);
    }

    async renderOrders() {
        const activeOrdersList = document.getElementById('activeOrdersList');
        const completedOrdersList = document.getElementById('completedOrdersList');
        const emptyActiveOrders = document.getElementById('emptyActiveOrders');
        const emptyCompletedOrders = document.getElementById('emptyCompletedOrders');

        if (this.orders.length === 0) {
            if (activeOrdersList) activeOrdersList.innerHTML = '';
            if (emptyActiveOrders) emptyActiveOrders.style.display = 'block';
        } else {
            if (emptyActiveOrders) emptyActiveOrders.style.display = 'none';
            if (activeOrdersList) {
                activeOrdersList.innerHTML = '';
                for (const order of this.orders) {
                    if (this.completedOrders.some(co => co.id === order.id)) {
                        continue;
                    }
                    const orderElement = await this.createOrderCard(order, false);
                    activeOrdersList.appendChild(orderElement);
                }
            }
        }

        if (this.completedOrders.length === 0) {
            if (completedOrdersList) completedOrdersList.innerHTML = '';
            if (emptyCompletedOrders) emptyCompletedOrders.style.display = 'block';
        } else {
            if (emptyCompletedOrders) emptyCompletedOrders.style.display = 'none';
            if (completedOrdersList) {
                completedOrdersList.innerHTML = '';
                for (const order of this.completedOrders) {
                    const orderElement = await this.createOrderCard(order, true);
                    completedOrdersList.appendChild(orderElement);
                }
            }
        }
    }

    async createOrderCard(order, isCompleted) {
        const card = document.createElement('div');
        card.className = `order-card ${isCompleted ? 'order-card--completed' : ''}`;
        card.setAttribute('data-order-id', order.id);

        const goods = await this.loadGoodsForOrder(order.good_ids);
        const total = await this.calculateOrderTotal(goods);
        const canEdit = !isCompleted && this.canEditOrder(order);
        const deliveryDate = this.formatDate(order.delivery_date);
        const deliveryInterval = order.delivery_interval ? `(${order.delivery_interval})` : '';

        const goodsHtml = goods.map(good => {
            let new_img = "http://localhost:8000/api" + good.image_url?.replace('https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api', '') || '';

            return `
            <div class="order-good-item">
                <div class="order-good-item__image">
                    <img src="${good.image_url}" 
                         alt="${good.name}" 
                         onerror="this.src='https://via.placeholder.com/60x60?text=No+Image'">
                </div>
                <div class="order-good-item__info">
                    <h4 class="order-good-item__name">${good.name}</h4>
                    <div class="order-good-item__price">${formatPrice(good.discount_price || good.actual_price || 0)}</div>
                </div>
            </div>
        `;
        }).join('');

        card.innerHTML = `
        <div class="order-card__header">
            <h3 class="order-card__title">Заказ #${order.id}</h3>
            <span class="order-card__date">${this.formatDateTime(order.created_at)}</span>
        </div>
        <div class="order-card__body">
            <div class="order-card__goods">
                <h4>Товары (${goods.length}):</h4>
                ${goodsHtml}
            </div>
            <div class="order-card__summary">
                <div class="order-summary__item">
                    <span class="order-summary__label">Товары:</span>
                    <span class="order-summary__value">${formatPrice(total)}</span>
                </div>
                <div class="order-summary__item">
                    <span class="order-summary__label">Доставка:</span>
                    <span class="order-summary__value">
                        ${deliveryDate} ${deliveryInterval}
                    </span>
                </div>
                <div class="order-summary__item order-summary__total">
                    <span class="order-summary__label">Итого:</span>
                    <span class="order-summary__value">${formatPrice(total)}</span>
                </div>
            </div>
        </div>
        <div class="order-card__footer">
            <div class="order-card__status">
                ${isCompleted ?
                '<span class="status-badge status-badge--completed">Завершён</span>' :
                `<span>${deliveryDate} ${deliveryInterval}</span>`
            }
                ${order.delivery_address ? `<span>${order.delivery_address}</span>` : ''}
            </div>
            <div class="order-card__actions">
                <button class="btn btn-sm btn-info view-order-btn" data-order-id="${order.id}">
                    Просмотр
                </button>
                ${!isCompleted ? `
                    <button class="btn btn-sm btn-warning edit-order-btn" data-order-id="${order.id}" ${canEdit ? '' : 'disabled title="Редактирование недоступно (дата доставки прошла)"'}>
                        Редактировать
                    </button>
                    <button class="btn btn-sm btn-success complete-order-btn" data-order-id="${order.id}">
                        Завершить
                    </button>
                ` : ''}
                <button class="btn btn-sm btn-outline-accent reorder-btn" data-order-id="${order.id}">
                    Заказать снова
                </button>
                ${!isCompleted ? `
                    <button class="btn btn-sm btn-danger delete-order-btn" data-order-id="${order.id}">
                        Удалить
                    </button>
                ` : ''}
            </div>
        </div>
    `;

        return card;
    }

    async viewOrder(orderId) {
        try {
            let order;
            let goods;

            order = this.orders.find(o => o.id == orderId);
            if (!order) {
                order = this.completedOrders.find(o => o.id == orderId);
            }

            if (!order) {
                order = await examAPI.getOrder(orderId);
            }

            if (!order) {
                notifications.error('Заказ не найден');
                return;
            }

            this.currentOrderId = orderId;
            this.showModal('orderDetailsModal');

            document.getElementById('modalOrderNumber').textContent = orderId;

            const modalContent = document.getElementById('orderDetailsContent');
            goods = await this.loadGoodsForOrder(order.good_ids);
            const total = await this.calculateOrderTotal(goods);

            const goodsHtml = goods.map(good => {
                let new_img = "http://localhost:8000/api" + good.image_url?.replace('https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api', '') || '';
                return `
                <div class="order-good-item" style="margin-bottom: 15px; padding: 12px; background: var(--bg-secondary); border-radius: var(--border-radius);">
                    <div class="order-good-item__image">
                        <img src="${good.image_url}" 
                             alt="${good.name}"
                             style="width: 80px; height: 80px;"
                             onerror="this.src='https://via.placeholder.com/80x80?text=No+Image'">
                    </div>
                    <div class="order-good-item__info">
                        <h4 style="margin: 0 0 5px 0; font-size: 16px;">${good.name}</h4>
                        <div style="color: var(--accent-neon); font-weight: 700; font-size: 18px;">${formatPrice(good.discount_price || good.actual_price || 0)}</div>
                        ${good.rating ? `<div style="color: #ffaa00; margin-top: 5px;">${renderRating(good.rating)} ${good.rating.toFixed(1)}</div>` : ''}
                    </div>
                </div>
            `;
            }).join('');

            modalContent.innerHTML = `
            <div class="delivery-info">
                <h4>Информация о доставке</h4>
                <p>
                    <span>Дата доставки:</span>
                    <span>${this.formatDate(order.delivery_date)}</span>
                </p>
                <p>
                    <span>Интервал:</span>
                    <span>${order.delivery_interval || 'Не указан'}</span>
                </p>
                <p>
                    <span>Адрес:</span>
                    <span>${order.delivery_address || 'Не указан'}</span>
                </p>
                <p>
                    <span>Дата создания:</span>
                    <span>${this.formatDateTime(order.created_at)}</span>
                </p>
            </div>
            
            <div class="delivery-info">
                <h4>Данные покупателя</h4>
                <p>
                    <span>Имя:</span>
                    <span>${order.full_name || 'Не указано'}</span>
                </p>
                <p>
                    <span>Телефон:</span>
                    <span>${order.phone || 'Не указан'}</span>
                </p>
                <p>
                    <span>Email:</span>
                    <span>${order.email || 'Не указан'}</span>
                </p>
            </div>
            
            <div style="margin-top: 20px;">
                <h4 style="color: var(--accent-neon); margin-bottom: 15px; font-size: 18px;">Товары (${goods.length})</h4>
                <div style="max-height: 300px; overflow-y: auto; padding-right: 10px;">
                    ${goodsHtml}
                </div>
            </div>
            
            <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--border-medium);">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="margin: 0; font-size: 18px;">Общая стоимость:</h4>
                    <h3 style="margin: 0; color: var(--accent-neon); font-size: 24px;">${formatPrice(total)}</h3>
                </div>
            </div>
            
            ${order.comment ? `
                <div style="margin-top: 20px; padding: 15px; background: var(--bg-secondary); border-radius: var(--border-radius); border: 1px solid var(--border-medium);">
                    <h4 style="margin-bottom: 10px; color: var(--accent-neon); font-size: 16px;">Комментарий к заказу</h4>
                    <p style="margin: 0; color: var(--text-primary); line-height: 1.6;">${order.comment}</p>
                </div>
            ` : ''}
        `;

            const goodsScrollContainer = modalContent.querySelector('div[style*="max-height: 300px"]');
            if (goodsScrollContainer) {
                goodsScrollContainer.style.scrollbarWidth = 'thin';
                goodsScrollContainer.style.scrollbarColor = 'var(--accent-neon) var(--bg-secondary)';
            }

        } catch (error) {
            console.error('Ошибка просмотра заказа:', error);
            notifications.error('Не удалось загрузить детали заказа');
        }
    }

    async editOrder(orderId) {
        try {
            const order = this.orders.find(o => o.id == orderId);
            if (!order) {
                notifications.error('Заказ не найден');
                return;
            }

            if (!this.canEditOrder(order)) {
                notifications.error('Редактирование недоступно: дата доставки уже прошла');
                return;
            }

            this.currentOrderId = orderId;
            this.showModal('editOrderModal');

            document.getElementById('editModalOrderNumber').textContent = orderId;
            document.getElementById('editFullName').value = order.full_name || '';
            document.getElementById('editPhone').value = order.phone || '';
            document.getElementById('editDeliveryAddress').value = order.delivery_address || '';

            let dateValue = order.delivery_date;
            if (dateValue && dateValue.includes('.')) {
                const [day, month, year] = dateValue.split('.');
                dateValue = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            document.getElementById('editDeliveryDate').value = dateValue || '';
            document.getElementById('editDeliveryInterval').value = order.delivery_interval || '14:00-18:00';
            document.getElementById('editComment').value = order.comment || '';

        } catch (error) {
            console.error('Ошибка редактирования заказа:', error);
            notifications.error('Не удалось загрузить заказ для редактирования');
        }
    }

    async deleteOrder(orderId) {
        const confirmed = confirm('Вы уверены, что хотите удалить этот заказ?');

        if (!confirmed) return;

        try {
            await examAPI.deleteOrder(orderId);
            notifications.success('Заказ успешно удален!');

            this.orders = this.orders.filter(o => o.id != orderId);
            this.completedOrders = this.completedOrders.filter(o => o.id != orderId);
            localStorage.setItem('completedOrders', JSON.stringify(this.completedOrders));

            this.renderOrders();
            this.updateStats();

        } catch (error) {
            console.error('Ошибка удаления заказа:', error);
            notifications.error('Не удалось удалить заказ');
        }
    }

    async completeOrder(orderId) {
        try {
            const order = this.orders.find(o => o.id == orderId);
            if (!order) {
                notifications.error('Заказ не найден');
                return;
            }

            this.completedOrders.push(order);
            this.orders = this.orders.filter(o => o.id != orderId);

            localStorage.setItem('completedOrders', JSON.stringify(this.completedOrders));

            notifications.success('Заказ отмечен как завершённый!');

            this.renderOrders();
            this.updateStats();

        } catch (error) {
            console.error('Ошибка завершения заказа:', error);
            notifications.error('Не удалось завершить заказ');
        }
    }

    async reorder(orderId) {
        try {
            let order = this.orders.find(o => o.id == orderId);
            if (!order) {
                order = this.completedOrders.find(o => o.id == orderId);
            }

            if (!order) {
                order = await examAPI.getOrder(orderId);
            }

            if (!order || !order.good_ids || order.good_ids.length === 0) {
                notifications.error('Не удалось найти товары в заказе');
                return;
            }

            const goods = await this.loadGoodsForOrder(order.good_ids);

            const cart = getCart();
            let addedCount = 0;

            for (const good of goods) {
                const existingItem = cart.find(item => item.id === good.id);
                if (existingItem) {
                    existingItem.quantity += 1;
                } else {
                    cart.push({ id: good.id, quantity: 1 });
                }
                addedCount++;
            }

            saveCart(cart);
            updateCartBadge();

            notifications.success(`${addedCount} товаров добавлено в корзину!`);

            setTimeout(() => {
                window.location.href = './basket.html';
            }, 1500);

        } catch (error) {
            console.error('Ошибка повторного заказа:', error);
            notifications.error('Не удалось добавить товары в корзину');
        }
    }

    async updateOrder() {
        const form = document.getElementById('editOrderForm');
        if (!form || !this.currentOrderId) return;

        const formData = {
            full_name: document.getElementById('editFullName').value,
            phone: document.getElementById('editPhone').value,
            delivery_address: document.getElementById('editDeliveryAddress').value,
            delivery_date: this.formatDateForAPI(document.getElementById('editDeliveryDate').value),
            delivery_interval: document.getElementById('editDeliveryInterval').value,
            comment: document.getElementById('editComment').value || ''
        };

        if (!formData.full_name || !formData.phone || !formData.delivery_address ||
            !formData.delivery_date || !formData.delivery_interval) {
            notifications.error('Заполните все обязательные поля');
            return;
        }

        try {
            await examAPI.updateOrder(this.currentOrderId, formData);
            notifications.success('Заказ успешно обновлен!');

            this.closeModal('editOrderModal');

            const orderIndex = this.orders.findIndex(o => o.id == this.currentOrderId);
            if (orderIndex !== -1) {
                this.orders[orderIndex] = {
                    ...this.orders[orderIndex],
                    ...formData
                };
            }

            this.renderOrders();

        } catch (error) {
            console.error('Ошибка обновления заказа:', error);
            notifications.error('Не удалось обновить заказ: ' + (error.message || 'Ошибка сервера'));
        }
    }

    formatDateForAPI(dateString) {
        try {
            const date = new Date(dateString);
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}.${month}.${year}`;
        } catch {
            return dateString;
        }
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    }

    bindEvents() {
        document.querySelectorAll('.tab__btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;

                document.querySelectorAll('.tab__btn').forEach(b => b.classList.remove('tab__btn--active'));
                e.target.classList.add('tab__btn--active');

                document.querySelectorAll('.tab__content').forEach(content => {
                    content.classList.remove('tab__content--active');
                });
                document.getElementById(`${tabId}Orders`).classList.add('tab__content--active');
            });
        });

        document.addEventListener('click', async (e) => {
            const target = e.target;
            const orderId = target.dataset.orderId ||
                target.closest('[data-order-id]')?.dataset.orderId;

            if (!orderId) return;

            if (target.classList.contains('view-order-btn') ||
                target.closest('.view-order-btn')) {
                e.preventDefault();
                await this.viewOrder(orderId);
            }

            if (target.classList.contains('edit-order-btn') ||
                target.closest('.edit-order-btn')) {
                e.preventDefault();
                await this.editOrder(orderId);
            }

            if (target.classList.contains('delete-order-btn') ||
                target.closest('.delete-order-btn')) {
                e.preventDefault();
                await this.deleteOrder(orderId);
            }

            if (target.classList.contains('complete-order-btn') ||
                target.closest('.complete-order-btn')) {
                e.preventDefault();
                await this.completeOrder(orderId);
            }

            if (target.classList.contains('reorder-btn') ||
                target.closest('.reorder-btn')) {
                e.preventDefault();
                await this.reorder(orderId);
            }
        });

        const editForm = document.getElementById('editOrderForm');
        if (editForm) {
            editForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateOrder();
            });
        }

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

        document.querySelectorAll('.modal__overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                const modalId = e.target.closest('.modal')?.id;
                if (modalId) {
                    this.closeModal(modalId);
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => {
                    if (modal.style.display === 'flex') {
                        this.closeModal(modal.id);
                    }
                });
            }
        });
    }
}

let ordersManager;
document.addEventListener('DOMContentLoaded', () => {
    ordersManager = new OrdersManager();
    window.ordersManager = ordersManager;
});