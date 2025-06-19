# Accessibility Guidelines

> **Complete accessibility guide for the NCS-API Website**

This document provides comprehensive accessibility guidelines and implementation strategies to ensure the NCS-API Website is usable by everyone, including users with disabilities.

## 📋 **Table of Contents**

1. [Accessibility Standards](#accessibility-standards)
2. [WCAG 2.1 AA Compliance](#wcag-21-aa-compliance)
3. [Semantic HTML Structure](#semantic-html-structure)
4. [ARIA Implementation](#aria-implementation)
5. [Keyboard Navigation](#keyboard-navigation)
6. [Visual Design Guidelines](#visual-design-guidelines)
7. [Screen Reader Support](#screen-reader-support)
8. [Testing & Validation](#testing--validation)
9. [Accessibility Checklist](#accessibility-checklist)
10. [Common Issues & Solutions](#common-issues--solutions)

---

## 🎯 **Accessibility Standards**

### WCAG 2.1 Conformance Level AA
We aim for **WCAG 2.1 Level AA compliance** across all features:

| Principle | Guidelines | Success Criteria |
|-----------|------------|------------------|
| **Perceivable** | Information must be presentable in ways users can perceive | Color contrast, text alternatives, captions |
| **Operable** | Interface components must be operable | Keyboard access, timing, seizures |
| **Understandable** | Information and UI operation must be understandable | Readable text, predictable functionality |
| **Robust** | Content must be robust enough for various assistive technologies | Valid code, compatibility |

### Legal Requirements
- **ADA (Americans with Disabilities Act)** compliance
- **Section 508** federal accessibility requirements
- **EN 301 549** European accessibility standard
- **AODA (Accessibility for Ontarians with Disabilities Act)** compliance

---

## ✅ **WCAG 2.1 AA Compliance**

### Level A Requirements (Must Have)
```html
<!-- 1.1.1 Non-text Content -->
<img src="/assets/images/chart.png" 
     alt="Scatter plot showing 3 distinct clusters in customer data">

<button aria-label="Start clustering analysis">
  <svg aria-hidden="true" focusable="false">
    <use xlink:href="#play-icon"></use>
  </svg>
</button>

<!-- 1.3.1 Info and Relationships -->
<table role="table" aria-label="Clustering results">
  <thead>
    <tr>
      <th scope="col">Algorithm</th>
      <th scope="col">Processing Time</th>
      <th scope="col">Accuracy Score</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">K-Means</th>
      <td>145ms</td>
      <td>0.85</td>
    </tr>
  </tbody>
</table>

<!-- 2.1.1 Keyboard Access -->
<div class="interactive-chart" 
     tabindex="0" 
     role="application" 
     aria-label="Interactive clustering visualization">
  <!-- Chart content -->
</div>
```

### Level AA Requirements (Should Have)
```css
/* 1.4.3 Contrast (Minimum) - 4.5:1 for normal text */
:root {
  --text-color: #1f2937; /* 15.3:1 contrast on white */
  --background-color: #ffffff;
  --primary-color: #2563eb; /* 4.86:1 contrast on white */
  --secondary-color: #64748b; /* 4.54:1 contrast on white */
}

/* 1.4.4 Resize Text - Support up to 200% zoom */
html {
  font-size: 100%; /* 16px base */
}

body {
  font-size: 1rem;
  line-height: 1.5; /* 1.4.8 Visual Presentation */
}

/* 1.4.10 Reflow - No horizontal scrolling at 320px width */
@media (max-width: 320px) {
  .container {
    padding: 0.5rem;
    overflow-x: visible;
  }
}

/* 1.4.11 Non-text Contrast - 3:1 for UI components */
.btn {
  background: var(--primary-color);
  border: 2px solid var(--primary-color);
  color: white; /* 7.37:1 contrast */
}

.btn:focus {
  outline: 3px solid #fbbf24; /* 3.56:1 contrast with background */
  outline-offset: 2px;
}
```

---

## 🏗️ **Semantic HTML Structure**

### Document Structure
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NCS-API - Clustering Playground | Interactive Data Analysis</title>
</head>
<body>
  <!-- Skip link for keyboard users -->
  <a href="#main-content" class="skip-link">Skip to main content</a>
  
  <!-- Main navigation -->
  <nav aria-label="Main navigation" role="navigation">
    <ul>
      <li><a href="/" aria-current="page">Home</a></li>
      <li><a href="/playground">Playground</a></li>
      <li><a href="/docs">Documentation</a></li>
    </ul>
  </nav>
  
  <!-- Main content area -->
  <main id="main-content" role="main">
    <h1>Clustering Playground</h1>
    
    <!-- Content sections -->
    <section aria-labelledby="data-upload-heading">
      <h2 id="data-upload-heading">Data Upload</h2>
      <!-- Content -->
    </section>
    
    <section aria-labelledby="results-heading">
      <h2 id="results-heading">Clustering Results</h2>
      <!-- Content -->
    </section>
  </main>
  
  <!-- Complementary content -->
  <aside role="complementary" aria-labelledby="help-heading">
    <h2 id="help-heading">Help & Tips</h2>
    <!-- Help content -->
  </aside>
  
  <!-- Site footer -->
  <footer role="contentinfo">
    <!-- Footer content -->
  </footer>
</body>
</html>
```

### Form Structure
```html
<form role="form" aria-labelledby="clustering-form-title" novalidate>
  <fieldset>
    <legend id="clustering-form-title">Clustering Configuration</legend>
    
    <!-- Algorithm selection -->
    <div class="form-group" role="group" aria-labelledby="algorithm-legend">
      <fieldset>
        <legend id="algorithm-legend">Select Clustering Algorithm</legend>
        
        <div class="radio-group">
          <input type="radio" 
                 id="kmeans" 
                 name="algorithm" 
                 value="kmeans" 
                 checked
                 aria-describedby="kmeans-desc">
          <label for="kmeans">K-Means</label>
          <div id="kmeans-desc" class="help-text">
            Fast algorithm for spherical clusters
          </div>
        </div>
        
        <div class="radio-group">
          <input type="radio" 
                 id="dbscan" 
                 name="algorithm" 
                 value="dbscan"
                 aria-describedby="dbscan-desc">
          <label for="dbscan">DBSCAN</label>
          <div id="dbscan-desc" class="help-text">
            Density-based algorithm for irregular shapes
          </div>
        </div>
      </fieldset>
    </div>
    
    <!-- Parameters -->
    <div class="form-group">
      <label for="cluster-count">
        Number of Clusters
        <span class="required" aria-label="required">*</span>
      </label>
      <input type="number" 
             id="cluster-count" 
             name="k" 
             min="2" 
             max="20" 
             value="3" 
             required
             aria-describedby="cluster-count-help cluster-count-error">
      <div id="cluster-count-help" class="help-text">
        Choose between 2 and 20 clusters
      </div>
      <div id="cluster-count-error" 
           class="error-message" 
           role="alert" 
           aria-live="polite"
           style="display: none;">
        Please enter a number between 2 and 20
      </div>
    </div>
    
    <!-- Submit button -->
    <button type="submit" 
            class="btn btn-primary"
            aria-describedby="submit-help">
      <span class="btn-text">Run Clustering</span>
      <span class="btn-icon" aria-hidden="true">▶</span>
    </button>
    <div id="submit-help" class="help-text">
      This will analyze your data using the selected algorithm
    </div>
  </fieldset>
</form>
```

---

## 🎯 **ARIA Implementation**

### ARIA Landmarks
```html
<!-- Navigation landmark -->
<nav role="navigation" aria-label="Main navigation">
  <ul role="menubar">
    <li role="none">
      <a href="/" role="menuitem" aria-current="page">Home</a>
    </li>
    <li role="none">
      <a href="/playground" role="menuitem">Playground</a>
    </li>
  </ul>
</nav>

<!-- Search landmark -->
<div role="search" aria-label="Site search">
  <label for="search-input" class="visually-hidden">Search documentation</label>
  <input type="search" 
         id="search-input" 
         placeholder="Search..."
         aria-describedby="search-help">
  <div id="search-help" class="visually-hidden">
    Search through API documentation and examples
  </div>
</div>

<!-- Main content landmark -->
<main role="main" aria-labelledby="page-title">
  <h1 id="page-title">Clustering Playground</h1>
</main>

<!-- Complementary content -->
<aside role="complementary" aria-labelledby="sidebar-title">
  <h2 id="sidebar-title">Quick Links</h2>
</aside>
```

### ARIA Properties and States
```html
<!-- Live regions for dynamic content -->
<div id="status-region" 
     role="status" 
     aria-live="polite" 
     aria-atomic="true"
     class="visually-hidden">
  Clustering in progress...
</div>

<div id="error-region" 
     role="alert" 
     aria-live="assertive" 
     aria-atomic="true">
  <!-- Error messages appear here -->
</div>

<!-- Expandable sections -->
<button type="button"
        class="accordion-trigger"
        aria-expanded="false"
        aria-controls="algorithm-details"
        id="algorithm-trigger">
  Algorithm Details
  <span class="icon" aria-hidden="true">▼</span>
</button>

<div id="algorithm-details"
     class="accordion-content"
     role="region"
     aria-labelledby="algorithm-trigger"
     hidden>
  <p>Detailed algorithm information...</p>
</div>

<!-- Progress indicators -->
<div role="progressbar" 
     aria-valuenow="65" 
     aria-valuemin="0" 
     aria-valuemax="100"
     aria-label="Data processing progress">
  <div class="progress-bar" style="width: 65%">65%</div>
</div>

<!-- Complex widgets -->
<div role="application" 
     aria-label="Interactive clustering visualization"
     tabindex="0"
     aria-describedby="chart-instructions">
  <!-- Chart content -->
</div>

<div id="chart-instructions" class="visually-hidden">
  Use arrow keys to navigate data points. 
  Press Enter to select a cluster. 
  Press Escape to return to overview.
</div>
```

### Custom ARIA Patterns
```javascript
// Accessible data table with sorting
class AccessibleDataTable {
  constructor(container) {
    this.container = container;
    this.currentSort = { column: null, direction: 'none' };
    this.init();
  }
  
  init() {
    this.setupARIA();
    this.setupKeyboardNavigation();
    this.setupSorting();
  }
  
  setupARIA() {
    // Add table ARIA attributes
    const table = this.container.querySelector('table');
    table.setAttribute('role', 'table');
    table.setAttribute('aria-label', 'Clustering results data');
    
    // Add row and cell ARIA attributes
    table.querySelectorAll('tr').forEach((row, index) => {
      row.setAttribute('role', 'row');
      
      const cells = row.querySelectorAll('td, th');
      cells.forEach(cell => {
        const role = cell.tagName === 'TH' ? 'columnheader' : 'cell';
        cell.setAttribute('role', role);
        
        if (role === 'columnheader') {
          cell.setAttribute('tabindex', '0');
          cell.setAttribute('aria-sort', 'none');
        }
      });
    });
  }
  
  setupSorting() {
    const headers = this.container.querySelectorAll('th[role="columnheader"]');
    
    headers.forEach(header => {
      header.addEventListener('click', () => this.sort(header));
      header.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.sort(header);
        }
      });
    });
  }
  
  sort(header) {
    const column = header.cellIndex;
    let direction = 'ascending';
    
    if (this.currentSort.column === column) {
      direction = this.currentSort.direction === 'ascending' ? 'descending' : 'ascending';
    }
    
    // Update ARIA attributes
    this.container.querySelectorAll('th[role="columnheader"]').forEach(th => {
      th.setAttribute('aria-sort', 'none');
    });
    
    header.setAttribute('aria-sort', direction);
    
    // Update sort state
    this.currentSort = { column, direction };
    
    // Announce sort change
    this.announceSortChange(header.textContent, direction);
    
    // Perform actual sorting
    this.performSort(column, direction);
  }
  
  announceSortChange(columnName, direction) {
    const announcement = `Table sorted by ${columnName}, ${direction} order`;
    this.announceToScreenReader(announcement);
  }
  
  announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'visually-hidden';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }
}
```

---

## ⌨️ **Keyboard Navigation**

### Focus Management
```css
/* Visible focus indicators */
:focus {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
}

/* Custom focus styles for different elements */
.btn:focus {
  outline: 3px solid #fbbf24;
  outline-offset: 2px;
  box-shadow: 0 0 0 6px rgba(251, 191, 36, 0.2);
}

.form-control:focus {
  outline: 3px solid #fbbf24;
  outline-offset: 0;
  border-color: #fbbf24;
}

/* Skip to content link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 6px;
  background: #000;
  color: #fff;
  padding: 8px;
  text-decoration: none;
  z-index: 1000;
  border-radius: 4px;
}

.skip-link:focus {
  top: 6px;
}

/* Focus within containers */
.card:focus-within {
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.3);
}
```

### Keyboard Event Handlers
```javascript
// Comprehensive keyboard navigation
class KeyboardNavigationManager {
  constructor() {
    this.focusableElements = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[role="button"]:not([disabled])',
      '[role="link"]'
    ].join(', ');
    
    this.init();
  }
  
  init() {
    this.setupGlobalKeyboardHandlers();
    this.setupModalKeyboardTrap();
    this.setupMenuKeyboardNavigation();
    this.setupCustomWidgetNavigation();
  }
  
  setupGlobalKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
      // Alt + S: Skip to search
      if (e.altKey && e.key === 's') {
        e.preventDefault();
        this.focusElement('#search-input');
      }
      
      // Alt + M: Skip to main content
      if (e.altKey && e.key === 'm') {
        e.preventDefault();
        this.focusElement('#main-content');
      }
      
      // Alt + N: Skip to navigation
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        this.focusElement('nav[role="navigation"] a');
      }
      
      // Escape: Close modals/menus
      if (e.key === 'Escape') {
        this.closeActiveOverlays();
      }
    });
  }
  
  setupModalKeyboardTrap() {
    document.addEventListener('keydown', (e) => {
      const modal = document.querySelector('.modal[aria-hidden="false"]');
      if (!modal) return;
      
      if (e.key === 'Tab') {
        this.trapFocusInModal(e, modal);
      }
    });
  }
  
  trapFocusInModal(event, modal) {
    const focusableElements = modal.querySelectorAll(this.focusableElements);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }
  
  setupMenuKeyboardNavigation() {
    document.querySelectorAll('[role="menubar"], [role="menu"]').forEach(menu => {
      menu.addEventListener('keydown', (e) => {
        this.handleMenuKeyboard(e, menu);
      });
    });
  }
  
  handleMenuKeyboard(event, menu) {
    const items = menu.querySelectorAll('[role="menuitem"]');
    const currentIndex = Array.from(items).indexOf(document.activeElement);
    
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        const nextIndex = (currentIndex + 1) % items.length;
        items[nextIndex].focus();
        break;
        
      case 'ArrowUp':
      case 'ArrowLeft':
        event.preventDefault();
        const prevIndex = currentIndex === 0 ? items.length - 1 : currentIndex - 1;
        items[prevIndex].focus();
        break;
        
      case 'Home':
        event.preventDefault();
        items[0].focus();
        break;
        
      case 'End':
        event.preventDefault();
        items[items.length - 1].focus();
        break;
        
      case 'Enter':
      case ' ':
        event.preventDefault();
        document.activeElement.click();
        break;
    }
  }
  
  setupCustomWidgetNavigation() {
    // Chart navigation
    document.querySelectorAll('[role="application"]').forEach(widget => {
      widget.addEventListener('keydown', (e) => {
        this.handleWidgetKeyboard(e, widget);
      });
    });
  }
  
  handleWidgetKeyboard(event, widget) {
    const widgetType = widget.dataset.widgetType;
    
    switch (widgetType) {
      case 'chart':
        this.handleChartKeyboard(event, widget);
        break;
      case 'data-grid':
        this.handleDataGridKeyboard(event, widget);
        break;
    }
  }
  
  handleChartKeyboard(event, chart) {
    const state = chart._chartState || { selectedPoint: 0 };
    const dataPoints = chart.querySelectorAll('.data-point');
    
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        state.selectedPoint = Math.min(state.selectedPoint + 1, dataPoints.length - 1);
        this.highlightDataPoint(dataPoints[state.selectedPoint]);
        break;
        
      case 'ArrowLeft':
        event.preventDefault();
        state.selectedPoint = Math.max(state.selectedPoint - 1, 0);
        this.highlightDataPoint(dataPoints[state.selectedPoint]);
        break;
        
      case 'Enter':
        event.preventDefault();
        this.selectDataPoint(dataPoints[state.selectedPoint]);
        break;
    }
    
    chart._chartState = state;
  }
  
  focusElement(selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.focus();
      return true;
    }
    return false;
  }
  
  closeActiveOverlays() {
    // Close modals
    document.querySelectorAll('.modal[aria-hidden="false"]').forEach(modal => {
      this.closeModal(modal);
    });
    
    // Close dropdown menus
    document.querySelectorAll('.dropdown.open').forEach(dropdown => {
      dropdown.classList.remove('open');
    });
  }
}

