/**
 * Toast Notification System
 * Accessible, animated toast notifications with multiple types and positions
 */

export class Toast {
    constructor(options = {}) {
        this.options = {
            position: 'top-right', // top-left, top-right, bottom-left, bottom-right, top-center, bottom-center
            maxToasts: 5,
            defaultDuration: 5000,
            animationDuration: 300,
            enableSounds: false,
            enableReducedMotion: false,
            autoStackManagement: true,
            pauseOnHover: true,
            dismissOnClick: true,
            ...options
        };
        
        // Toast management
        this.toasts = new Map();
        this.container = null;
        this.nextId = 1;
        this.isPaused = false;
        
        // Toast types configuration
        this.types = {
            success: {
                icon: '✓',
                className: 'toast-success',
                ariaRole: 'status',
                defaultDuration: 4000
            },
            error: {
                icon: '✕',
                className: 'toast-error',
                ariaRole: 'alert',
                defaultDuration: 8000
            },
            warning: {
                icon: '⚠',
                className: 'toast-warning',
                ariaRole: 'alert',
                defaultDuration: 6000
            },
            info: {
                icon: 'ⓘ',
                className: 'toast-info',
                ariaRole: 'status',
                defaultDuration: 5000
            },
            loading: {
                icon: '⟳',
                className: 'toast-loading',
                ariaRole: 'status',
                defaultDuration: 0 // Manual dismiss only
            }
        };
        
        // Animation timings
        this.animations = {
            slideIn: 'toast-slide-in',
            slideOut: 'toast-slide-out',
            fadeIn: 'toast-fade-in',
            fadeOut: 'toast-fade-out',
            scaleIn: 'toast-scale-in',
            scaleOut: 'toast-scale-out'
        };
        
        // Event handlers
        this.handleToastClick = this.handleToastClick.bind(this);
        this.handleToastKeydown = this.handleToastKeydown.bind(this);
        this.handleToastMouseEnter = this.handleToastMouseEnter.bind(this);
        this.handleToastMouseLeave = this.handleToastMouseLeave.bind(this);
        
        this.init();
    }

    /**
     * Initialize the toast system
     */
    init() {
        this.createContainer();
        this.setupGlobalEventListeners();
        this.injectStyles();
        
        console.log('🍞 Toast notification system initialized');
    }

    /**
     * Create toast container
     */
    createContainer() {
        // Remove existing container if it exists
        const existing = document.querySelector('.toast-container');
        if (existing) {
            existing.remove();
        }
        
        this.container = document.createElement('div');
        this.container.className = `toast-container toast-container-${this.options.position}`;
        this.container.setAttribute('aria-live', 'polite');
        this.container.setAttribute('aria-label', 'Notifications');
        this.container.setAttribute('role', 'region');
        
        // Position the container
        this.positionContainer();
        
        document.body.appendChild(this.container);
    }

