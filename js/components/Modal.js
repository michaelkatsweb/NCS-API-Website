/**
 * FILE: js/components/Modal.js
 * Modal Component - Advanced modal dialog system
 * NCS-API Website
 * 
 * Features:
 * - Multiple modal types (info, warning, confirmation, custom)
 * - Keyboard navigation and focus management
 * - Animation and transition system
 * - Event handling and callbacks
 * - Accessibility compliance
 * - Mobile-responsive behavior
 * - Stacking and layering support
 * - Form integration
 * - Progress and loading states
 */

import { CONFIG } from '../config/constants.js';

export class Modal {
    constructor(options = {}) {
        // Configuration
        this.config = {
            size: 'medium', // small, medium, large, extra-large, fullscreen
            type: 'custom', // info, warning, confirmation, custom
            closable: true,
            closeOnOverlay: true,
            closeOnEscape: true,
            showCloseButton: true,
            animation: true,
            keyboard: true,
            backdrop: true,
            focus: true,
            destroyOnClose: false,
            zIndex: 1000,
            ...options
        };
        
        // State management
        this.state = {
            isOpen: false,
            isLoading: false,
            isClosing: false,
            focusedElement: null,
            previousFocus: null
        };
        
        // DOM elements
        this.elements = {
            overlay: null,
            modal: null,
            header: null,
            body: null,
            footer: null,
            closeButton: null
        };
        
        // Event callbacks
        this.callbacks = {
            onShow: null,
            onShown: null,
            onHide: null,
            onHidden: null,
            onConfirm: null,
            onCancel: null,
            onKeydown: null
        };
        
        // Focus management
        this.focusableElements = [];
        this.firstFocusable = null;
        this.lastFocusable = null;
        
        // Static instances tracking
        if (!Modal.instances) {
            Modal.instances = [];
            Modal.zIndexCounter = 1000;
        }
        
        this.init();
    }

    /**
     * Initialize the modal
     */
    init() {
        try {
            console.log('🪟 Initializing Modal...');
            
            this.createDOM();
            this.bindEvents();
            
            // Add to instances
            Modal.instances.push(this);
            
            console.log('✅ Modal initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize Modal:', error);
            this.handleError(error);
        }
    }