// Initialize keyboard navigation
new KeyboardNavigationManager();
```

### Tab Order Management
```javascript
// Dynamic tab order management
class TabOrderManager {
  constructor() {
    this.activeRegion = null;
    this.init();
  }
  
  init() {
    this.setupRegionManagement();
    this.setupDynamicTabOrder();
  }
  
  setupRegionManagement() {
    // When entering a complex widget, manage tab order
    document.querySelectorAll('[role="application"]').forEach(widget => {
      widget.addEventListener('focus', () => {
        this.enterApplicationMode(widget);
      });
      
      widget.addEventListener('blur', (e) => {
        if (!widget.contains(e.relatedTarget)) {
          this.exitApplicationMode(widget);
        }
      });
    });
  }
  
  enterApplicationMode(widget) {
    // Remove other focusable elements from tab order
    this.setTabIndex('document', '-1');
    
    // Enable tab order within widget
    this.setTabIndex('widget', '0', widget);
    
    this.activeRegion = widget;
    
    // Announce mode change
    this.announceToScreenReader('Entered application mode. Use arrow keys to navigate.');
  }
  
  exitApplicationMode(widget) {
    // Restore document tab order
    this.setTabIndex('document', '0');
    
    // Remove widget tab order
    this.setTabIndex('widget', '-1', widget);
    
    this.activeRegion = null;
    
    // Announce mode change
    this.announceToScreenReader('Exited application mode.');
  }
  
