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
                        <button type="submit" class="btn btn-primary">Сохранить</button>
                    </div>
                </form>
            </div>
        </div>
    </div>
    `
};

if (typeof ModalCore !== 'undefined') {
    ModalCore.register('order_info', modals.order_info);
    ModalCore.register('edit_order', modals.edit_order);
}

class OrdersManager {
    constructor() {
        this.orders = [];
        this.currentOrderId = null;
        this.goodsCache = new Map();
        this.init();
    }

    async init() {
        await this.loadOrders();
        this.renderOrders();
        this.bindEvents();
        this.updateStats();
    }

    async loadOrders() {
        try {
            this.orders = await examAPI.getOrders();
            console.log('Заказы загружены:', this.orders);
        } catch (error) {
            console.error('Ошибка загрузки заказов:', error);
            notifications.error('Не удалось загрузить заказы');
            this.orders = [];
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

        if (activeOrdersCount) {
            activeOrdersCount.textContent = this.orders.length;
        }
        if (totalOrdersCount) {
            totalOrdersCount.textContent = this.orders.length;
        }
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString || 'Неизвестно';
        }
    }

    async calculateOrderTotal(order) {
        const goods = await this.loadGoodsForOrder(order.good_ids);
        return goods.reduce((total, good) => {
            const price = good.discount_price || good.actual_price || 0;
            return total + price;
        }, 0);
    }

    async renderOrders() {
        const tbody = document.getElementById('ordersTableBody');
        const emptyOrders = document.getElementById('emptyOrders');

        if (!tbody) return;

        if (this.orders.length === 0) {
            tbody.innerHTML = '';
            if (emptyOrders) {
                emptyOrders.style.display = 'block';
            }
            return;
        }

        if (emptyOrders) {
            emptyOrders.style.display = 'none';
        }

        tbody.innerHTML = '';
        for (let i = 0; i < this.orders.length; i++) {
            const order = this.orders[i];
            const orderElement = await this.createOrderRow(order, i);
            tbody.appendChild(orderElement);
        }
    }

    async createOrderRow(order, index) {
        const tr = document.createElement('tr');
        tr.setAttribute('data-order-id', order.id);

        const goods = await this.loadGoodsForOrder(order.good_ids);
        const goodsList = goods.slice(0, 2).map(good => good.name).join(', ');
        const moreItems = goods.length > 2 ? `... и еще ${goods.length - 2}` : '';
        const total = await this.calculateOrderTotal(order);

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${this.formatDate(order.created_at)}</td>
            <td title="${goods.map(g => g.name).join(', ')}">
                ${goodsList} ${moreItems}
            </td>
            <td>${formatPrice(total)}</td>
            <td>${order.delivery_date}<br>${order.delivery_interval}</td>
            <td class="actions">
                <button class="btn btn-sm btn-info view-order-btn" data-order-id="${order.id}">
                    Просмотр
                </button>
                <button class="btn btn-sm btn-warning edit-order-btn" data-order-id="${order.id}">
                    Редактировать
                </button>
                <button class="btn btn-sm btn-danger delete-order-btn" data-order-id="${order.id}">
                    Удалить
                </button>
            </td>
        `;

        return tr;
    }

    async viewOrder(orderId) {
        try {
            const order = await examAPI.getOrder(orderId);
            if (!order) {
                notifications.error('Заказ не найден');
                return;
            }

            this.currentOrderId = orderId;
            if (typeof ModalCore !== 'undefined') {
                ModalCore.open('order_info');
            } else {
                showModal('viewOrderModal');
            }

            document.getElementById('orderNumber').textContent = orderId;
            document.getElementById('orderDate').textContent = this.formatDate(order.created_at);
            document.getElementById('deliveryDate').textContent = order.delivery_date;
            document.getElementById('deliveryInterval').textContent = order.delivery_interval;
            document.getElementById('deliveryAddress').textContent = order.delivery_address;
            document.getElementById('customerName').textContent = order.full_name;
            document.getElementById('customerPhone').textContent = order.phone;
            document.getElementById('customerEmail').textContent = order.email;
            document.getElementById('orderNotes').textContent = order.comment || 'Нет комментария';

            const goods = await this.loadGoodsForOrder(order.good_ids);
            const container = document.getElementById('orderItemsList');
            const totalAmount = document.getElementById('orderTotalAmount');

            if (container) {
                container.innerHTML = goods.map(good => `
                    <div class="order__item">
                        <div class="item__info">
                            <div class="item__name">${good.name}</div>
                            <div class="item__meta">${formatPrice(good.discount_price || good.actual_price)}</div>
                        </div>
                        <div class="item__total">${formatPrice(good.discount_price || good.actual_price)}</div>
                    </div>
                `).join('');
            }

            if (totalAmount) {
                const total = goods.reduce((sum, good) => sum + (good.discount_price || good.actual_price || 0), 0);
                totalAmount.textContent = formatPrice(total);
            }

        } catch (error) {
            console.error('Ошибка просмотра заказа:', error);
            notifications.error('Не удалось загрузить детали заказа');
        }
    }

    async editOrder(orderId) {
        try {
            const order = await examAPI.getOrder(orderId);
            if (!order) {
                notifications.error('Заказ не найден');
                return;
            }

            this.currentOrderId = orderId;
            if (typeof ModalCore !== 'undefined') {
                ModalCore.open('edit_order');
            }

            document.getElementById('editOrderNumber').textContent = orderId;
            document.getElementById('editFullName').value = order.full_name;
            document.getElementById('editEmail').value = order.email;

            const phone = order.phone;
            let formattedPhone = phone;
            if (phone && phone.length >= 11) {
                const digits = phone.replace(/\D/g, '');
                if (digits.length === 11) {
                    formattedPhone = '+7 (' + digits.substring(1, 4) + ') ' +
                        digits.substring(4, 7) + '-' +
                        digits.substring(7, 9) + '-' +
                        digits.substring(9, 11);
                }
            }
            document.getElementById('editPhone').value = formattedPhone;

            document.getElementById('editDeliveryAddress').value = order.delivery_address;

            let dateValue = order.delivery_date;
            if (dateValue.includes('.')) {
                const [day, month, year] = dateValue.split('.');
                dateValue = `${year}-${month}-${day}`;
            }
            document.getElementById('editDeliveryDate').value = dateValue;

            document.getElementById('editDeliveryInterval').value = order.delivery_interval;
            document.getElementById('editComment').value = order.comment || '';

            const editPhoneInput = document.getElementById('editPhone');
            if (editPhoneInput) {
                this.applyPhoneMask(editPhoneInput);
            }

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

            await this.loadOrders();
            this.renderOrders();
            this.updateStats();

        } catch (error) {
            console.error('Ошибка удаления заказа:', error);
            notifications.error('Не удалось удалить заказ');
        }
    }

    async updateOrder() {
        const formData = {
            full_name: document.getElementById('editFullName').value,
            email: document.getElementById('editEmail').value,
            phone: document.getElementById('editPhone').value,
            delivery_address: document.getElementById('editDeliveryAddress').value,
            delivery_date: this.formatDateForAPI(document.getElementById('editDeliveryDate').value),
            delivery_interval: document.getElementById('editDeliveryInterval').value,
            comment: document.getElementById('editComment').value || ''
        };

        let phone = formData.phone.replace(/\D/g, '');
        if (phone.startsWith('7')) {
            phone = '8' + phone.substring(1);
        } else if (phone.length === 10) {
            phone = '8' + phone;
        }
        formData.phone = phone;

        try {
            await examAPI.updateOrder(this.currentOrderId, formData);
            notifications.success('Заказ успешно обновлен!');

            if (typeof ModalCore !== 'undefined') {
                ModalCore.close('edit_order');
            }

            await this.loadOrders();
            this.renderOrders();
            this.updateStats();

        } catch (error) {
            console.error('Ошибка обновления заказа:', error);
            notifications.error('Не удалось обновить заказ: ' + error.message);
        }
    }

    formatDateForAPI(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    }

    bindEvents() {
        document.addEventListener('click', async (e) => {
            if (e.target.classList.contains('view-order-btn')) {
                const orderId = e.target.dataset.orderId;
                await this.viewOrder(orderId);
            }

            if (e.target.classList.contains('edit-order-btn')) {
                const orderId = e.target.dataset.orderId;
                await this.editOrder(orderId);
            }

            if (e.target.classList.contains('delete-order-btn')) {
                const orderId = e.target.dataset.orderId;
                await this.deleteOrder(orderId);
            }
        });

        document.addEventListener('submit', async (e) => {
            if (e.target && e.target.id === 'editOrderForm') {
                e.preventDefault();
                await this.updateOrder();
            }
        });
    }

    applyPhoneMask(inputElement) {
        inputElement.addEventListener('input', function (e) {
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

let ordersManager;
document.addEventListener('DOMContentLoaded', () => {
    ordersManager = new OrdersManager();
    window.ordersManager = ordersManager;
});