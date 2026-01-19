const API_KEY = "42fea230-497a-44ef-9980-21238395e175";
const API_BASE_URL = 'https://edu.std-900.ist.mospolytech.ru/exam-2024-1/api';
// const API_BASE_URL = 'http://localhost:8000/api';

let currentOrderId = null;

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
}

function getCart() {
    try {
        const cart = localStorage.getItem('cart');
        if (!cart) return [];

        const parsed = JSON.parse(cart);
        return Array.isArray(parsed)
            ? parsed.filter(item => item && typeof item.id === 'number' && item.id > 0)
            : [];
    } catch (error) {
        console.error('Error reading cart:', error);
        return [];
    }
}

function saveCart(cart) {
    try {
        const validCart = Array.isArray(cart)
            ? cart.filter(item => item && typeof item.id === 'number' && item.id > 0)
            : [];
        localStorage.setItem('cart', JSON.stringify(validCart));
        window.dispatchEvent(new CustomEvent('cart-updated'));
    } catch (error) {
        console.error('Error saving cart:', error);
    }
}

function updateCartBadge() {
    const cart = getCart();
    const totalQuantity = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.textContent = totalQuantity;
        badge.style.display = totalQuantity > 0 ? 'flex' : 'none';
    }
}

function renderRating(rating) {
    if (!rating) return '☆☆☆☆☆';

    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    let stars = '';

    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += '★';
        } else if (i === fullStars + 1 && hasHalfStar) {
            stars += '½';
        } else {
            stars += '☆';
        }
    }
    return stars;
}

window.getCart = getCart;
window.saveCart = saveCart;
window.updateCartBadge = updateCartBadge;
window.formatPrice = formatPrice;
window.renderRating = renderRating;