  setTabIndex(scope, value, container = document) {
    const selectors = {
      document: 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      widget: '.focusable-widget-element'
    };
    
    container.querySelectorAll(selectors[scope]).forEach(element => {
      element.setAttribute('tabindex', value);
    });
  }
}
```

---

## 🎨 **Visual Design Guidelines**

### Color and Contrast
```css
/* WCAG AA compliant color palette */
:root {
  /* Primary colors */
  --primary-50: #eff6ff;   /* Background tints */
  --primary-100: #dbeafe;
  --primary-500: #3b82f6;  /* 4.5:1 contrast on white */
  --primary-600: #2563eb;  /* 4.89:1 contrast on white */
  --primary-700: #1d4ed8;  /* 6.94:1 contrast on white */
  
  /* Semantic colors */
  --success-500: #10b981;  /* 4.51:1 contrast on white */
  --warning-500: #f59e0b;  /* 4.52:1 contrast on white */
  --error-500: #ef4444;    /* 4.64:1 contrast on white */
  
  /* Text colors */
  --text-primary: #111827;    /* 15.93:1 contrast on white */
  --text-secondary: #6b7280; /* 4.69:1 contrast on white */
  --text-muted: #9ca3af;     /* 3.24:1 contrast - use sparingly */
  
  /* Background colors */
  --bg-primary: #ffffff;
  --bg-secondary: #f9fafb;
  --bg-tertiary: #f3f4f6;
}