    /**
     * Position container based on options
     */
    positionContainer() {
        const positions = {
            'top-left': { top: '20px', left: '20px' },
            'top-right': { top: '20px', right: '20px' },
            'top-center': { top: '20px', left: '50%', transform: 'translateX(-50%)' },
            'bottom-left': { bottom: '20px', left: '20px' },
            'bottom-right': { bottom: '20px', right: '20px' },
            'bottom-center': { bottom: '20px', left: '50%', transform: 'translateX(-50%)' }
        };
        
        const position = positions[this.options.position] || positions['top-right'];
        
        Object.assign(this.container.style, {
            position: 'fixed',
            zIndex: '10000',
            pointerEvents: 'none',
            maxWidth: '420px',
            width: '100%',
            ...position
        });
        
        // Responsive adjustments
        if (window.innerWidth <= 640) {
            Object.assign(this.container.style, {
                left: '10px',
                right: '10px',
                maxWidth: 'none',
                transform: 'none'
            });
        }
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.positionContainer();
        });
        
        // Handle reduced motion preference changes
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQuery.addEventListener('change', (e) => {
            this.options.enableReducedMotion = e.matches;
        });
        this.options.enableReducedMotion = mediaQuery.matches;
        
        // Handle visibility change (pause toasts when page is hidden)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.pauseAll();
            } else {
                this.resumeAll();
            }
        });
    }

    /**
     * Show a toast notification
     */
    show(message, type = 'info', options = {}) {
        const toastConfig = this.types[type] || this.types.info;
        const toastId = this.nextId++;
        
        const toastOptions = {
            id: toastId,
            message,
            type,
            duration: options.duration !== undefined ? options.duration : toastConfig.defaultDuration,
            actions: options.actions || [],
            dismissible: options.dismissible !== false,
            persistent: options.persistent || toastConfig.defaultDuration === 0,
            priority: options.priority || 'normal', // low, normal, high
            ...options
        };
        
        // Check if we need to remove old toasts
        this.manageToastLimit();
        
        // Create toast element
        const toastElement = this.createToastElement(toastOptions, toastConfig);
        
        // Store toast data
        this.toasts.set(toastId, {
            element: toastElement,
            options: toastOptions,
            config: toastConfig,
            timer: null,
            isPaused: false
        });
        
        // Add to DOM
        this.addToastToContainer(toastElement, toastOptions);
        
        // Start auto-dismiss timer
        if (toastOptions.duration > 0 && !toastOptions.persistent) {
            this.startTimer(toastId, toastOptions.duration);
        }
        
        // Announce to screen readers
        this.announceToast(toastOptions, toastConfig);
        
        // Track toast
        this.trackToast('show', toastOptions);
        
        return toastId;
    }

    /**
     * Create toast element
     */
    createToastElement(options, config) {
        const toast = document.createElement('div');
        toast.className = `toast ${config.className}`;
        toast.setAttribute('role', config.ariaRole);
        toast.setAttribute('data-toast-id', options.id);
        toast.style.pointerEvents = 'auto';
        
        // Create toast content
        const content = this.createToastContent(options, config);
        toast.appendChild(content);
        
        // Add event listeners
        this.setupToastEventListeners(toast, options);
        
        return toast;
    }

    /**
     * Create toast content
     */
    createToastContent(options, config) {
        const content = document.createElement('div');
        content.className = 'toast-content';
        
        // Icon
        const icon = document.createElement('div');
        icon.className = 'toast-icon';
        icon.textContent = config.icon;
        if (options.type === 'loading') {
            icon.classList.add('toast-icon-spinning');
        }
        
        // Message container
        const messageContainer = document.createElement('div');
        messageContainer.className = 'toast-message-container';
        
        // Title (if provided)
        if (options.title) {
            const title = document.createElement('div');
            title.className = 'toast-title';
            title.textContent = options.title;
            messageContainer.appendChild(title);
        }
        
        // Message
        const message = document.createElement('div');
        message.className = 'toast-message';
        if (typeof options.message === 'string') {
            message.textContent = options.message;
        } else {
            message.appendChild(options.message);
        }
        messageContainer.appendChild(message);
        
        // Actions (if provided)
        if (options.actions && options.actions.length > 0) {
            const actions = this.createToastActions(options.actions, options.id);
            messageContainer.appendChild(actions);
        }
        
        // Progress bar (for timed toasts)
        let progressBar = null;
        if (options.duration > 0 && !options.persistent) {
            progressBar = document.createElement('div');
            progressBar.className = 'toast-progress';
            progressBar.innerHTML = '<div class="toast-progress-bar"></div>';
        }
        
        // Close button (if dismissible)
        let closeButton = null;
        if (options.dismissible) {
            closeButton = document.createElement('button');
            closeButton.className = 'toast-close';
            closeButton.setAttribute('aria-label', 'Close notification');
            closeButton.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            `;
            
            closeButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dismiss(options.id);
            });
        }
        
        // Assemble content
        content.appendChild(icon);
        content.appendChild(messageContainer);
        if (closeButton) content.appendChild(closeButton);
        if (progressBar) content.appendChild(progressBar);
        
        return content;
    }

    /**
     * Create toast actions
     */
    createToastActions(actions, toastId) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'toast-actions';
        
        actions.forEach(action => {
            const button = document.createElement('button');
            button.className = `toast-action ${action.type || 'default'}`;
            button.textContent = action.text;
            
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                
                if (action.handler) {
                    action.handler(toastId);
                }
                
                if (action.dismissOnClick !== false) {
                    this.dismiss(toastId);
                }
            });
            
            actionsContainer.appendChild(button);
        });
        
        return actionsContainer;
    }

    /**
     * Setup toast event listeners
     */
    setupToastEventListeners(toast, options) {
        // Click to dismiss (if enabled)
        if (this.options.dismissOnClick && options.dismissible) {
            toast.addEventListener('click', this.handleToastClick);
        }
        
        // Keyboard navigation
        toast.addEventListener('keydown', this.handleToastKeydown);
        
        // Pause on hover
        if (this.options.pauseOnHover && options.duration > 0) {
            toast.addEventListener('mouseenter', this.handleToastMouseEnter);
            toast.addEventListener('mouseleave', this.handleToastMouseLeave);
        }
        
        // Make focusable if it has interactive elements
        if (options.actions?.length > 0 || options.dismissible) {
            toast.setAttribute('tabindex', '0');
        }
    }

    /**
     * Add toast to container with animation
     */
    addToastToContainer(toastElement, options) {
        // Set initial state for animation
        toastElement.style.opacity = '0';
        toastElement.style.transform = this.getInitialTransform();
        
        // Add to container
        if (this.options.position.includes('bottom')) {
            this.container.appendChild(toastElement);
        } else {
            this.container.insertBefore(toastElement, this.container.firstChild);
        }
        
        // Trigger entrance animation
        requestAnimationFrame(() => {
            this.animateToastIn(toastElement);
        });
    }

    /**
     * Get initial transform for animation
     */
    getInitialTransform() {
        if (this.options.enableReducedMotion) {
            return 'none';
        }
        
        const position = this.options.position;
        
        if (position.includes('right')) {
            return 'translateX(100%)';
        } else if (position.includes('left')) {
            return 'translateX(-100%)';
        } else if (position.includes('top')) {
            return 'translateY(-100%)';
        } else {
            return 'translateY(100%)';
        }
    }

    /**
     * Animate toast entrance
     */
    animateToastIn(toastElement) {
        if (this.options.enableReducedMotion) {
            toastElement.style.opacity = '1';
            toastElement.style.transform = 'none';
            return;
        }
        
        toastElement.style.transition = `all ${this.options.animationDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
        toastElement.style.opacity = '1';
        toastElement.style.transform = 'translateX(0) translateY(0)';
        
        // Add entrance animation class
        toastElement.classList.add(this.animations.slideIn);
        
        setTimeout(() => {
            toastElement.classList.remove(this.animations.slideIn);
        }, this.options.animationDuration);
    }

    /**
     * Animate toast exit
     */
    animateToastOut(toastElement, callback) {
        if (this.options.enableReducedMotion) {
            toastElement.style.opacity = '0';
            setTimeout(callback, 50);
            return;
        }
        
        toastElement.classList.add(this.animations.slideOut);
        toastElement.style.transform = this.getExitTransform();
        toastElement.style.opacity = '0';
        
        setTimeout(callback, this.options.animationDuration);
    }

    /**
     * Get exit transform for animation
     */
    getExitTransform() {
        const position = this.options.position;
        
        if (position.includes('right')) {
            return 'translateX(100%)';
        } else if (position.includes('left')) {
            return 'translateX(-100%)';
        } else {
            return 'translateY(-20px)';
        }
    }

    /**
     * Start auto-dismiss timer
     */
    startTimer(toastId, duration) {
        const toastData = this.toasts.get(toastId);
        if (!toastData) return;
        
        // Clear existing timer
        if (toastData.timer) {
            clearTimeout(toastData.timer);
        }
        
        // Start progress animation
        this.startProgressAnimation(toastData.element, duration);
        
        // Set dismiss timer
        toastData.timer = setTimeout(() => {
            this.dismiss(toastId);
        }, duration);
    }

    /**
     * Start progress bar animation
     */
    startProgressAnimation(toastElement, duration) {
        const progressBar = toastElement.querySelector('.toast-progress-bar');
        if (progressBar) {
            progressBar.style.transition = `width ${duration}ms linear`;
            progressBar.style.width = '0%';
        }
    }

    /**
     * Pause toast timer
     */
    pauseTimer(toastId) {
        const toastData = this.toasts.get(toastId);
        if (!toastData || toastData.isPaused) return;
        
        if (toastData.timer) {
            clearTimeout(toastData.timer);
            toastData.timer = null;
        }
        
        toastData.isPaused = true;
        
        // Pause progress animation
        const progressBar = toastData.element.querySelector('.toast-progress-bar');
        if (progressBar) {
            const currentWidth = progressBar.getBoundingClientRect().width;
            const totalWidth = progressBar.parentElement.getBoundingClientRect().width;
            const percentage = (currentWidth / totalWidth) * 100;
            
            progressBar.style.transition = 'none';
            progressBar.style.width = `${percentage}%`;
        }
    }

    /**
     * Resume toast timer
     */
    resumeTimer(toastId, remainingDuration) {
        const toastData = this.toasts.get(toastId);
        if (!toastData || !toastData.isPaused) return;
        
        toastData.isPaused = false;
        
        if (remainingDuration > 0) {
            this.startTimer(toastId, remainingDuration);
        }
    }

    /**
     * Dismiss a specific toast
     */
    dismiss(toastId) {
        const toastData = this.toasts.get(toastId);
        if (!toastData) return;
        
        // Clear timer
        if (toastData.timer) {
            clearTimeout(toastData.timer);
        }
        
        // Animate out and remove
        this.animateToastOut(toastData.element, () => {
            if (toastData.element.parentNode) {
                toastData.element.parentNode.removeChild(toastData.element);
            }
            this.toasts.delete(toastId);
        });
        
        // Track dismissal
        this.trackToast('dismiss', toastData.options);
    }

    /**
     * Dismiss all toasts
     */
    dismissAll() {
        const toastIds = Array.from(this.toasts.keys());
        toastIds.forEach(id => this.dismiss(id));
    }

    /**
     * Update an existing toast
     */
    update(toastId, updates) {
        const toastData = this.toasts.get(toastId);
        if (!toastData) return false;
        
        // Update message
        if (updates.message) {
            const messageElement = toastData.element.querySelector('.toast-message');
            if (messageElement) {
                if (typeof updates.message === 'string') {
                    messageElement.textContent = updates.message;
                } else {
                    messageElement.innerHTML = '';
                    messageElement.appendChild(updates.message);
                }
            }
        }
        
        // Update type/class
        if (updates.type && this.types[updates.type]) {
            const newConfig = this.types[updates.type];
            toastData.element.className = `toast ${newConfig.className}`;
            
            // Update icon
            const iconElement = toastData.element.querySelector('.toast-icon');
            if (iconElement) {
                iconElement.textContent = newConfig.icon;
            }
        }
        
        // Update timer
        if (updates.duration !== undefined) {
            this.pauseTimer(toastId);
            if (updates.duration > 0) {
                this.startTimer(toastId, updates.duration);
            }
        }
        
        return true;
    }

    /**
     * Manage toast limit
     */
    manageToastLimit() {
        if (this.toasts.size >= this.options.maxToasts) {
            // Remove oldest toast
            const oldestId = this.toasts.keys().next().value;
            this.dismiss(oldestId);
        }
    }

    /**
     * Event handlers
     */
    handleToastClick(event) {
        const toast = event.currentTarget;
        const toastId = parseInt(toast.getAttribute('data-toast-id'));
        this.dismiss(toastId);
    }

    handleToastKeydown(event) {
        if (event.key === 'Escape') {
            const toast = event.currentTarget;
            const toastId = parseInt(toast.getAttribute('data-toast-id'));
            this.dismiss(toastId);
        }
    }

    handleToastMouseEnter(event) {
        const toast = event.currentTarget;
        const toastId = parseInt(toast.getAttribute('data-toast-id'));
        this.pauseTimer(toastId);
    }

    handleToastMouseLeave(event) {
        const toast = event.currentTarget;
        const toastId = parseInt(toast.getAttribute('data-toast-id'));
        const toastData = this.toasts.get(toastId);
        
        if (toastData && toastData.options.duration > 0) {
            // Calculate remaining time (simplified)
            const remainingTime = toastData.options.duration * 0.5; // Approximate
            this.resumeTimer(toastId, remainingTime);
        }
    }

    /**
     * Pause all toasts
     */
    pauseAll() {
        this.isPaused = true;
        this.toasts.forEach((toastData, toastId) => {
            this.pauseTimer(toastId);
        });
    }

    /**
     * Resume all toasts
     */
    resumeAll() {
        this.isPaused = false;
        this.toasts.forEach((toastData, toastId) => {
            if (toastData.options.duration > 0) {
                this.resumeTimer(toastId, toastData.options.duration * 0.5);
            }
        });
    }

    /**
     * Announce toast to screen readers
     */
    announceToast(options, config) {
        // Create temporary element for screen reader announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        
        const message = `${options.title ? options.title + ': ' : ''}${options.message}`;
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * Track toast events
     */
    trackToast(action, options) {
        if (window.NCS?.performance) {
            window.NCS.performance.trackEvent(`toast_${action}`, {
                type: options.type,
                duration: options.duration,
                position: this.options.position,
                hasActions: options.actions?.length > 0
            });
        }
    }

    /**
     * Convenience methods for different toast types
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    error(message, options = {}) {
        return this.show(message, 'error', options);
    }

    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    loading(message, options = {}) {
        return this.show(message, 'loading', { ...options, persistent: true });
    }

    /**
     * Inject CSS styles
     */
    injectStyles() {
        if (document.querySelector('#toast-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            .toast-container {
                display: flex;
                flex-direction: column;
                gap: 12px;
                max-height: 100vh;
                overflow: hidden;
            }
            
            .toast {
                background: var(--color-surface-elevated);
                border: 1px solid var(--color-border);
                border-radius: var(--radius-xl);
                box-shadow: var(--shadow-xl);
                min-width: 300px;
                max-width: 420px;
                position: relative;
                overflow: hidden;
            }
            
            .toast-content {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 16px;
            }
            
            .toast-icon {
                width: 20px;
                height: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 16px;
                font-weight: bold;
                flex-shrink: 0;
                margin-top: 2px;
            }
            
            .toast-icon-spinning {
                animation: toast-spin 1s linear infinite;
            }
            
            .toast-message-container {
                flex: 1;
                min-width: 0;
            }
            
            .toast-title {
                font-weight: 600;
                margin-bottom: 4px;
                color: var(--color-text);
            }
            
            .toast-message {
                color: var(--color-text-secondary);
                line-height: 1.5;
            }
            
            .toast-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }
            
            .toast-action {
                padding: 4px 12px;
                border: 1px solid var(--color-border);
                border-radius: var(--radius-md);
                background: transparent;
                color: var(--color-primary);
                font-size: 14px;
                cursor: pointer;
                transition: all 150ms ease;
            }
            
            .toast-action:hover {
                background: var(--color-primary);
                color: var(--color-white);
            }
            
            .toast-close {
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                color: var(--color-text-muted);
                cursor: pointer;
                border-radius: var(--radius-md);
                transition: all 150ms ease;
                flex-shrink: 0;
            }
            
            .toast-close:hover {
                background: var(--color-surface);
                color: var(--color-text);
            }
            
            .toast-close svg {
                width: 16px;
                height: 16px;
            }
            
            .toast-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 3px;
                background: rgba(0, 0, 0, 0.1);
            }
            
            .toast-progress-bar {
                height: 100%;
                width: 100%;
                background: currentColor;
                opacity: 0.8;
            }
            
            /* Toast Types */
            .toast-success {
                border-left: 4px solid var(--color-success);
            }
            
            .toast-success .toast-icon {
                color: var(--color-success);
            }
            
            .toast-error {
                border-left: 4px solid var(--color-error);
            }
            
            .toast-error .toast-icon {
                color: var(--color-error);
            }
            
            .toast-warning {
                border-left: 4px solid var(--color-warning);
            }
            
            .toast-warning .toast-icon {
                color: var(--color-warning);
            }
            
            .toast-info {
                border-left: 4px solid var(--color-info);
            }
            
            .toast-info .toast-icon {
                color: var(--color-info);
            }
            
            .toast-loading .toast-icon {
                color: var(--color-primary);
            }
            
            /* Animations */
            @keyframes toast-spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            
            .toast-slide-in {
                animation: toast-slide-in 300ms ease-out;
            }
            
            .toast-slide-out {
                animation: toast-slide-out 300ms ease-in;
            }
            
            @keyframes toast-slide-in {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes toast-slide-out {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
            
            /* Responsive */
            @media (max-width: 640px) {
                .toast {
                    min-width: auto;
                    margin: 0 10px;
                }
                
                .toast-content {
                    padding: 12px;
                }
            }
            
            /* Reduced Motion */
            @media (prefers-reduced-motion: reduce) {
                .toast {
                    transition: none;
                }
                
                .toast-icon-spinning {
                    animation: none;
                }
                
                .toast-slide-in,
                .toast-slide-out {
                    animation: none;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Get toast statistics
     */
    getStats() {
        return {
            activeToasts: this.toasts.size,
            maxToasts: this.options.maxToasts,
            isPaused: this.isPaused,
            position: this.options.position
        };
    }

    /**
     * Destroy toast system
     */
    destroy() {
        // Dismiss all toasts
        this.dismissAll();
        
        // Remove container
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        
        // Remove styles
        const styles = document.querySelector('#toast-styles');
        if (styles) {
            styles.remove();
        }
        
        console.log('🗑️ Toast system destroyed');
    }
}

// Export utility functions
export const toast = {
    show: (message, type, options) => {
        if (!window.NCS_TOAST) {
            window.NCS_TOAST = new Toast();
        }
        return window.NCS_TOAST.show(message, type, options);
    },
    
    success: (message, options) => {
        if (!window.NCS_TOAST) {
            window.NCS_TOAST = new Toast();
        }
        return window.NCS_TOAST.success(message, options);
    },
    
    error: (message, options) => {
        if (!window.NCS_TOAST) {
            window.NCS_TOAST = new Toast();
        }
        return window.NCS_TOAST.error(message, options);
    },
    
    warning: (message, options) => {
        if (!window.NCS_TOAST) {
            window.NCS_TOAST = new Toast();
        }
        return window.NCS_TOAST.warning(message, options);
    },
    
    info: (message, options) => {
        if (!window.NCS_TOAST) {
            window.NCS_TOAST = new Toast();
        }
        return window.NCS_TOAST.info(message, options);
    },
    
    loading: (message, options) => {
        if (!window.NCS_TOAST) {
            window.NCS_TOAST = new Toast();
        }
        return window.NCS_TOAST.loading(message, options);
    },
    
    dismiss: (id) => {
        if (window.NCS_TOAST) {
            window.NCS_TOAST.dismiss(id);
        }
    },
    
    dismissAll: () => {
        if (window.NCS_TOAST) {
            window.NCS_TOAST.dismissAll();
        }
    }
};

export default Toast;