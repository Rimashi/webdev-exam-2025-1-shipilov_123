// ===== BURGER MENU =====
document.addEventListener('DOMContentLoaded', function () {
    const menuIcon = document.querySelector('.menu__icon');
    const menu = document.querySelector('.header__menu');
    const menuOverlay = document.getElementById('menu_overlay');
    const body = document.body;

    if (!menuIcon || !menu || !menuOverlay) {
        console.error('One or more menu elements not found');
        return;
    }

    function toggleMenu() {
        menuIcon.classList.toggle('active');
        menu.classList.toggle('active');
        menuOverlay.classList.toggle('active');
        body.classList.toggle('menu-open');
    }

    menuIcon.addEventListener('click', function (e) {
        e.stopPropagation();
        e.preventDefault();
        toggleMenu();
    });

    menuOverlay.addEventListener('click', function (e) {
        e.stopPropagation();
        if (menu.classList.contains('active')) {
            toggleMenu();
        }
    });

    const menuLinks = document.querySelectorAll('.menu__list a');
    menuLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            if (menu.classList.contains('active')) {
                toggleMenu();
            }
        });
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth > 767 && menu.classList.contains('active')) {
            toggleMenu();
        }
    });
});

// ===== ModalManager =====
(function (global) {
    class ModalManager {
        constructor(container = document.body) {
            this.templates = {};
            this.container = container;
            this.active = null;
            document.addEventListener('click', this._click.bind(this));
            document.addEventListener('keydown', this._key.bind(this));
        }

        register(key, html) {
            if (!key || typeof html !== 'string') return;
            this.templates[key] = html;
        }

        _click(e) {
            const open = e.target.closest('[data-modal-open]');
            if (open) {
                const key = open.dataset.modalOpen;
                this.open(key);
                return;
            }

            if (e.target.closest('[data-modal-close]')) {
                this.close();
                return;
            }

            const backdrop = e.target.closest('.modal__background');
            if (backdrop &&
                e.target === backdrop &&
                backdrop.classList.contains('active')) {
                this.close();
            }
        }

        _key(e) {
            if (e.key === 'Escape') this.close();
        }

        _ensureInDOM(key) {
            if (!this.templates[key]) return;
            if (this.container.querySelector(`[data-modal="${key}"]`)) return;

            const wrap = document.createElement('div');
            wrap.innerHTML = this.templates[key].trim();
            const el = wrap.firstElementChild;
            if (!el) return;

            el.dataset.modal = key;
            this.container.appendChild(el);
        }

        open(key) {
            if (!key) return;
            if (!this.templates[key]) {
                console.warn('Modal template not registered:', key);
                return;
            }
            this._ensureInDOM(key);
            const el = this.container.querySelector(`[data-modal="${key}"]`);
            if (!el) return;
            el.classList.add('active');
            document.body.classList.add('modal-open');
            this.active = el;

            const focusEl = el.querySelector('button, a, input, textarea, select, [tabindex]:not([tabindex="-1"])');
            if (focusEl) focusEl.focus();
        }

        close() {
            if (!this.active) return;
            this.active.classList.remove('active');
            document.body.classList.remove('modal-open');
            this.active = null;
        }
    }
    global.ModalCore = new ModalManager();
})(window);

// ==== Theme Switcher ====
class ThemeSwitcher {
    constructor(toggleSelector = '#themeToggle') {
        this.el = document.querySelector(toggleSelector);
        this.themeKey = 'theme';
        this._applySaved();
        this._bind();
    }

    _applySaved() {
        const current = localStorage.getItem(this.themeKey) || 'light';
        if (current === 'dark') document.body.classList.add('dark-theme');
        if (this.el) {
            this.el.textContent = document.body.classList.contains('dark-theme') ? '☀️' : '🌙';
        }
    }

    _bind() {
        if (!this.el) return;
        this.el.addEventListener('click', () => this.toggle());
    }

    toggle() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem(this.themeKey, isDark ? 'dark' : 'light');
        if (this.el) this.el.textContent = isDark ? '☀️' : '🌙';
    }
}
window.themeSwitcher = new ThemeSwitcher();

// ===== Глобальные утилиты =====
window.examUtils = {
    formatPrice: (price) => {
        return new Intl.NumberFormat('ru-RU').format(price) + '₽';
    },

    getNoun: (number, one, two, five) => {
        let n = Math.abs(number);
        n %= 100;
        if (n >= 5 && n <= 20) {
            return five;
        }
        n %= 10;
        if (n === 1) {
            return one;
        }
        if (n >= 2 && n <= 4) {
            return two;
        }
        return five;
    },

    ucfirst: (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
};

// ===== Корзина =====
class BasketStorage {
    constructor() {
        this.STORAGE_KEY = 'shop_basket';
        this.goodsData = null;
        this.init();
    }

    async init() {
        await this.loadGoods();
    }

    async loadGoods() {
        try {
            const response = await examAPI.getGoods(1, 100, '', '');
            this.goodsData = response?.data || [];
            console.log('Goods loaded successfully:', this.goodsData.length);
        } catch (error) {
            console.error('Failed to load goods:', error);
            this.goodsData = [];
        }
    }

    getGoodById(id) {
        if (!this.goodsData) return null;
        return this.goodsData.find(good => good.id == id);
    }

    getBasket() {
        try {
            return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        } catch {
            return [];
        }
    }

    saveBasket(basket) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(basket));
        this.dispatchBasketUpdate();
    }

    addItem(id) {
        const basket = this.getBasket();
        const existingItem = basket.find(item => item.id == id);

        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
            basket.push({ id, quantity: 1 });
        }

        this.saveBasket(basket);
    }

    removeItem(id) {
        const basket = this.getBasket().filter(item => item.id != id);
        this.saveBasket(basket);
    }

    updateQuantity(id, quantity) {
        const basket = this.getBasket();
        const item = basket.find(item => item.id == id);

        if (item) {
            if (quantity <= 0) {
                this.removeItem(id);
            } else {
                item.quantity = quantity;
                this.saveBasket(basket);
            }
        }
    }

    clearBasket() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.dispatchBasketUpdate();
    }

    getTotalCount() {
        const basket = this.getBasket();
        return basket.reduce((sum, item) => sum + (item.quantity || 1), 0);
    }

    async getBasketWithDetails() {
        const basket = this.getBasket();
        const itemsWithDetails = [];

        if (!this.goodsData || this.goodsData.length === 0) {
            await this.loadGoods();
        }

        for (const item of basket) {
            const good = this.getGoodById(item.id);
            if (good) {
                itemsWithDetails.push({
                    ...item,
                    name: good.name,
                    actual_price: good.actual_price,
                    discount_price: good.discount_price,
                    image_url: good.image_url,
                    rating: good.rating,
                    main_category: good.main_category
                });
            }
        }

        return itemsWithDetails;
    }

    async getTotalPrice() {
        const items = await this.getBasketWithDetails();
        return items.reduce((sum, item) => {
            const price = item.discount_price || item.actual_price || 0;
            return sum + (price * item.quantity);
        }, 0);
    }

    dispatchBasketUpdate() {
        window.dispatchEvent(new CustomEvent('basket-updated'));
    }
}

window.basketStorage = new BasketStorage();