/* Dark theme colors (also WCAG compliant) */
[data-theme="dark"] {
  --primary-400: #60a5fa;   /* 4.58:1 contrast on dark */
  --primary-300: #93c5fd;   /* 7.04:1 contrast on dark */
  
  --text-primary: #f9fafb;     /* 15.8:1 contrast on dark */
  --text-secondary: #d1d5db;   /* 9.89:1 contrast on dark */
  --text-muted: #9ca3af;       /* 4.69:1 contrast on dark */
  
  --bg-primary: #111827;
  --bg-secondary: #1f2937;
  --bg-tertiary: #374151;
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  :root {
    --primary-500: #1e40af;     /* Higher contrast blue */
    --text-secondary: #374151;   /* Darker secondary text */
    --border-color: #000000;     /* Pure black borders */
  }
}

/* Color blindness considerations */
.status-indicator {
  /* Don't rely on color alone */
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.status-indicator::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.status-success {
  color: var(--success-500);
}

.status-success::after {
  content: '✓';
  font-weight: bold;
}

.status-error {
  color: var(--error-500);
}

.status-error::after {
  content: '✗';
  font-weight: bold;
}
```

### Typography and Readability
```css
/* Readable typography */
:root {
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px - base size */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */
  
  /* Line heights for readability */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
}

/* Base typography */
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  color: var(--text-primary);
}

/* Responsive text scaling */
h1 {
  font-size: var(--font-size-2xl);
  line-height: var(--line-height-tight);
  font-weight: 700;
}

@media (min-width: 768px) {
  h1 {
    font-size: var(--font-size-3xl);
  }
}

@media (min-width: 1024px) {
  h1 {
    font-size: var(--font-size-4xl);
  }
}

/* Reading flow optimization */
.content-text {
  max-width: 65ch; /* Optimal reading line length */
  margin-left: auto;
  margin-right: auto;
}

/* Text spacing */
p + p {
  margin-top: 1.5em;
}

/* List readability */
ul, ol {
  padding-left: 2em;
}

li + li {
  margin-top: 0.5em;
}

/* Code readability */
code {
  font-family: 'Source Code Pro', Monaco, monospace;
  font-size: 0.9em;
  background: var(--bg-tertiary);
  padding: 0.125em 0.25em;
  border-radius: 0.25em;
}

pre code {
  font-size: 0.875rem;
  line-height: 1.6;
  padding: 1rem;
  display: block;
  overflow-x: auto;
}
```

### Motion and Animation
```css
/* Respect user motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Safe animations that don't trigger vestibular disorders */
.fade-in {
  animation: safe-fade-in 0.3s ease-out;
}

@keyframes safe-fade-in {
  from {
    opacity: 0;
    /* Avoid transform animations that can cause motion sickness */
  }
  to {
    opacity: 1;
  }
}

