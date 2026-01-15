class CatalogManager {
    constructor() {
        this.currentPage = 1;
        this.perPage = 10;
        this.totalGoods = 0;
        this.totalPages = 1;
        this.currentGoods = [];
        this.allGoods = [];
        this.filteredGoods = [];
        this.categories = new Set();
        this.currentFilters = {
            categories: [],
            priceFrom: null,
            priceTo: null,
            discountOnly: false,
            sortBy: '',
            searchQuery: ''
        };
        this.isLoading = false;

        this.init();
    }

    async init() {
        await this.loadAllGoods();
        this.renderCategories();
        this.applyFiltersAndRender();
        this.bindEvents();
        this.setupSearch();
    }

    async loadAllGoods() {
        try {
            this.isLoading = true;
            const loadingElement = document.getElementById('catalogGrid');
            if (loadingElement) {
                loadingElement.innerHTML = '<div class="loading">Загрузка товаров...</div>';
            }

            const response = await examAPI.getGoods(1, 100, '', '');
            console.log('API Response:', response);

            if (response && response.data) {
                this.allGoods = response.data;
                console.log('Загружено товаров:', this.allGoods.length);

                this.categories.clear();
                this.allGoods.forEach(good => {
                    if (good && good.main_category) {
                        this.categories.add(good.main_category);
                    }
                });
            } else {
                this.allGoods = [];
            }

            this.isLoading = false;
        } catch (error) {
            console.error('Ошибка загрузки товаров:', error);
            this.isLoading = false;

            const catalogGrid = document.getElementById('catalogGrid');
            if (catalogGrid) {
                catalogGrid.innerHTML = `
                    <div class="empty-catalog">
                        <p>😔 Ошибка загрузки товаров</p>
                        <p>${error.message}</p>
                        <button class="btn btn-primary" onclick="window.location.reload()">
                            Обновить страницу
                        </button>
                    </div>
                `;
            }
        }
    }

    applyFilters() {
        let filtered = [...this.allGoods];

        console.log('Всего товаров для фильтрации:', filtered.length);
        console.log('Текущие фильтры:', this.currentFilters);

        if (this.currentFilters.categories.length > 0) {
            filtered = filtered.filter(good =>
                good && good.main_category &&
                this.currentFilters.categories.includes(good.main_category)
            );
            console.log('После фильтрации по категориям:', filtered.length);
        }

        if (this.currentFilters.priceFrom !== null && this.currentFilters.priceFrom > 0) {
            filtered = filtered.filter(good => {
                const price = good.discount_price || good.actual_price || 0;
                return price >= this.currentFilters.priceFrom;
            });
            console.log('После фильтрации по минимальной цене:', filtered.length);
        }

        if (this.currentFilters.priceTo !== null && this.currentFilters.priceTo > 0) {
            filtered = filtered.filter(good => {
                const price = good.discount_price || good.actual_price || 0;
                return price <= this.currentFilters.priceTo;
            });
            console.log('После фильтрации по максимальной цене:', filtered.length);
        }

        if (this.currentFilters.discountOnly) {
            filtered = filtered.filter(good =>
                good.discount_price && good.discount_price < good.actual_price
            );
            console.log('После фильтрации по скидке:', filtered.length);
        }

        if (this.currentFilters.searchQuery) {
            const query = this.currentFilters.searchQuery.toLowerCase();
            filtered = filtered.filter(good =>
                good.name && good.name.toLowerCase().includes(query)
            );
            console.log('После поиска:', filtered.length);
        }

        // Сортировка
        filtered = this.applySorting(filtered);

        this.filteredGoods = filtered;
        this.totalGoods = filtered.length;
        this.totalPages = Math.ceil(this.totalGoods / this.perPage);

        console.log('Итоговое количество товаров:', this.totalGoods, 'Страниц:', this.totalPages);

        return filtered;
    }

    applySorting(goods) {
        const sortBy = this.currentFilters.sortBy || '';

        if (!sortBy) return goods;

        const sorted = [...goods];

        switch (sortBy) {
            case 'name_asc':
                sorted.sort((a, b) => (a?.name || '').localeCompare(b?.name || ''));
                break;
            case 'name_desc':
                sorted.sort((a, b) => (b?.name || '').localeCompare(a?.name || ''));
                break;
            case 'price_asc':
                sorted.sort((a, b) => {
                    const priceA = a?.discount_price || a?.actual_price || 0;
                    const priceB = b?.discount_price || b?.actual_price || 0;
                    return priceA - priceB;
                });
                break;
            case 'price_desc':
                sorted.sort((a, b) => {
                    const priceA = a?.discount_price || a?.actual_price || 0;
                    const priceB = b?.discount_price || b?.actual_price || 0;
                    return priceB - priceA;
                });
                break;
            case 'rating_desc':
                sorted.sort((a, b) => (b?.rating || 0) - (a?.rating || 0));
                break;
            case 'discount_desc':
                sorted.sort((a, b) => {
                    const discountA = this.calculateDiscountPercent(a);
                    const discountB = this.calculateDiscountPercent(b);
                    return discountB - discountA;
                });
                break;
        }

        return sorted;
    }

    calculateDiscountPercent(good) {
        if (good.discount_price && good.actual_price && good.actual_price > 0) {
            return ((good.actual_price - good.discount_price) / good.actual_price) * 100;
        }
        return 0;
    }

    async applyFiltersAndRender() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.currentPage = 1;

        this.applyFilters();

        if (this.totalGoods === 0) {
            this.currentGoods = [];
            this.renderGoods([]);
            this.renderPagination();
            this.renderLoadMoreButton();
            this.updateCatalogTitle();
            this.isLoading = false;
            return;
        }

        const pageGoods = this.getCurrentPageGoods();
        this.currentGoods = pageGoods;

        this.renderGoods(pageGoods);
        this.renderPagination();
        this.renderLoadMoreButton();
        this.updateCatalogTitle();

        this.isLoading = false;
    }
    getCurrentPageGoods() {
        const startIndex = (this.currentPage - 1) * this.perPage;
        const endIndex = Math.min(startIndex + this.perPage, this.filteredGoods.length);
        return this.filteredGoods.slice(startIndex, endIndex);
    }

    async loadMore() {
        if (this.isLoading) {
            console.log('Уже идет загрузка...');
            return;
        }

        console.log('Загрузка дополнительных товаров...');
        console.log('Текущая страница:', this.currentPage, 'Всего страниц:', this.totalPages);

        this.isLoading = true;

        const nextPage = this.currentPage + 1;

        if (nextPage > this.totalPages) {
            console.log('Нет больше страниц для загрузки');
            this.isLoading = false;
            this.renderLoadMoreButton(); 
            return;
        }

        const nextPageGoods = this.getCurrentPageGoods();
        console.log('Загружаем товары для страницы', nextPage, ':', nextPageGoods.length, 'товаров');

        this.currentGoods = [...this.currentGoods, ...nextPageGoods];

        this.currentPage = nextPage;

        this.renderGoods(this.currentGoods);
        this.renderPagination();
        this.renderLoadMoreButton();

        this.isLoading = false;

        if (typeof notifications !== 'undefined') {
            notifications.info(`Загружено еще ${nextPageGoods.length} товаров`);
        }
    }


    scrollToCatalog() {
        const catalogGrid = document.getElementById('catalogGrid');
        if (catalogGrid) {
            window.scrollTo({
                top: catalogGrid.offsetTop - 100,
                behavior: 'smooth'
            });
        }
    }

    renderGoods(goods) {
        const container = document.getElementById('catalogGrid');
        if (!container) return;

        if (!goods || goods.length === 0) {
            container.innerHTML = `
                <div class="empty-catalog">
                    <p>😔 Товары не найдены</p>
                    <p>Попробуйте изменить фильтры или сбросить их</p>
                    <button class="btn btn-primary" onclick="catalogManager.resetFilters()">
                        Сбросить фильтры
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = goods.map(good => this.createGoodCard(good)).join('');
    }

    createGoodCard(good) {
        if (!good) return '';

        const hasDiscount = good.discount_price && good.discount_price < good.actual_price;
        const price = hasDiscount ? good.discount_price : good.actual_price;
        const oldPrice = hasDiscount ? good.actual_price : null;
        const discountPercent = hasDiscount ?
            Math.round((1 - good.discount_price / good.actual_price) * 100) : 0;

        return `
            <div class="good-card" data-id="${good.id}">
                <div class="good-card__image">
                    <img src="${good.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}" 
                         alt="${good.name}" 
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'">
                    ${hasDiscount ? `
                        <div class="good-card__badge">🔥 -${discountPercent}%</div>
                    ` : ''}
                </div>
                <div class="good-card__content">
                    <h3 class="good-card__title" title="${good.name}">
                        ${good.name ? (good.name.length > 50 ? good.name.substring(0, 50) + '...' : good.name) : 'Без названия'}
                    </h3>
                    <div class="good-card__rating">
                        ${renderRating(good.rating || 0)}
                        <span class="rating-value">${(good.rating || 0).toFixed(1)}</span>
                    </div>
                    <div class="good-card__price">
                        ${hasDiscount && oldPrice ? `
                            <span class="old-price">${formatPrice(oldPrice)}</span>
                        ` : ''}
                        <span class="current-price">${formatPrice(price || 0)}</span>
                    </div>
                    <button class="add-to-cart-btn" 
                            onclick="catalogManager.addToCart(${good.id}, event)">
                        Добавить в корзину
                    </button>
                </div>
            </div>
        `;
    }

    renderPagination() {
        const container = document.getElementById('paginationContainer');
        if (!container) return;

        if (this.totalGoods <= this.perPage) {
            container.innerHTML = '';
            return;
        }

        let html = '<div class="pagination">';

       
        if (this.currentPage > 1) {
            html += `
                <button class="pagination-btn pagination-prev" onclick="catalogManager.goToPage(${this.currentPage - 1})">
                    ← Назад
                </button>
            `;
        }
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        if (startPage > 1) {
            html += `
                <button class="pagination-btn" onclick="catalogManager.goToPage(1)">1</button>
                ${startPage > 2 ? '<span class="pagination-dots">...</span>' : ''}
            `;
        }

        for (let i = startPage; i <= endPage; i++) {
            if (i === this.currentPage) {
                html += `<button class="pagination-btn pagination-active">${i}</button>`;
            } else {
                html += `<button class="pagination-btn" onclick="catalogManager.goToPage(${i})">${i}</button>`;
            }
        }

        if (endPage < this.totalPages) {
            html += `
                ${endPage < this.totalPages - 1 ? '<span class="pagination-dots">...</span>' : ''}
                <button class="pagination-btn" onclick="catalogManager.goToPage(${this.totalPages})">${this.totalPages}</button>
            `;
        }

        if (this.currentPage < this.totalPages) {
            html += `
                <button class="pagination-btn pagination-next" onclick="catalogManager.goToPage(${this.currentPage + 1})">
                    Вперед →
                </button>
            `;
        }

        html += `
            <div class="pagination-info">
                Страница ${this.currentPage} из ${this.totalPages} • 
                Показано ${Math.min(this.currentGoods.length, this.totalGoods)} из ${this.totalGoods} товаров
            </div>
        `;

        html += '</div>';
        container.innerHTML = html;
    }

    renderLoadMoreButton() {
        const container = document.getElementById('loadMoreContainer');
        if (!container) {
            console.error('Контейнер loadMoreContainer не найден!');
            return;
        }

        if (this.totalGoods === 0 || this.currentPage >= this.totalPages) {
            container.innerHTML = '';
            return;
        }

        const remaining = this.totalGoods - this.currentGoods.length;
        const nextPageCount = Math.min(this.perPage, remaining);

        console.log(this.isLoading, " - невозможность загрузить кнопку");

        container.innerHTML = `
        <button id="loadMoreBtn" class="load-more-btn" 
                ${!this.isLoading ? 'disabled' : ''}>
            ${!this.isLoading ? 'Загрузка...' : `Загрузить еще ${nextPageCount} товаров (осталось ${remaining})`}
        </button>
    `;

        this.bindLoadMoreButton();
    }

    bindLoadMoreButton() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.removeEventListener('click', this.handleLoadMoreClick);
            this.handleLoadMoreClick = () => this.loadMore();
            loadMoreBtn.addEventListener('click', this.handleLoadMoreClick);
        }
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage || this.isLoading) {
            return;
        }

        this.isLoading = true;

        this.currentPage = page;

        const pageGoods = this.getCurrentPageGoods();
        this.currentGoods = pageGoods;

        this.renderGoods(pageGoods);
        this.renderPagination();
        this.renderLoadMoreButton();

        this.scrollToCatalog();

        this.isLoading = false;
    }

    renderCategories() {
        const container = document.getElementById('categoryFilters');
        if (!container) return;

        let html = '';
        const sortedCategories = Array.from(this.categories).sort();

        sortedCategories.forEach(category => {
            if (category) {
                const isChecked = this.currentFilters.categories.includes(category);
                html += `
                    <label class="filter-checkbox">
                        <input type="checkbox" name="category" value="${category}" 
                               ${isChecked ? 'checked' : ''}>
                        <span>${category}</span>
                    </label>
                `;
            }
        });

        if (sortedCategories.length === 0) {
            html = '<p class="text-muted">Категории не найдены</p>';
        }

        container.innerHTML = html;
    }

    updateFilters() {
        const categoryCheckboxes = document.querySelectorAll('input[name="category"]:checked');
        this.currentFilters.categories = Array.from(categoryCheckboxes).map(cb => cb.value);

        const priceFrom = document.getElementById('priceFrom');
        const priceTo = document.getElementById('priceTo');
        this.currentFilters.priceFrom = priceFrom.value ? parseFloat(priceFrom.value) : null;
        this.currentFilters.priceTo = priceTo.value ? parseFloat(priceTo.value) : null;

        const discountOnly = document.getElementById('discountOnly');
        this.currentFilters.discountOnly = discountOnly ? discountOnly.checked : false;

        const sortSelect = document.getElementById('sortSelect');
        this.currentFilters.sortBy = sortSelect ? sortSelect.value : '';
    }

    bindEvents() {
        const filterForm = document.getElementById('filterForm');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.updateFilters();
                this.applyFiltersAndRender();
                notifications.success('Фильтры применены');
            });
        }

        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.currentFilters.sortBy = sortSelect.value;
                this.applyFiltersAndRender();
                const selectedText = sortSelect.options[sortSelect.selectedIndex].text;
                notifications.info(`Сортировка: ${selectedText}`);
            });
        }

        const discountOnly = document.getElementById('discountOnly');
        if (discountOnly) {
            discountOnly.addEventListener('change', () => {
                this.currentFilters.discountOnly = discountOnly.checked;
                this.applyFiltersAndRender();
                notifications.info(discountOnly.checked ?
                    'Показываем только товары со скидкой' :
                    'Показываем все товары');
            });
        }

        document.addEventListener('change', (e) => {
            if (e.target.name === 'category') {
                this.updateFilters();
                this.applyFiltersAndRender();
            }
        });

        document.addEventListener('click', (e) => {
         if (e.target && e.target.id === 'loadMoreBtn') {
                e.preventDefault();
                this.loadMore();
            }
        });
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const searchButton = document.querySelector('.btn-search');
        const searchSuggestions = document.getElementById('searchSuggestions');

        if (!searchInput || !searchButton || !searchSuggestions) return;

        searchButton.addEventListener('click', () => {
            this.performSearch(searchInput.value.trim());
            searchSuggestions.style.display = 'none';
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.performSearch(searchInput.value.trim());
                searchSuggestions.style.display = 'none';
            }
        });

        let searchTimeout;
        searchInput.addEventListener('input', async (e) => {
            clearTimeout(searchTimeout);

            const query = e.target.value.trim();
            if (query.length < 2) {
                searchSuggestions.style.display = 'none';
                return;
            }

            searchTimeout = setTimeout(async () => {
                try {
                    const suggestions = await examAPI.getAutocomplete(query);
                    if (suggestions && suggestions.length > 0) {
                        searchSuggestions.innerHTML = suggestions
                            .slice(0, 5)
                            .map(suggestion => `
                                <div class="suggestion-item" onclick="catalogManager.useSuggestion('${suggestion.replace(/'/g, "\\'")}')">
                                    🔍 ${suggestion}
                                </div>
                            `)
                            .join('');
                        searchSuggestions.style.display = 'block';
                    } else {
                        searchSuggestions.style.display = 'none';
                    }
                } catch (error) {
                    console.error('Ошибка автодополнения:', error);
                    searchSuggestions.style.display = 'none';
                }
            }, 300);
        });

        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !searchSuggestions.contains(e.target)) {
                searchSuggestions.style.display = 'none';
            }
        });
    }

    useSuggestion(suggestion) {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = suggestion;
            this.performSearch(suggestion);
        }
        document.getElementById('searchSuggestions').style.display = 'none';
    }

    performSearch(query) {
        this.currentFilters.searchQuery = query;
        this.applyFiltersAndRender();
        notifications.info(`Поиск: "${query}"`);
    }

    resetSearch() {
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.value = '';
        }
        this.currentFilters.searchQuery = '';
        this.applyFiltersAndRender();
        notifications.info('Поиск сброшен');
    }

    resetFilters() {
        this.currentFilters = {
            categories: [],
            priceFrom: null,
            priceTo: null,
            discountOnly: false,
            sortBy: '',
            searchQuery: this.currentFilters.searchQuery
        };

        document.querySelectorAll('input[name="category"]').forEach(cb => cb.checked = false);
        document.getElementById('priceFrom').value = '';
        document.getElementById('priceTo').value = '';

        const discountOnly = document.getElementById('discountOnly');
        if (discountOnly) discountOnly.checked = false;

        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) sortSelect.value = '';

        this.applyFiltersAndRender();
        notifications.info('Все фильтры сброшены');
    }

    addToCart(goodId, event) {
        const cart = getCart();
        const existingItem = cart.find(item => item && item.id === goodId);

        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ id: goodId, quantity: 1 });
        }

        saveCart(cart);
        updateCartBadge();
        notifications.success('🎉 Товар добавлен в корзину!');

        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✅ Добавлено!';
        button.disabled = true;

        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 2000);
    }

    updateCatalogTitle() {
        const catalogTitle = document.querySelector('.catalog__title');
        if (catalogTitle) {
            if (this.currentFilters.searchQuery) {
                catalogTitle.textContent = `Результаты поиска: "${this.currentFilters.searchQuery}" (${this.totalGoods} товаров)`;
            } else if (this.currentFilters.categories.length > 0) {
                const categoriesText = this.currentFilters.categories.length === 1 ?
                    this.currentFilters.categories[0] :
                    `${this.currentFilters.categories.length} категорий`;
                catalogTitle.textContent = `${categoriesText} (${this.totalGoods} товаров)`;
            } else {
                catalogTitle.textContent = `Все товары (${this.totalGoods} товаров)`;
            }
        }
    }
}

let catalogManager;
document.addEventListener('DOMContentLoaded', () => {
    catalogManager = new CatalogManager();
    window.catalogManager = catalogManager;
    updateCartBadge();
});