    /**
     * Create modal DOM structure
     */
    createDOM() {
        // Create overlay
        this.elements.overlay = document.createElement('div');
        this.elements.overlay.className = 'modal-overlay';
        this.elements.overlay.style.zIndex = this.getNextZIndex();
        
        if (!this.config.backdrop) {
            this.elements.overlay.style.background = 'transparent';
            this.elements.overlay.style.backdropFilter = 'none';
        }
        
        // Create modal container
        this.elements.modal = document.createElement('div');
        this.elements.modal.className = `modal ${this.config.size}`;
        this.elements.modal.setAttribute('role', 'dialog');
        this.elements.modal.setAttribute('aria-modal', 'true');
        
        if (this.config.type !== 'custom') {
            this.elements.modal.setAttribute('aria-labelledby', 'modal-title');
        }
        
        // Create header
        if (this.config.showCloseButton || this.config.type !== 'custom') {
            this.elements.header = document.createElement('div');
            this.elements.header.className = 'modal-header';
            this.elements.modal.appendChild(this.elements.header);
        }
        
        // Create body
        this.elements.body = document.createElement('div');
        this.elements.body.className = 'modal-body';
        this.elements.modal.appendChild(this.elements.body);
        
        // Create footer (optional)
        if (this.config.type !== 'custom' || this.config.footer) {
            this.elements.footer = document.createElement('div');
            this.elements.footer.className = 'modal-footer';
            this.elements.modal.appendChild(this.elements.footer);
        }
        
        // Create close button
        if (this.config.closable && this.config.showCloseButton && this.elements.header) {
            this.elements.closeButton = document.createElement('button');
            this.elements.closeButton.className = 'modal-close';
            this.elements.closeButton.innerHTML = '×';
            this.elements.closeButton.setAttribute('aria-label', 'Close modal');
            this.elements.header.appendChild(this.elements.closeButton);
        }
        
        // Assemble structure
        this.elements.overlay.appendChild(this.elements.modal);
        
        // Don't append to DOM yet - will be done on show()
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Close button
        if (this.elements.closeButton) {
            this.elements.closeButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.hide();
            });
        }
        
        // Overlay click
        if (this.config.closeOnOverlay) {
            this.elements.overlay.addEventListener('click', (e) => {
                if (e.target === this.elements.overlay) {
                    this.hide();
                }
            });
        }
        
        // Keyboard events
        if (this.config.keyboard) {
            this.handleKeydown = this.handleKeydown.bind(this);
        }
        
        // Animation events
        if (this.config.animation) {
            this.elements.overlay.addEventListener('transitionend', (e) => {
                if (e.target === this.elements.overlay) {
                    if (this.state.isClosing) {
                        this.completeHide();
                    } else if (this.state.isOpen) {
                        this.completeShow();
                    }
                }
            });
        }
    }

    /**
     * Show the modal
     */
    show(content = null) {
        if (this.state.isOpen) return this;
        
        this.state.isOpen = true;
        this.state.isClosing = false;
        
        // Store previous focus
        this.state.previousFocus = document.activeElement;
        
        // Set content if provided
        if (content) {
            this.setContent(content);
        }
        
        // Add to DOM
        document.body.appendChild(this.elements.overlay);
        
        // Prevent body scroll
        this.preventBodyScroll(true);
        
        // Update z-index if there are other modals
        this.elements.overlay.style.zIndex = this.getNextZIndex();
        
        // Trigger show callback
        this.triggerCallback('onShow');
        
        // Setup focus management
        this.setupFocusManagement();
        
        // Show with animation
        if (this.config.animation) {
            // Force reflow to ensure initial state
            this.elements.overlay.offsetHeight;
            
            // Add open class for animation
            requestAnimationFrame(() => {
                this.elements.overlay.classList.add('open');
            });
        } else {
            this.elements.overlay.classList.add('open');
            this.completeShow();
        }
        
        return this;
    }

    /**
     * Hide the modal
     */
    hide() {
        if (!this.state.isOpen || this.state.isClosing) return this;
        
        this.state.isClosing = true;
        
        // Trigger hide callback
        this.triggerCallback('onHide');
        
        // Remove keyboard listener
        if (this.config.keyboard) {
            document.removeEventListener('keydown', this.handleKeydown);
        }
        
        // Hide with animation
        if (this.config.animation) {
            this.elements.overlay.classList.add('closing');
            this.elements.overlay.classList.remove('open');
        } else {
            this.completeHide();
        }
        
        return this;
    }

    /**
     * Complete the show process
     */
    completeShow() {
        // Set focus
        if (this.config.focus) {
            this.setInitialFocus();
        }
        
        // Add keyboard listener
        if (this.config.keyboard) {
            document.addEventListener('keydown', this.handleKeydown);
        }
        
        // Trigger shown callback
        this.triggerCallback('onShown');
    }

    /**
     * Complete the hide process
     */
    completeHide() {
        this.state.isOpen = false;
        this.state.isClosing = false;
        
        // Remove from DOM
        if (this.elements.overlay.parentNode) {
            this.elements.overlay.parentNode.removeChild(this.elements.overlay);
        }
        
        // Remove classes
        this.elements.overlay.classList.remove('open', 'closing');
        
        // Restore body scroll
        this.preventBodyScroll(false);
        
        // Restore focus
        if (this.state.previousFocus && this.config.focus) {
            try {
                this.state.previousFocus.focus();
            } catch (e) {
                // Focus restoration failed, focus body
                document.body.focus();
            }
        }
        
        // Trigger hidden callback
        this.triggerCallback('onHidden');
        
        // Destroy if configured
        if (this.config.destroyOnClose) {
            this.destroy();
        }
    }

    /**
     * Set modal content
     */
    setContent(content) {
        if (typeof content === 'string') {
            this.elements.body.innerHTML = content;
        } else if (content instanceof HTMLElement) {
            this.elements.body.innerHTML = '';
            this.elements.body.appendChild(content);
        } else if (typeof content === 'object') {
            this.setStructuredContent(content);
        }
        
        // Update focus management after content change
        if (this.state.isOpen) {
            this.setupFocusManagement();
        }
        
        return this;
    }

    /**
     * Set structured content (title, body, footer)
     */
    setStructuredContent(content) {
        // Set title
        if (content.title && this.elements.header) {
            let titleElement = this.elements.header.querySelector('.modal-title');
            if (!titleElement) {
                titleElement = document.createElement('h2');
                titleElement.className = 'modal-title';
                titleElement.id = 'modal-title';
                this.elements.header.insertBefore(titleElement, this.elements.closeButton);
            }
            titleElement.innerHTML = content.title;
        }
        
        // Set subtitle
        if (content.subtitle && this.elements.header) {
            let subtitleElement = this.elements.header.querySelector('.modal-subtitle');
            if (!subtitleElement) {
                subtitleElement = document.createElement('p');
                subtitleElement.className = 'modal-subtitle';
                this.elements.header.appendChild(subtitleElement);
            }
            subtitleElement.innerHTML = content.subtitle;
        }
        
        // Set body
        if (content.body) {
            if (typeof content.body === 'string') {
                this.elements.body.innerHTML = content.body;
            } else if (content.body instanceof HTMLElement) {
                this.elements.body.innerHTML = '';
                this.elements.body.appendChild(content.body);
            }
        }
        
        // Set footer
        if (content.footer && this.elements.footer) {
            if (typeof content.footer === 'string') {
                this.elements.footer.innerHTML = content.footer;
            } else if (content.footer instanceof HTMLElement) {
                this.elements.footer.innerHTML = '';
                this.elements.footer.appendChild(content.footer);
            }
        }
    }

    /**
     * Set loading state
     */
    setLoading(isLoading, message = 'Loading...') {
        this.state.isLoading = isLoading;
        
        if (isLoading) {
            const loadingHTML = `
                <div class="modal-loading">
                    <div class="modal-loading-spinner"></div>
                    <div class="modal-loading-text">${message}</div>
                </div>
            `;
            this.elements.body.innerHTML = loadingHTML;
        }
        
        // Disable/enable interactive elements
        const buttons = this.elements.modal.querySelectorAll('button:not(.modal-close)');
        buttons.forEach(btn => {
            btn.disabled = isLoading;
        });
        
        return this;
    }

    /**
     * Show error state
     */
    setError(error, title = 'Error') {
        const errorHTML = `
            <div class="modal-error">
                <div class="modal-error-icon">⚠️</div>
                <div class="modal-error-title">${title}</div>
                <div class="modal-error-message">${error}</div>
            </div>
        `;
        
        this.elements.body.innerHTML = errorHTML;
        return this;
    }

    /**
     * Handle keyboard events
     */
    handleKeydown(e) {
        // Escape key
        if (e.key === 'Escape' && this.config.closeOnEscape && this.config.closable) {
            e.preventDefault();
            this.hide();
            return;
        }
        
        // Tab key for focus management
        if (e.key === 'Tab') {
            this.handleTabKey(e);
        }
        
        // Trigger custom callback
        this.triggerCallback('onKeydown', e);
    }

    /**
     * Handle tab key for focus trapping
     */
    handleTabKey(e) {
        if (this.focusableElements.length === 0) return;
        
        const isTabPressed = e.key === 'Tab';
        if (!isTabPressed) return;
        
        if (e.shiftKey) {
            // Shift + Tab
            if (document.activeElement === this.firstFocusable) {
                this.lastFocusable.focus();
                e.preventDefault();
            }
        } else {
            // Tab
            if (document.activeElement === this.lastFocusable) {
                this.firstFocusable.focus();
                e.preventDefault();
            }
        }
    }

    /**
     * Setup focus management
     */
    setupFocusManagement() {
        // Find all focusable elements
        this.focusableElements = this.elements.modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        this.firstFocusable = this.focusableElements[0];
        this.lastFocusable = this.focusableElements[this.focusableElements.length - 1];
    }

    /**
     * Set initial focus
     */
    setInitialFocus() {
        // Try to focus the first input or button
        const firstInput = this.elements.modal.querySelector('input, textarea');
        const firstButton = this.elements.modal.querySelector('button:not(.modal-close)');
        
        if (firstInput) {
            firstInput.focus();
        } else if (firstButton) {
            firstButton.focus();
        } else if (this.firstFocusable) {
            this.firstFocusable.focus();
        } else {
            this.elements.modal.focus();
        }
    }

    /**
     * Prevent body scroll
     */
    preventBodyScroll(prevent) {
        if (prevent) {
            // Store current scroll position
            this.scrollPosition = window.pageYOffset;
            
            // Count open modals
            const openModals = Modal.instances.filter(modal => modal.state.isOpen);
            
            // Only prevent scroll for first modal
            if (openModals.length <= 1) {
                document.body.classList.add('modal-open');
                document.body.style.top = `-${this.scrollPosition}px`;
            }
        } else {
            // Count remaining open modals
            const openModals = Modal.instances.filter(modal => modal.state.isOpen);
            
            // Only restore scroll if no modals are open
            if (openModals.length === 0) {
                document.body.classList.remove('modal-open');
                document.body.style.top = '';
                window.scrollTo(0, this.scrollPosition || 0);
            }
        }
    }

    /**
     * Get next z-index for stacking
     */
    getNextZIndex() {
        return ++Modal.zIndexCounter;
    }

    /**
     * Trigger callback
     */
    triggerCallback(callbackName, ...args) {
        if (this.callbacks[callbackName]) {
            this.callbacks[callbackName].apply(this, args);
        }
        
        // Also trigger custom event
        const eventName = callbackName.replace('on', '').toLowerCase();
        const event = new CustomEvent(`modal:${eventName}`, {
            detail: { modal: this, args }
        });
        
        this.elements.modal.dispatchEvent(event);
        
        if (CONFIG.IS_DEV) {
            console.log(`🪟 Modal Event:`, eventName, args);
        }
    }

    /**
     * Public API methods
     */

    on(event, callback) {
        const eventMap = {
            'show': 'onShow',
            'shown': 'onShown',
            'hide': 'onHide',
            'hidden': 'onHidden',
            'confirm': 'onConfirm',
            'cancel': 'onCancel',
            'keydown': 'onKeydown'
        };

        const callbackName = eventMap[event];
        if (callbackName) {
            this.callbacks[callbackName] = callback;
        }
        
        return this;
    }

    setSize(size) {
        this.config.size = size;
        this.elements.modal.className = `modal ${size}`;
        return this;
    }

    setTitle(title) {
        this.setStructuredContent({ title });
        return this;
    }

    setBody(body) {
        this.setStructuredContent({ body });
        return this;
    }

    setFooter(footer) {
        this.setStructuredContent({ footer });
        return this;
    }

    isVisible() {
        return this.state.isOpen;
    }

    /**
     * Handle errors gracefully
     */
    handleError(error) {
        console.error('Modal error:', error);
        
        if (this.elements.overlay) {
            this.setError(error.message, 'Modal Error');
        }
    }

    /**
     * Cleanup resources
     */
    destroy() {
        console.log('🧹 Cleaning up Modal...');
        
        // Hide if open
        if (this.state.isOpen) {
            this.hide();
        }
        
        // Remove from instances
        const index = Modal.instances.indexOf(this);
        if (index > -1) {
            Modal.instances.splice(index, 1);
        }
        
        // Remove event listeners
        if (this.config.keyboard) {
            document.removeEventListener('keydown', this.handleKeydown);
        }
        
        // Remove from DOM
        if (this.elements.overlay && this.elements.overlay.parentNode) {
            this.elements.overlay.parentNode.removeChild(this.elements.overlay);
        }
        
        // Clear references
        Object.keys(this.elements).forEach(key => {
            this.elements[key] = null;
        });
        
        Object.keys(this.callbacks).forEach(key => {
            this.callbacks[key] = null;
        });
    }

    /**
     * Static factory methods
     */

    static info(title, message, options = {}) {
        const modal = new Modal({
            type: 'info',
            size: 'medium',
            ...options
        });
        
        modal.setStructuredContent({
            title,
            body: `
                <div class="modal-confirmation">
                    <div class="modal-confirmation-icon info">ℹ️</div>
                    <div class="modal-confirmation-message">${message}</div>
                </div>
            `,
            footer: `
                <button class="modal-button modal-button-primary" data-action="ok">
                    OK
                </button>
            `
        });
        
        // Bind footer actions
        modal.elements.footer.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'ok') {
                modal.hide();
            }
        });
        
        return modal.show();
    }

    static warning(title, message, options = {}) {
        const modal = new Modal({
            type: 'warning',
            size: 'medium',
            ...options
        });
        
        modal.setStructuredContent({
            title,
            body: `
                <div class="modal-confirmation">
                    <div class="modal-confirmation-icon warning">⚠️</div>
                    <div class="modal-confirmation-message">${message}</div>
                </div>
            `,
            footer: `
                <button class="modal-button modal-button-primary" data-action="ok">
                    OK
                </button>
            `
        });
        
        // Bind footer actions
        modal.elements.footer.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'ok') {
                modal.hide();
            }
        });
        
        return modal.show();
    }

    static confirm(title, message, options = {}) {
        return new Promise((resolve) => {
            const modal = new Modal({
                type: 'confirmation',
                size: 'medium',
                closeOnOverlay: false,
                closeOnEscape: false,
                ...options
            });
            
            modal.setStructuredContent({
                title,
                body: `
                    <div class="modal-confirmation">
                        <div class="modal-confirmation-icon warning">❓</div>
                        <div class="modal-confirmation-message">${message}</div>
                    </div>
                `,
                footer: `
                    <button class="modal-button modal-button-secondary" data-action="cancel">
                        Cancel
                    </button>
                    <button class="modal-button modal-button-primary" data-action="confirm">
                        Confirm
                    </button>
                `
            });
            
            // Bind footer actions
            modal.elements.footer.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'confirm') {
                    modal.triggerCallback('onConfirm');
                    resolve(true);
                    modal.hide();
                } else if (action === 'cancel') {
                    modal.triggerCallback('onCancel');
                    resolve(false);
                    modal.hide();
                }
            });
            
            modal.on('hidden', () => {
                modal.destroy();
            });
            
            modal.show();
        });
    }

    static danger(title, message, confirmText = 'Delete', options = {}) {
        return new Promise((resolve) => {
            const modal = new Modal({
                type: 'confirmation',
                size: 'medium',
                closeOnOverlay: false,
                closeOnEscape: false,
                ...options
            });
            
            modal.setStructuredContent({
                title,
                body: `
                    <div class="modal-confirmation">
                        <div class="modal-confirmation-icon danger">🗑️</div>
                        <div class="modal-confirmation-message">${message}</div>
                    </div>
                `,
                footer: `
                    <button class="modal-button modal-button-secondary" data-action="cancel">
                        Cancel
                    </button>
                    <button class="modal-button modal-button-danger" data-action="confirm">
                        ${confirmText}
                    </button>
                `
            });
            
            // Bind footer actions
            modal.elements.footer.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                if (action === 'confirm') {
                    modal.triggerCallback('onConfirm');
                    resolve(true);
                    modal.hide();
                } else if (action === 'cancel') {
                    modal.triggerCallback('onCancel');
                    resolve(false);
                    modal.hide();
                }
            });
            
            modal.on('hidden', () => {
                modal.destroy();
            });
            
            modal.show();
        });
    }

    static loading(message = 'Loading...', options = {}) {
        const modal = new Modal({
            size: 'small',
            closable: false,
            closeOnOverlay: false,
            closeOnEscape: false,
            showCloseButton: false,
            ...options
        });
        
        modal.setLoading(true, message);
        return modal.show();
    }

    static closeAll() {
        Modal.instances.forEach(modal => {
            if (modal.state.isOpen) {
                modal.hide();
            }
        });
    }

    static getOpenModals() {
        return Modal.instances.filter(modal => modal.state.isOpen);
    }
}