/* Slide animations with reduced motion fallback */
.slide-in {
  animation: slide-in 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slide-in {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .slide-in {
    animation: safe-fade-in 0.3s ease-out;
  }
}

/* Loading animations that are accessibility-friendly */
.loading-spinner {
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .loading-spinner {
    animation: pulse 2s ease-in-out infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
}
```

---

## 📢 **Screen Reader Support**

### Screen Reader Testing
```javascript
// Screen reader announcement utility
class ScreenReaderAnnouncer {
  constructor() {
    this.politeRegion = this.createLiveRegion('polite');
    this.assertiveRegion = this.createLiveRegion('assertive');
  }
  
  createLiveRegion(politeness) {
    const region = document.createElement('div');
    region.setAttribute('aria-live', politeness);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'visually-hidden';
    document.body.appendChild(region);
    return region;
  }
  
  announce(message, priority = 'polite') {
    const region = priority === 'assertive' ? this.assertiveRegion : this.politeRegion;
    
    // Clear region first
    region.textContent = '';
    
    // Small delay to ensure screen readers notice the change
    setTimeout(() => {
      region.textContent = message;
    }, 100);
    
    // Clear after announcement
    setTimeout(() => {
      region.textContent = '';
    }, 5000);
  }
  
  announcePageChange(title) {
    this.announce(`Navigated to ${title}`, 'polite');
  }
  
  announceError(error) {
    this.announce(`Error: ${error}`, 'assertive');
  }
  
  announceSuccess(message) {
    this.announce(`Success: ${message}`, 'polite');
  }
  
  announceProgress(current, total, activity) {
    const percentage = Math.round((current / total) * 100);
    this.announce(`${activity} ${percentage}% complete. ${current} of ${total}.`, 'polite');
  }
}

// Usage in components
const announcer = new ScreenReaderAnnouncer();

// Announce clustering progress
function updateClusteringProgress(current, total) {
  announcer.announceProgress(current, total, 'Clustering data');
}

// Announce results
function announceClusteringResults(clusterCount) {
  announcer.announceSuccess(`Clustering complete. Found ${clusterCount} clusters.`);
}
```

### Content Description Patterns
```html
<!-- Complex data descriptions -->
<div role="img" aria-labelledby="chart-title" aria-describedby="chart-desc">
  <h3 id="chart-title">Customer Segmentation Results</h3>
  <div id="chart-desc" class="visually-hidden">
    Scatter plot showing 3 distinct customer clusters. 
    Cluster 1 contains 45 high-value customers in the upper right quadrant.
    Cluster 2 contains 32 medium-value customers in the center.
    Cluster 3 contains 23 low-value customers in the lower left quadrant.
    The clusters are well-separated with minimal overlap.
  </div>
  <!-- Chart content -->
</div>

<!-- Data table descriptions -->
<table role="table" aria-label="Clustering algorithm comparison">
  <caption>
    Performance comparison of 4 clustering algorithms on customer data.
    Processing time measured in milliseconds. Accuracy shown as percentage.
  </caption>
  <thead>
    <tr>
      <th scope="col">Algorithm</th>
      <th scope="col">Processing Time (ms)</th>
      <th scope="col">Accuracy (%)</th>
      <th scope="col">Memory Usage (MB)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">K-Means</th>
      <td>145</td>
      <td>85.2</td>
      <td>12.4</td>
    </tr>
    <!-- More rows -->
  </tbody>
</table>

<!-- Interactive element descriptions -->
<button type="button" 
        class="chart-zoom-btn"
        aria-label="Zoom into selected cluster"
        aria-describedby="zoom-instructions">
  🔍
</button>
<div id="zoom-instructions" class="visually-hidden">
  Click or press Enter to zoom into the currently selected cluster.
  Use arrow keys to select different clusters before zooming.
</div>
```

### Alternative Content Formats
```javascript
// Provide alternative content formats for complex visualizations
class AlternativeContentProvider {
  constructor() {
    this.contentFormats = new Map();
  }
  
  registerAlternative(elementId, provider) {
    this.contentFormats.set(elementId, provider);
  }
  
  generateTextAlternative(chartData, chartType) {
    switch (chartType) {
      case 'scatter':
        return this.generateScatterPlotDescription(chartData);
      case 'bar':
        return this.generateBarChartDescription(chartData);
      case 'line':
        return this.generateLineChartDescription(chartData);
      default:
        return this.generateGenericDescription(chartData);
    }
  }
  
  generateScatterPlotDescription(data) {
    const clusterCounts = this.countClusters(data);
    const totalPoints = data.length;
    
    let description = `Scatter plot with ${totalPoints} data points organized into ${clusterCounts.length} clusters. `;
    
    clusterCounts.forEach((count, index) => {
      const percentage = Math.round((count / totalPoints) * 100);
      description += `Cluster ${index + 1} contains ${count} points (${percentage}%). `;
    });
    
    // Add spatial distribution information
    const bounds = this.calculateBounds(data);
    description += `Data ranges from ${bounds.minX.toFixed(1)} to ${bounds.maxX.toFixed(1)} on the X-axis `;
    description += `and ${bounds.minY.toFixed(1)} to ${bounds.maxY.toFixed(1)} on the Y-axis.`;
    
    return description;
  }
  
  generateDataTable(chartData) {
    const table = document.createElement('table');
    table.className = 'alternative-data-table visually-hidden';
    table.setAttribute('aria-label', 'Chart data in tabular format');
    
    // Create header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Point', 'X Value', 'Y Value', 'Cluster'];
    headers.forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      th.scope = 'col';
      headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Create body
    const tbody = document.createElement('tbody');
    
    chartData.forEach((point, index) => {
      const row = document.createElement('tr');
      
      const cells = [
        index + 1,
        point.x.toFixed(2),
        point.y.toFixed(2),
        point.cluster + 1
      ];
      
      cells.forEach((cellData, cellIndex) => {
        const cell = document.createElement(cellIndex === 0 ? 'th' : 'td');
        if (cellIndex === 0) cell.scope = 'row';
        cell.textContent = cellData;
        row.appendChild(cell);
      });
      
      tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    return table;
  }
  
  generateSonification(chartData) {
    // Audio representation of data for blind users
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    const playDataPoint = (point, index) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      // Map X value to frequency (200-800 Hz)
      const frequency = 200 + (point.x / 100) * 600;
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      
      // Map Y value to volume
      const volume = Math.max(0.1, Math.min(1, point.y / 100));
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(audioContext.currentTime + index * 0.1);
      oscillator.stop(audioContext.currentTime + index * 0.1 + 0.05);
    };
    
    return {
      play: () => {
        chartData.forEach((point, index) => {
          playDataPoint(point, index);
        });
      }
    };
  }
}
```

---

## 🧪 **Testing & Validation**

### Automated Testing Tools
```javascript
// Automated accessibility testing
class AccessibilityTester {
  constructor() {
    this.violations = [];
    this.passedTests = [];
  }
  
  async runTests() {
    await this.testColorContrast();
    await this.testKeyboardNavigation();
    await this.testARIAImplementation();
    await this.testScreenReaderCompatibility();
    await this.testFormAccessibility();
    
    return this.generateReport();
  }
  
  async testColorContrast() {
    const elements = document.querySelectorAll('*');
    
    elements.forEach(element => {
      const styles = getComputedStyle(element);
      const textColor = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      if (textColor && backgroundColor && textColor !== backgroundColor) {
        const contrast = this.calculateContrast(textColor, backgroundColor);
        const fontSize = parseFloat(styles.fontSize);
        const fontWeight = styles.fontWeight;
        
        const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700);
        const requiredRatio = isLargeText ? 3 : 4.5;
        
        if (contrast < requiredRatio) {
          this.violations.push({
            type: 'color-contrast',
            element: element.tagName.toLowerCase(),
            selector: this.getSelector(element),
            contrast: contrast.toFixed(2),
            required: requiredRatio,
            message: `Insufficient color contrast: ${contrast.toFixed(2)}:1 (required: ${requiredRatio}:1)`
          });
        } else {
          this.passedTests.push({
            type: 'color-contrast',
            element: element.tagName.toLowerCase(),
            selector: this.getSelector(element)
          });
        }
      }
    });
  }
  
  async testKeyboardNavigation() {
    const focusableElements = document.querySelectorAll(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    focusableElements.forEach((element, index) => {
      // Test if element can receive focus
      element.focus();
      if (document.activeElement !== element) {
        this.violations.push({
          type: 'keyboard-focus',
          element: element.tagName.toLowerCase(),
          selector: this.getSelector(element),
          message: 'Element cannot receive keyboard focus'
        });
      }
      
      // Test if element has visible focus indicator
      const styles = getComputedStyle(element, ':focus');
      const hasOutline = styles.outline !== 'none' && styles.outline !== '0px';
      const hasBoxShadow = styles.boxShadow !== 'none';
      
      if (!hasOutline && !hasBoxShadow) {
        this.violations.push({
          type: 'focus-indicator',
          element: element.tagName.toLowerCase(),
          selector: this.getSelector(element),
          message: 'No visible focus indicator'
        });
      }
    });
  }
  
  async testARIAImplementation() {
    // Test for missing ARIA labels
    const elementsNeedingLabels = document.querySelectorAll(
      'input:not([aria-label]):not([aria-labelledby]), ' +
      'button:not([aria-label]):not([aria-labelledby]):empty, ' +
      '[role="button"]:not([aria-label]):not([aria-labelledby]):empty'
    );
    
    elementsNeedingLabels.forEach(element => {
      this.violations.push({
        type: 'missing-aria-label',
        element: element.tagName.toLowerCase(),
        selector: this.getSelector(element),
        message: 'Element missing accessible name'
      });
    });
    
    // Test for invalid ARIA attributes
    const elementsWithARIA = document.querySelectorAll('[aria-expanded], [aria-checked], [aria-selected]');
    
    elementsWithARIA.forEach(element => {
      const ariaExpanded = element.getAttribute('aria-expanded');
      const ariaChecked = element.getAttribute('aria-checked');
      const ariaSelected = element.getAttribute('aria-selected');
      
      if (ariaExpanded && !['true', 'false'].includes(ariaExpanded)) {
        this.violations.push({
          type: 'invalid-aria-value',
          element: element.tagName.toLowerCase(),
          selector: this.getSelector(element),
          attribute: 'aria-expanded',
          value: ariaExpanded,
          message: 'Invalid aria-expanded value'
        });
      }
      
      // Similar checks for other ARIA attributes...
    });
  }
  
  calculateContrast(color1, color2) {
    const rgb1 = this.parseColor(color1);
    const rgb2 = this.parseColor(color2);
    
    const l1 = this.getRelativeLuminance(rgb1);
    const l2 = this.getRelativeLuminance(rgb2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }
  
  parseColor(color) {
    const div = document.createElement('div');
    div.style.color = color;
    document.body.appendChild(div);
    
    const rgbColor = getComputedStyle(div).color;
    document.body.removeChild(div);
    
    const matches = rgbColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    return matches ? [
      parseInt(matches[1]),
      parseInt(matches[2]),
      parseInt(matches[3])
    ] : [0, 0, 0];
  }
  
  getRelativeLuminance([r, g, b]) {
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }
  
  getSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) return `.${element.className.split(' ')[0]}`;
    return element.tagName.toLowerCase();
  }
  
  generateReport() {
    const totalTests = this.violations.length + this.passedTests.length;
    const passRate = totalTests > 0 ? (this.passedTests.length / totalTests * 100).toFixed(1) : 0;
    
    return {
      summary: {
        totalTests,
        passed: this.passedTests.length,
        failed: this.violations.length,
        passRate: `${passRate}%`
      },
      violations: this.violations,
      passed: this.passedTests
    };
  }
}

// Run accessibility tests
const tester = new AccessibilityTester();
tester.runTests().then(report => {
  console.log('Accessibility Test Report:', report);
  
  if (report.violations.length > 0) {
    console.warn('Accessibility violations found:', report.violations);
  }
});
```

### Manual Testing Checklist
```javascript
// Interactive testing guide
class AccessibilityTestingGuide {
  constructor() {
    this.tests = [
      {
        id: 'keyboard-navigation',
        title: 'Keyboard Navigation',
        steps: [
          'Navigate the entire interface using only the Tab key',
          'Verify all interactive elements can be reached',
          'Test Shift+Tab for reverse navigation',
          'Ensure focus indicators are visible',
          'Test Escape key to close modals/menus',
          'Test Enter and Space keys for activation'
        ]
      },
      {
        id: 'screen-reader',
        title: 'Screen Reader Testing',
        steps: [
          'Navigate with NVDA/JAWS/VoiceOver',
          'Test heading navigation (H key)',
          'Test landmark navigation (D key)',
          'Test form navigation (F key)',
          'Verify all content is announced',
          'Test live region announcements'
        ]
      },
      {
        id: 'zoom-resize',
        title: 'Zoom and Resize Testing',
        steps: [
          'Test 200% browser zoom',
          'Test 400% browser zoom for low vision',
          'Resize window to 320px width',
          'Verify no horizontal scrolling',
          'Test text-only zoom in browser',
          'Verify layout remains functional'
        ]
      }
    ];
  }
  
  generateTestingInterface() {
    const container = document.createElement('div');
    container.className = 'accessibility-testing-guide';
    container.innerHTML = `
      <h2>Accessibility Testing Guide</h2>
      <div class="test-sections">
        ${this.tests.map(test => `
          <section class="test-section">
            <h3>${test.title}</h3>
            <ul class="test-steps">
              ${test.steps.map((step, index) => `
                <li class="test-step">
                  <label>
                    <input type="checkbox" data-test="${test.id}" data-step="${index}">
                    <span class="step-text">${step}</span>
                  </label>
                </li>
              `).join('')}
            </ul>
          </section>
        `).join('')}
      </div>
      
      <div class="test-results">
        <button type="button" id="generate-report">Generate Test Report</button>
        <div id="test-report"></div>
      </div>
    `;
    
    this.setupEventListeners(container);
    return container;
  }
  
  setupEventListeners(container) {
    container.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox') {
        this.updateProgress();
      }
    });
    
    container.querySelector('#generate-report').addEventListener('click', () => {
      this.generateReport();
    });
  }
  
  updateProgress() {
    const checkboxes = document.querySelectorAll('.test-step input[type="checkbox"]');
    const checked = document.querySelectorAll('.test-step input[type="checkbox"]:checked');
    
    const progress = (checked.length / checkboxes.length) * 100;
    console.log(`Testing progress: ${progress.toFixed(1)}%`);
  }
  
  generateReport() {
    const results = {};
    
    this.tests.forEach(test => {
      const checkboxes = document.querySelectorAll(`input[data-test="${test.id}"]`);
      const completed = document.querySelectorAll(`input[data-test="${test.id}"]:checked`);
      
      results[test.id] = {
        title: test.title,
        completed: completed.length,
        total: checkboxes.length,
        percentage: (completed.length / checkboxes.length) * 100
      };
    });
    
    const reportDiv = document.getElementById('test-report');
    reportDiv.innerHTML = `
      <h3>Testing Report</h3>
      ${Object.entries(results).map(([id, result]) => `
        <div class="test-result">
          <strong>${result.title}:</strong> 
          ${result.completed}/${result.total} 
          (${result.percentage.toFixed(1)}%)
        </div>
      `).join('')}
    `;
  }
}
```

---

## ✅ **Accessibility Checklist**

### Pre-Launch Checklist
```markdown
## Content Accessibility
- [ ] All images have descriptive alt text
- [ ] Complex images have long descriptions
- [ ] Videos have captions and transcripts
- [ ] Audio content has transcripts
- [ ] Color is not the only way to convey information
- [ ] Text has sufficient contrast (4.5:1 minimum)
- [ ] Text can be resized to 200% without horizontal scrolling

