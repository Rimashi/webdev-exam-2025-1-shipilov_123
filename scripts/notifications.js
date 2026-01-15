class NotificationSystem {
    constructor() {
        this.container = null;
        this.maxNotifications = 3; // Максимум 3 уведомления
        this.notificationsQueue = []; // Очередь уведомлений
        this.init();
    }

    init() {
        this.container = document.createElement('div');
        this.container.className = 'notifications-container';
        this.container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
            pointer-events: none;
        `;
        document.body.appendChild(this.container);
    }

    show(options) {
        const {
            title = 'Уведомление',
            message,
            type = 'info',
            duration = 5000,
            actions = []
        } = options;

        const notification = this.createNotification({
            title,
            message,
            type,
            actions
        });

        this.notificationsQueue.push(notification);

        if (this.notificationsQueue.length > this.maxNotifications) {
            const oldestNotification = this.notificationsQueue.shift();
            this.hide(oldestNotification);
        }

        this.container.appendChild(notification);

        if (duration > 0) {
            setTimeout(() => {
                this.hide(notification);
            }, duration);
        }

        return notification;
    }

    createNotification({ title, message, type, actions }) {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.style.cssText = `
            background: ${this.getBackgroundColor(type)};
            border-left: 4px solid ${this.getBorderColor(type)};
            border-radius: 6px;
            padding: 15px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            animation: slideIn 0.3s ease;
            pointer-events: auto;
            position: relative;
            margin-bottom: 5px;
        `;

        notification.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                <strong style="color: ${this.getTitleColor(type)}; font-size: 14px;">${title}</strong>
                <button class="notification-close" style="background: none; border: none; font-size: 18px; cursor: pointer; line-height: 1; color: #666;">×</button>
            </div>
            <div style="color: #333; font-size: 13px; line-height: 1.4;">${message}</div>
        `;

        notification.querySelector('.notification-close').addEventListener('click', () => {
            this.hide(notification);
        });

        return notification;
    }

    hide(notification) {
        const index = this.notificationsQueue.indexOf(notification);
        if (index > -1) {
            this.notificationsQueue.splice(index, 1);
        }

        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    getBackgroundColor(type) {
        switch (type) {
            case 'success': return 'rgba(52, 199, 89, 0.1)';
            case 'error': return 'rgba(255, 59, 48, 0.1)';
            case 'warning': return 'rgba(255, 149, 0, 0.1)';
            case 'info': return 'rgba(0, 122, 255, 0.1)';
            default: return 'white';
        }
    }

    getBorderColor(type) {
        switch (type) {
            case 'success': return '#34c759';
            case 'error': return '#ff3b30';
            case 'warning': return '#ff9500';
            case 'info': return '#007aff';
            default: return '#666';
        }
    }

    getTitleColor(type) {
        switch (type) {
            case 'success': return '#34c759';
            case 'error': return '#ff3b30';
            case 'warning': return '#ff9500';
            case 'info': return '#007aff';
            default: return '#333';
        }
    }

    success(message, title = 'Успешно!') {
        return this.show({
            title,
            message,
            type: 'success',
            duration: 3000
        });
    }

    error(message, title = 'Ошибка') {
        return this.show({
            title,
            message,
            type: 'error',
            duration: 5000
        });
    }

    warning(message, title = 'Внимание') {
        return this.show({
            title,
            message,
            type: 'warning',
            duration: 4000
        });
    }

    info(message, title = 'Информация') {
        return this.show({
            title,
            message,
            type: 'info',
            duration: 4000
        });
    }
}

window.notifications = new NotificationSystem();

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);