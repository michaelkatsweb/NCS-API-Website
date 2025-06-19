# Contributing to NCS-API Website

> **Welcome! We're excited you want to contribute to the NCS-API Website project.**

This guide will help you understand our development process, coding standards, and how to make meaningful contributions to the project.

## 📋 **Table of Contents**

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [How to Contribute](#how-to-contribute)
4. [Coding Standards](#coding-standards)
5. [Pull Request Process](#pull-request-process)
6. [Issue Guidelines](#issue-guidelines)
7. [Code Review Process](#code-review-process)
8. [Community Guidelines](#community-guidelines)
9. [Recognition](#recognition)
10. [Getting Help](#getting-help)

---

## 🚀 **Getting Started**

### Ways to Contribute
We welcome all types of contributions:

- 🐛 **Bug Reports** - Help us identify and fix issues
- 💡 **Feature Requests** - Suggest new functionality
- 📝 **Documentation** - Improve our guides and examples
- 🎨 **Design** - Enhance UI/UX and visual design
- 🧪 **Testing** - Add tests and improve coverage
- 🔧 **Code** - Implement features and fix bugs
- 🌍 **Translation** - Help make the project accessible globally
- 📚 **Examples** - Create tutorials and use case demos

### Prerequisites
Before contributing, make sure you have:

- **Git** installed and configured
- **Node.js** 16+ and **npm** 8+
- A **GitHub account** for collaboration
- Basic knowledge of **JavaScript**, **HTML**, and **CSS**
- Understanding of **accessibility principles** (preferred)

### Quick Start
```bash
# 1. Fork the repository on GitHub
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/NCS-API-Website.git
cd NCS-API-Website

# 3. Add upstream remote
git remote add upstream https://github.com/michaelkatsweb/NCS-API-Website.git

# 4. Install dependencies
npm install

# 5. Start development server
npm run dev

# 6. Open http://localhost:3000 in your browser
```

---

## 🛠️ **Development Setup**

### Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Configure your environment
# .env.local
NODE_ENV=development
NCS_API_BASE_URL=http://localhost:8000/api/v1
ENABLE_DEBUG=true
ENABLE_HOT_RELOAD=true
```

### Development Commands
```bash
# Start development server
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Build for production
npm run build

# Run accessibility tests
npm run test:a11y

# Validate everything
npm run validate
```

### IDE Setup (VS Code Recommended)
```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["javascript", "html"],
  "editor.rulers": [100],
  "files.eol": "\n"
}
```

**Recommended Extensions:**
- ESLint
- Prettier
- Auto Rename Tag
- Bracket Pair Colorizer
- GitLens
- Live Server

---

## 💻 **How to Contribute**

### 1. Choose an Issue
- Browse [open issues](https://github.com/michaelkatsweb/NCS-API-Website/issues)
- Look for `good first issue` or `help wanted` labels
- Check the [project roadmap](https://github.com/michaelkatsweb/NCS-API-Website/projects)
- Comment on an issue to express interest

### 2. Create a Branch
```bash
# Update your main branch
git checkout main
git pull upstream main

# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-123-bug-description
```

### 3. Make Your Changes
- Write clean, well-documented code
- Follow our [coding standards](#coding-standards)
- Add tests for new functionality
- Update documentation as needed
- Ensure accessibility compliance

### 4. Test Your Changes
```bash
# Run all tests
npm test

# Test specific functionality
npm run test:unit
npm run test:integration
npm run test:e2e

# Check accessibility
npm run test:a11y

# Validate code quality
npm run lint
npm run format:check
```

### 5. Commit Your Changes
```bash
# Stage your changes
git add .

# Commit with descriptive message
git commit -m "feat: add clustering algorithm comparison chart

- Add interactive comparison chart component
- Include performance metrics visualization
- Add keyboard navigation support
- Update documentation with usage examples

Fixes #123"
```

### 6. Submit a Pull Request
```bash
# Push your branch
git push origin feature/your-feature-name

# Create pull request on GitHub
# Include description, screenshots, and testing notes
```

---

## 📋 **Coding Standards**

### JavaScript Style Guide
```javascript
// Use modern ES6+ syntax
const clusterData = async (data, algorithm) => {
  try {
    const result = await apiClient.cluster({ data, algorithm });
    return result;
  } catch (error) {
    console.error('Clustering failed:', error);
    throw error;
  }
};

// Use descriptive variable names
const customerSegmentationResults = await clusterData(customerData, 'kmeans');

// Document complex functions
/**
 * Calculates silhouette score for clustering quality assessment
 * @param {Array} data - Array of data points
 * @param {Array} clusters - Cluster assignments for each point
 * @returns {number} Silhouette score between -1 and 1
 */
function calculateSilhouetteScore(data, clusters) {
  // Implementation...
}

// Use consistent error handling
class ClusteringError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'ClusteringError';
    this.code = code;
    this.details = details;
  }
}

// Prefer composition over inheritance
const withLogging = (component) => {
  return {
    ...component,
    log: (message) => console.log(`[${component.name}] ${message}`)
  };
};
```

### CSS Guidelines
```css
/* Use BEM methodology for class names */
.cluster-visualizer {
  display: grid;
  grid-template-areas: 
    "controls"
    "chart"
    "legend";
}

.cluster-visualizer__controls {
  grid-area: controls;
  padding: var(--spacing-md);
}

.cluster-visualizer__chart {
  grid-area: chart;
  min-height: 400px;
}

.cluster-visualizer__legend {
  grid-area: legend;
}

/* Use CSS custom properties for theming */
.chart-container {
  --chart-bg: var(--color-surface);
  --chart-border: var(--color-border);
  --chart-text: var(--color-text-primary);
  
  background: var(--chart-bg);
  border: 1px solid var(--chart-border);
  color: var(--chart-text);
}

/* Mobile-first responsive design */
.responsive-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

@media (min-width: 768px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Ensure accessibility */
.btn {
  min-height: 44px; /* Touch target size */
  min-width: 44px;
}

.btn:focus {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}
```

### HTML Best Practices
```html
<!-- Use semantic HTML -->
<main role="main" aria-labelledby="page-title">
  <h1 id="page-title">Clustering Playground</h1>
  
  <section aria-labelledby="upload-heading">
    <h2 id="upload-heading">Data Upload</h2>
    
    <form role="form" aria-labelledby="upload-form-title">
      <fieldset>
        <legend id="upload-form-title">Upload Your Dataset</legend>
        
        <div class="form-group">
          <label for="file-input">Choose File</label>
          <input type="file" 
                 id="file-input" 
                 accept=".csv,.json,.xlsx"
                 aria-describedby="file-help">
          <div id="file-help" class="help-text">
            Supported formats: CSV, JSON, Excel
          </div>
        </div>
      </fieldset>
    </form>
  </section>
</main>

<!-- Include proper meta tags -->
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Interactive clustering analysis tool">
  <title>Clustering Playground - NCS-API</title>
</head>
```

### Component Architecture
```javascript
// Follow consistent component structure
export class ClusteringComponent {
  constructor(container, options = {}) {
    this.container = container;
    this.options = { ...this.defaultOptions, ...options };
    this.state = this.getInitialState();
    this.eventBus = new EventBus();
    
    this.init();
  }
  
  get defaultOptions() {
    return {
      algorithm: 'kmeans',
      autoStart: false,
      enableAnimation: true
    };
  }
  
  getInitialState() {
    return {
      data: null,
      clusters: null,
      isProcessing: false,
      error: null
    };
  }
  
  init() {
    this.validateContainer();
    this.render();
    this.setupEventListeners();
    this.setupAccessibility();
    
    if (this.options.autoStart) {
      this.start();
    }
  }
  
  render() {
    this.container.innerHTML = this.getTemplate();
    this.updateDisplay();
  }
  
  getTemplate() {
    return `
      <div class="clustering-component">
        <div class="component-header">
          <h3>${this.options.title || 'Clustering Analysis'}</h3>
        </div>
        <div class="component-content">
          <!-- Component content -->
        </div>
      </div>
    `;
  }
  
  setupEventListeners() {
    // Event listener setup
  }
  
  setupAccessibility() {
    this.container.setAttribute('role', 'region');
    this.container.setAttribute('aria-label', 'Clustering component');
  }
  
  updateState(newState) {
    this.state = { ...this.state, ...newState };
    this.updateDisplay();
    this.eventBus.emit('state:change', this.state);
  }
  
  destroy() {
    this.eventBus.removeAllListeners();
    this.container.innerHTML = '';
  }
}
```

### Testing Standards
```javascript
// Write comprehensive tests
import { ClusteringComponent } from '../components/ClusteringComponent.js';
import { TestFramework } from './TestFramework.js';

TestFramework.describe('ClusteringComponent', () => {
  let component;
  let container;
  
  TestFramework.beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });
  
  TestFramework.afterEach(() => {
    if (component) {
      component.destroy();
    }
    document.body.removeChild(container);
  });
  
  TestFramework.test('should initialize with default options', () => {
    component = new ClusteringComponent(container);
    
    TestFramework.expect(component.options.algorithm).toBe('kmeans');
    TestFramework.expect(component.options.autoStart).toBe(false);
  });
  
  TestFramework.test('should render correctly', () => {
    component = new ClusteringComponent(container, {
      title: 'Test Component'
    });
    
    const header = container.querySelector('.component-header h3');
    TestFramework.expect(header.textContent).toBe('Test Component');
  });
  
  TestFramework.test('should handle data clustering', async () => {
    component = new ClusteringComponent(container);
    
    const testData = [
      { x: 1, y: 2 },
      { x: 3, y: 4 },
      { x: 5, y: 6 }
    ];
    
    const result = await component.clusterData(testData);
    
    TestFramework.expect(result.clusters).toBeDefined();
    TestFramework.expect(result.clusters.length).toBe(testData.length);
  });
  
  TestFramework.test('should be accessible', () => {
    component = new ClusteringComponent(container);
    
    TestFramework.expect(container.getAttribute('role')).toBe('region');
    TestFramework.expect(container.getAttribute('aria-label')).toBeTruthy();
  });
});
```

---

## 🔄 **Pull Request Process**

### Before Submitting
- [ ] Code follows our style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Linting passes (`npm run lint`)
- [ ] Accessibility tests pass (`npm run test:a11y`)
- [ ] Documentation is updated
- [ ] Commits are well-formatted
- [ ] Branch is up to date with main

### Pull Request Template
```markdown
## Description
Brief description of what this PR does.

## Changes Made
- List specific changes
- Include any breaking changes
- Mention related issues

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Accessibility testing done

## Screenshots (if applicable)
Add screenshots for UI changes.

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added for new features
- [ ] All CI checks pass

## Related Issues
Fixes #123
Closes #456
```

### Review Process
1. **Automated Checks** - CI/CD pipeline runs tests
2. **Code Review** - Maintainers review code quality
3. **Accessibility Review** - Check for accessibility compliance
4. **Performance Review** - Evaluate performance impact
5. **Documentation Review** - Ensure docs are updated
6. **Approval** - At least one maintainer approval required
7. **Merge** - Squash and merge to main branch

### Addressing Feedback
```bash
# Make requested changes
git add .
git commit -m "fix: address code review feedback

- Improve error handling in clustering component
- Add missing accessibility attributes
- Update component documentation"

# Push updates to your branch
git push origin feature/your-feature-name
```

---

## 🐛 **Issue Guidelines**

### Bug Reports
Use our bug report template:

```markdown
**Bug Description**
A clear description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Actual Behavior**
What actually happened.

**Screenshots**
Add screenshots if applicable.

**Environment**
- OS: [e.g. Windows 10, macOS Big Sur]
- Browser: [e.g. Chrome 95, Firefox 94]
- Device: [e.g. Desktop, iPhone 12]
- Screen Reader: [if applicable]

**Additional Context**
Any other context about the problem.
```

### Feature Requests
```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Use Case**
Describe the problem this feature would solve.

**Proposed Solution**
Describe how you envision this feature working.

**Alternatives Considered**
Describe any alternative solutions you've considered.

**Additional Context**
Add any other context about the feature request.

**Would you be willing to implement this?**
[ ] Yes, I can work on this
[ ] Yes, with some guidance
[ ] No, but I can help test
[ ] No, but I'd like to see it implemented
```

### Issue Labels
We use these labels to categorize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `good first issue` - Great for newcomers
- `help wanted` - Extra attention needed
- `documentation` - Improvements to docs
- `accessibility` - Accessibility-related
- `performance` - Performance improvements
- `security` - Security-related
- `breaking-change` - Introduces breaking changes
- `priority:high` - High priority issue
- `priority:medium` - Medium priority issue
- `priority:low` - Low priority issue

---

## 👥 **Code Review Process**

### What We Look For

#### Code Quality
- Clean, readable code
- Proper error handling
- Performance considerations
- Security best practices
- Test coverage

#### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation
- Screen reader compatibility
- Color contrast
- Semantic HTML

#### Design Consistency
- Follows design system
- Responsive design
- Consistent UX patterns
- Proper animations

#### Documentation
- Code comments where needed
- Updated documentation
- Clear commit messages
- PR description

### Review Timeline
- **Initial Review**: Within 2-3 business days
- **Follow-up**: Within 1-2 business days
- **Approval**: When all requirements are met

### Becoming a Reviewer
Interested in helping with code reviews? We welcome experienced contributors to join our review team:

1. **Contribute Regularly** - Submit quality PRs consistently
2. **Show Expertise** - Demonstrate knowledge in relevant areas
3. **Help Others** - Participate in discussions and help newcomers
4. **Express Interest** - Let us know you'd like to help review

---

## 🌟 **Community Guidelines**

### Code of Conduct
We are committed to providing a welcoming and inclusive experience for everyone. By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

### Core Values
- **Inclusivity** - Everyone is welcome regardless of background
- **Respect** - Treat others with kindness and professionalism
- **Collaboration** - Work together towards common goals
- **Quality** - Strive for excellence in everything we do
- **Learning** - Support each other's growth and development

### Communication Channels
- **GitHub Issues** - Bug reports and feature requests
- **GitHub Discussions** - General questions and ideas
- **Discord** - Real-time chat and community support
- **Email** - Private concerns (contributing@ncs-clustering.com)

### Best Practices
- Be patient with newcomers
- Provide constructive feedback
- Share knowledge and resources
- Celebrate others' contributions
- Ask questions when unsure

---

## 🏆 **Recognition**

### Contributors
We recognize and celebrate all contributions:

- **Contributors List** - All contributors listed in README
- **Release Notes** - Contributors mentioned in release notes
- **Social Media** - Highlighting contributions on social platforms
- **Contributor Spotlight** - Monthly feature in newsletter

### Special Recognition
- **First-time Contributors** - Welcome package and special mention
- **Top Contributors** - Annual recognition program
- **Mentors** - Special recognition for helping newcomers
- **Long-term Contributors** - Invitation to join maintainer team

### Contribution Types
We value all types of contributions:
- 💻 Code
- 📖 Documentation
- 🎨 Design
- 🐛 Bug reports
- 💡 Ideas
- 🤔 Answering questions
- 📝 Tutorials
- 🌍 Translation
- 🔍 Reviews

---

## ❓ **Getting Help**

### Where to Get Help
1. **Documentation** - Check our [docs folder](./docs/)
2. **GitHub Discussions** - Ask questions in discussions
3. **Discord Community** - Join our Discord server
4. **Stack Overflow** - Tag questions with `ncs-api`
5. **Email Support** - contributing@ncs-clustering.com

### Common Questions

**Q: I'm new to open source. How do I start?**
A: Start with issues labeled `good first issue`. Read our documentation and don't hesitate to ask questions!

**Q: How long does it take for my PR to be reviewed?**
A: We aim to provide initial feedback within 2-3 business days.

**Q: Can I work on multiple issues at once?**
A: We recommend focusing on one issue at a time, especially when starting out.

**Q: What if I can't finish what I started?**
A: No problem! Let us know in the issue comments, and we can help or reassign it.

**Q: How do I set up the development environment?**
A: Follow our [Development Setup](#development-setup) guide above.

### Mentorship Program
New to contributing? We offer mentorship for newcomers:
- Paired with experienced contributors
- Guided through first contribution
- Regular check-ins and support
- Help with code reviews

Interested? Comment on a `good first issue` and mention you'd like a mentor!

---

## 📚 **Additional Resources**

### Learning Resources
- [Git Handbook](https://guides.github.com/introduction/git-handbook/)
- [JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)
- [Accessibility Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Testing Best Practices](https://jestjs.io/docs/getting-started)

### Project-Specific Resources
- [Architecture Documentation](./DEVELOPMENT.md)
- [API Integration Guide](./API_INTEGRATION.md)
- [Performance Guidelines](./PERFORMANCE.md)
- [Accessibility Standards](./ACCESSIBILITY.md)
- [Deployment Guide](./DEPLOYMENT.md)

### Tools and Extensions
- [VS Code](https://code.visualstudio.com/) - Recommended editor
- [GitHub Desktop](https://desktop.github.com/) - Git GUI
- [Postman](https://www.postman.com/) - API testing
- [Figma](https://www.figma.com/) - Design collaboration

---

## 📞 **Contact**

### Maintainers
- **Michael Kats** - [@michaelkatsweb](https://github.com/michaelkatsweb)
- **NCS-API Team** - [@ncs-api](https://github.com/ncs-api)

### Communication
- **General Questions**: [GitHub Discussions](https://github.com/michaelkatsweb/NCS-API-Website/discussions)
- **Bugs & Features**: [GitHub Issues](https://github.com/michaelkatsweb/NCS-API-Website/issues)
- **Security Issues**: security@ncs-clustering.com
- **General Inquiries**: contributing@ncs-clustering.com

### Social Media
- **Twitter**: [@ncs_api](https://twitter.com/ncs_api)
- **LinkedIn**: [NCS-API](https://linkedin.com/company/ncs-api)
- **YouTube**: [NCS-API Channel](https://youtube.com/@ncs-api)

---

**Thank you for contributing to NCS-API Website! Together, we're building something amazing.** ✨

*Last updated: January 2025*