## Structure and Navigation
- [ ] Page has proper heading hierarchy (h1, h2, h3...)
- [ ] All content can be accessed via keyboard
- [ ] Focus indicators are visible
- [ ] Skip links are provided
- [ ] Page landmarks are properly marked
- [ ] Navigation is consistent across pages

## Forms and Interactions
- [ ] All form controls have labels
- [ ] Required fields are clearly marked
- [ ] Error messages are descriptive and helpful
- [ ] Form validation is accessible
- [ ] Custom controls have appropriate ARIA attributes
- [ ] Interactive elements have sufficient size (44px minimum)

## Dynamic Content
- [ ] Live regions announce important changes
- [ ] Dynamic content doesn't cause seizures
- [ ] Auto-playing content can be paused
- [ ] Time limits can be extended or disabled
- [ ] Loading states are announced to screen readers

## Technical Implementation
- [ ] HTML validates without errors
- [ ] ARIA attributes are used correctly
- [ ] Page works without JavaScript
- [ ] Page works without CSS
- [ ] Automated accessibility tests pass
- [ ] Manual testing with screen readers completed
```

---

## 🔧 **Common Issues & Solutions**

### Issue: Poor Color Contrast
```css
/* Problem: Insufficient contrast */
.text-muted {
  color: #ccc; /* 2.3:1 contrast - FAIL */
}

