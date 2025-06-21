/**
 * Minimal NotFound.js Component
 * Creates: js/components/NotFound.js
 * 
 * Simple 404 page - quick fix version
 */

export class NotFound {
    constructor(container) {
        this.container = container || document.getElementById('main-content');
        this.render();
    }

    render() {
        this.container.innerHTML = `
            <div style="
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                min-height: 60vh; 
                text-align: center; 
                padding: 2rem;
            ">
                <h1 style="font-size: 4rem; color: #6366f1; margin: 0;">404</h1>
                <h2 style="margin: 1rem 0; color: var(--color-text-primary);">Page Not Found</h2>
                <p style="color: var(--color-text-secondary); margin-bottom: 2rem;">
                    The page you're looking for doesn't exist.
                </p>
                <a href="/" style="
                    display: inline-block; 
                    padding: 0.75rem 1.5rem; 
                    background: #6366f1; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 6px;
                    font-weight: 500;
                ">
                    Go Home
                </a>
            </div>
        `;
    }
}

export default NotFound;