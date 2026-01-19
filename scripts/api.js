class ExamAPI {
    constructor() {
        this.baseUrl = API_BASE_URL;
        this.key = API_KEY;
    }

    async getGoods(page = 1, per_page = 10, query = '', sort_order = '') {
        try {
            const url = new URL(`${this.baseUrl}/goods`);
            url.searchParams.append('api_key', this.key);
            url.searchParams.append('page', page);
            url.searchParams.append('per_page', per_page);
            if (query) url.searchParams.append('query', query);
            if (sort_order) url.searchParams.append('sort_order', sort_order);

            console.log('Fetching goods from:', url.toString());

            const response = await fetch(url);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('API Response (getGoods):', data);

            let goodsArray = [];
            let paginationInfo = {
                page: page,
                per_page: per_page,
                total: 0,
                current_page: 1,
                total_count: 0
            };

            if (data && data.goods && Array.isArray(data.goods) && data._pagination) {
                goodsArray = data.goods;
                paginationInfo = {
                    page: data._pagination.current_page,
                    per_page: data._pagination.per_page,
                    total: data._pagination.total_count,
                    current_page: data._pagination.current_page,
                    total_count: data._pagination.total_count
                };
            } else if (Array.isArray(data)) {
                goodsArray = data;
                paginationInfo.total = data.length;
            } else {
                console.warn('Unexpected API response format:', data);
                goodsArray = [];
            }

            console.log(`Loaded ${goodsArray.length} goods, page: ${paginationInfo.page}, total: ${paginationInfo.total}`);

            return {
                data: goodsArray,
                pagination: paginationInfo,
                total: paginationInfo.total
            };
        } catch (error) {
            console.error('API Error (getGoods):', error);
            throw error;
        }
    }

    async getGood(id) {
        if (!id || id === 'undefined') {
            console.error('Invalid product ID:', id);
            return null;
        }

        try {
            const response = await fetch(
                `${this.baseUrl}/goods/${id}?api_key=${this.key}`
            );
            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Product with id ${id} not found`);
                    return null;
                }
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Error (getGood):', error);
            return null;
        }
    }

    async getAutocomplete(query) {
        try {
            const response = await fetch(
                `${this.baseUrl}/autocomplete?api_key=${this.key}&query=${encodeURIComponent(query)}`
            );
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Error (getAutocomplete):', error);
            return [];
        }
    }

    async getOrders() {
        try {
            const response = await fetch(
                `${this.baseUrl}/orders?api_key=${this.key}`
            );
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Error (getOrders):', error);
            throw error;
        }
    }

    async getOrder(id) {
        try {
            const response = await fetch(
                `${this.baseUrl}/orders/${id}?api_key=${this.key}`
            );
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('API Error (getOrder):', error);
            throw error;
        }
    }

    async createOrder(orderData) {
        try {
            console.log('Создание заказа:', orderData);

            const requiredFields = ['full_name', 'email', 'phone', 'delivery_address', 'delivery_date', 'delivery_interval', 'good_ids'];
            const missingFields = requiredFields.filter(field => !orderData[field]);

            if (missingFields.length > 0) {
                throw new Error(`Отсутствуют обязательные поля: ${missingFields.join(', ')}`);
            }

            const response = await fetch(
                `${this.baseUrl}/orders?api_key=${this.key}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(orderData)
                }
            );

            const responseText = await response.text();
            console.log('Ответ сервера:', responseText);

            if (!response.ok) {
                let error;
                try {
                    error = JSON.parse(responseText);
                } catch {
                    error = { error: responseText || 'Неизвестная ошибка сервера' };
                }
                throw new Error(error.error || `HTTP ошибка! статус: ${response.status}`);
            }

            return JSON.parse(responseText);
        } catch (error) {
            console.error('API Error (createOrder):', error);
            throw error;
        }
    }

    async updateOrder(id, orderData) {
        try {
            console.log('Обновление заказа:', id, orderData);

            const response = await fetch(
                `${this.baseUrl}/orders/${id}?api_key=${this.key}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(orderData)
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error (updateOrder):', error);
            throw error;
        }
    }

    async deleteOrder(id) {
        try {
            const response = await fetch(
                `${this.baseUrl}/orders/${id}?api_key=${this.key}`,
                {
                    method: 'DELETE'
                }
            );

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || `HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error (deleteOrder):', error);
            throw error;
        }
    }
}

window.examAPI = new ExamAPI();