/* Solution: Use darker color */
.text-muted {
  color: #6b7280; /* 4.69:1 contrast - PASS */
}

/* Alternative: Provide high contrast mode */
@media (prefers-contrast: high) {
  .text-muted {
    color: #374151; /* 7.59:1 contrast */
  }
}
```

### Issue: Inaccessible Custom Components
```javascript
// Problem: Custom dropdown without accessibility
class InaccessibleDropdown {
  constructor(element) {
    this.element = element;
    this.button = element.querySelector('button');
    this.menu = element.querySelector('.menu');
    
    // Only mouse events - BAD
    this.button.addEventListener('click', () => this.toggle());
  }
}

// Solution: Accessible dropdown
class AccessibleDropdown {
  constructor(element) {
    this.element = element;
    this.button = element.querySelector('button');
    this.menu = element.querySelector('.menu');
    this.items = this.menu.querySelectorAll('[role="menuitem"]');
    this.currentIndex = -1;
    
    this.setupAccessibility();
    this.setupEventListeners();
  }
  
  setupAccessibility() {
    // ARIA attributes
    this.button.setAttribute('aria-haspopup', 'true');
    this.button.setAttribute('aria-expanded', 'false');
    this.button.setAttribute('aria-controls', this.menu.id);
    
    this.menu.setAttribute('role', 'menu');
    this.menu.setAttribute('aria-labelledby', this.button.id);
    
    this.items.forEach(item => {
      item.setAttribute('role', 'menuitem');
      item.setAttribute('tabindex', '-1');
    });
  }
  
  setupEventListeners() {
    // Mouse and keyboard events
    this.button.addEventListener('click', () => this.toggle());
    this.button.addEventListener('keydown', (e) => this.handleButtonKeydown(e));
    this.menu.addEventListener('keydown', (e) => this.handleMenuKeydown(e));
    
    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target)) {
        this.close();
      }
    });
  }
  
  handleButtonKeydown(event) {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        this.open();
        this.focusFirstItem();
        break;
      case 'Escape':
        this.close();
        break;
    }
  }
  
  handleMenuKeydown(event) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.focusNextItem();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.focusPreviousItem();
        break;
      case 'Escape':
        this.close();
        this.button.focus();
        break;
      case 'Tab':
        this.close();
        break;
    }
  }
  
  open() {
    this.menu.hidden = false;
    this.button.setAttribute('aria-expanded', 'true');
    this.announceToScreenReader('Menu opened');
  }
  
  close() {
    this.menu.hidden = true;
    this.button.setAttribute('aria-expanded', 'false');
    this.currentIndex = -1;
  }
}
```

### Issue: Missing Form Labels
```html
<!-- Problem: Unlabeled form control -->
<input type="email" placeholder="Email address">

<!-- Solution 1: Explicit label -->
<label for="email">Email Address</label>
<input type="email" id="email" placeholder="Enter your email">

<!-- Solution 2: Implicit label -->
<label>
  Email Address
  <input type="email" placeholder="Enter your email">
</label>

<!-- Solution 3: ARIA label -->
<input type="email" 
       aria-label="Email address"
       placeholder="Enter your email">
```

### Issue: Inaccessible Data Visualization
```javascript
// Problem: Chart without alternative access
class InaccessibleChart {
  render(data) {
    // Only visual representation
    this.drawChart(data);
  }
}

// Solution: Multi-modal chart
class AccessibleChart {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.alternativeFormats = new Map();
  }
  
  render(data) {
    // Visual chart
    this.drawChart(data);
    
    // Alternative formats
    this.generateTextDescription(data);
    this.generateDataTable(data);
    this.generateSonification(data);
    
    // Keyboard navigation
    this.setupKeyboardNavigation();
    
    // Screen reader announcements
    this.announceChartUpdate(data);
  }
  
  generateTextDescription(data) {
    const description = this.createTextDescription(data);
    const descElement = document.createElement('div');
    descElement.className = 'chart-description visually-hidden';
    descElement.textContent = description;
    descElement.id = `${this.container.id}-description`;
    
    this.container.appendChild(descElement);
    this.container.setAttribute('aria-describedby', descElement.id);
  }
  
  generateDataTable(data) {
    const table = this.createDataTable(data);
    table.className = 'chart-data-table visually-hidden';
    table.setAttribute('aria-label', 'Chart data in table format');
    
    this.container.appendChild(table);
    this.alternativeFormats.set('table', table);
  }
  
  setupKeyboardNavigation() {
    this.container.setAttribute('tabindex', '0');
    this.container.setAttribute('role', 'img');
    this.container.setAttribute('aria-label', 'Interactive chart');
    
    this.container.addEventListener('keydown', (e) => {
      switch (e.key) {
        case 't':
          this.toggleDataTable();
          break;
        case 'd':
          this.announceDescription();
          break;
        case 's':
          this.playSonification();
          break;
      }
    });
  }
  
  announceChartUpdate(data) {
    const summary = this.generateSummary(data);
    this.announceToScreenReader(summary);
  }
}
```

---

## 📚 **Resources & Tools**

### Testing Tools
- **WAVE (Web Accessibility Evaluation Tool)**: Browser extension for accessibility testing
- **axe-core**: Automated accessibility testing library
- **Lighthouse**: Built-in accessibility audit in Chrome DevTools
- **Color Contrast Analyzers**: TPGi CCA, WebAIM Contrast Checker
- **Screen Readers**: NVDA (free), JAWS, VoiceOver (macOS/iOS)

### Guidelines & Standards
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)

### Implementation Resources
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [GOV.UK Design System](https://design-system.service.gov.uk/)
- [Inclusive Components](https://inclusive-components.design/)

---

*Building for everyone, excluding no one. ♿*