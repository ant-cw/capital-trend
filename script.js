
// Global state management
let currentUser = null;
let isAdmin = false;
let articles = [];
let cmsArticles = [];
let currentView = 'home';
let isDarkMode = false;

// Netlify Identity integration
if (window.netlifyIdentity) {
  window.netlifyIdentity.on("init", user => {
    if (!user) {
      window.netlifyIdentity.on("login", () => {
        document.location.href = "/admin/";
      });
    }
  });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadStoredData();
    setupEventListeners();
    loadSampleArticles();
    loadCMSArticles();
    checkTheme();
    
    // Set up periodic refresh to check for new CMS articles (every 5 minutes)
    setInterval(() => {
        console.log('Checking for new CMS articles...');
        loadCMSArticles();
    }, 5 * 60 * 1000);
}

// Load data from localStorage
function loadStoredData() {
    const storedArticles = localStorage.getItem('capitalTrendArticles');
    if (storedArticles) {
        articles = JSON.parse(storedArticles);
    }
    
    const storedTheme = localStorage.getItem('capitalTrendTheme');
    if (storedTheme === 'dark') {
        isDarkMode = true;
        document.body.setAttribute('data-theme', 'dark');
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('capitalTrendArticles', JSON.stringify(articles));
}

// Setup all event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Mobile menu toggle
    document.getElementById('mobileMenuToggle').addEventListener('click', toggleMobileMenu);
    
    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);
    
    // Search functionality
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Archive filters
    document.getElementById('categoryFilter').addEventListener('change', filterArchive);
    document.getElementById('dateFilter').addEventListener('change', filterArchive);
    
    // Admin dashboard
    document.getElementById('logoutBtn').addEventListener('click', signOut);
    document.getElementById('articleForm').addEventListener('submit', handleArticleSubmission);
    
    // File upload handling
    document.getElementById('imageUpload').addEventListener('change', handleFileUpload);
    document.getElementById('pdfUpload').addEventListener('change', handleFileUpload);
    document.getElementById('docsLink').addEventListener('input', handleDocsLink);
    
    // Firebase Authentication event listeners
    document.getElementById('signUpBtn').addEventListener('click', signUp);
    document.getElementById('signInBtn').addEventListener('click', signIn);
    document.getElementById('sendVerificationBtn').addEventListener('click', sendVerification);
    document.getElementById('signOutBtn').addEventListener('click', signOut);
    
    // Article modal event listeners
    document.getElementById('closeArticleModal').addEventListener('click', closeArticleModal);
    document.getElementById('articleModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeArticleModal();
        }
    });
    
    // Make auth state handler globally available
    window.handleAuthStateChange = handleAuthStateChange;
}

// Navigation handling
function handleNavigation(e) {
    e.preventDefault();
    const targetSection = e.target.getAttribute('href').substring(1);
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Show target section
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(targetSection).classList.add('active');
    
    currentView = targetSection;
    
    // Load appropriate content
    if (targetSection === 'archive') {
        renderArchive();
    }
    
    // Close mobile menu if open
    document.querySelector('.nav-list').classList.remove('show');
}

function toggleMobileMenu() {
    document.querySelector('.nav-list').classList.toggle('show');
}

// Theme management
function toggleTheme() {
    isDarkMode = !isDarkMode;
    const themeToggle = document.getElementById('themeToggle');
    
    if (isDarkMode) {
        document.body.setAttribute('data-theme', 'dark');
        themeToggle.textContent = '☀️';
        localStorage.setItem('capitalTrendTheme', 'dark');
    } else {
        document.body.removeAttribute('data-theme');
        themeToggle.textContent = '🌙';
        localStorage.setItem('capitalTrendTheme', 'light');
    }
}

function checkTheme() {
    const themeToggle = document.getElementById('themeToggle');
    if (isDarkMode) {
        themeToggle.textContent = '☀️';
    } else {
        themeToggle.textContent = '🌙';
    }
}

// Admin functionality
function handleAuthStateChange(user) {
    if (user && user.email === 'kcw01280420@gmail.com') {
        currentUser = user;
        isAdmin = true;
        showAdminDashboard();
        showAuthStatus(`Admin access granted. Welcome, ${user.email}`, 'success');
    } else if (user) {
        currentUser = user;
        isAdmin = false;
        hideAdminDashboard();
        showAuthStatus(`Signed in as ${user.email}`, 'success');
    } else {
        currentUser = null;
        isAdmin = false;
        hideAdminDashboard();
    }
}

function showAdminDashboard() {
    if (isAdmin) {
        document.getElementById('adminDashboard').classList.remove('hidden');
        loadAdminArticles();
    }
}

function hideAdminDashboard() {
    document.getElementById('adminDashboard').classList.add('hidden');
}

function signOut() {
    window.signOutUser(window.firebaseAuth).then(() => {
        showAuthStatus('Signed out successfully', 'success');
    }).catch((error) => {
        showAuthStatus(`Sign out failed: ${error.message}`, 'error');
    });
}

// Article management
function handleArticleSubmission(e) {
    e.preventDefault();
    
    const title = document.getElementById('articleTitle').value;
    const category = document.getElementById('articleCategory').value;
    const content = document.getElementById('articleContent').value;
    
    const article = {
        id: Date.now(),
        title: title,
        category: category,
        content: content,
        excerpt: content.substring(0, 150) + '...',
        date: new Date().toISOString(),
        attachments: getAttachments()
    };
    
    articles.unshift(article);
    saveData();
    
    // Reset form
    document.getElementById('articleForm').reset();
    document.getElementById('attachmentsPreview').innerHTML = '';
    
    // Refresh displays
    renderArticles();
    loadAdminArticles();
    
    alert('Article published successfully!');
}

function getAttachments() {
    const attachments = [];
    const preview = document.getElementById('attachmentsPreview');
    const attachmentElements = preview.querySelectorAll('.attachment-preview');
    
    attachmentElements.forEach(element => {
        const type = element.dataset.type;
        const name = element.dataset.name;
        const url = element.dataset.url || '#';
        
        attachments.push({
            type: type,
            name: name,
            url: url
        });
    });
    
    return attachments;
}

// File upload handling (simulated)
function handleFileUpload(e) {
    const files = Array.from(e.target.files);
    const fileType = e.target.id === 'imageUpload' ? 'image' : 'pdf';
    
    files.forEach(file => {
        addAttachmentPreview(fileType, file.name, URL.createObjectURL(file));
    });
}

function handleDocsLink(e) {
    const url = e.target.value;
    if (url && url.includes('docs.google.com')) {
        const fileName = 'Google Doc: ' + url.split('/').pop();
        addAttachmentPreview('docs', fileName, url);
        e.target.value = '';
    }
}

function addAttachmentPreview(type, name, url) {
    const preview = document.getElementById('attachmentsPreview');
    const attachmentDiv = document.createElement('div');
    attachmentDiv.className = 'attachment-preview';
    attachmentDiv.dataset.type = type;
    attachmentDiv.dataset.name = name;
    attachmentDiv.dataset.url = url;
    
    const typeIcon = {
        'image': '🖼️',
        'pdf': '📄',
        'docs': '📝'
    };
    
    attachmentDiv.innerHTML = `
        <span>${typeIcon[type]} ${name}</span>
        <button type="button" onclick="removeAttachment(this)">×</button>
    `;
    
    preview.appendChild(attachmentDiv);
}

function removeAttachment(button) {
    button.parentElement.remove();
}

// Article rendering
function renderArticles() {
    const grid = document.getElementById('articlesGrid');
    
    // Combine CMS articles and sample articles
    const allArticles = [...cmsArticles, ...articles];
    
    // Sort by date (newest first)
    allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const visibleArticles = allArticles.slice(0, 6); // Show latest 6 articles on home
    
    grid.innerHTML = visibleArticles.map(article => createArticleHTML(article)).join('');
}

function renderArchive() {
    const grid = document.getElementById('archiveGrid');
    
    // Combine CMS articles and sample articles
    const allArticles = [...cmsArticles, ...articles];
    
    // Sort by date (newest first)
    allArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    grid.innerHTML = allArticles.map(article => createArticleHTML(article)).join('');
}

function createArticleHTML(article) {
    const date = new Date(article.date).toLocaleDateString();
    const attachmentsHTML = article.attachments && article.attachments.length > 0 
        ? `<div class="article-attachments">
            ${article.attachments.map(att => 
                `<a href="${att.url}" class="attachment-badge" target="_blank">${att.name}</a>`
            ).join('')}
           </div>`
        : '';
    
    const clickHandler = article.isCMS ? `onclick="openArticleModal(${JSON.stringify(article).replace(/"/g, '&quot;')})"` : '';
    
    return `
        <article class="article-card ${article.isCMS ? 'cms-article' : ''}" ${clickHandler}>
            <div class="article-meta">
                <span class="article-category">${article.category}</span>
                <span class="article-date">${date}</span>
                ${article.author && article.isCMS ? `<span class="article-author">By ${article.author}</span>` : ''}
            </div>
            <h3 class="article-title">${article.title}</h3>
            <p class="article-excerpt">${article.excerpt}</p>
            ${attachmentsHTML}
            ${article.isCMS ? '<div class="cms-badge">CMS Article</div>' : ''}
        </article>
    `;
}

function loadAdminArticles() {
    const container = document.getElementById('adminArticlesList');
    
    container.innerHTML = articles.map(article => `
        <div class="article-card">
            <div class="article-meta">
                <span class="article-category">${article.category}</span>
                <span class="article-date">${new Date(article.date).toLocaleDateString()}</span>
            </div>
            <h3 class="article-title">${article.title}</h3>
            <p class="article-excerpt">${article.excerpt}</p>
            <div class="article-edit-controls">
                <button class="edit-btn" onclick="editArticle(${article.id})">Edit</button>
                <button class="delete-btn" onclick="deleteArticle(${article.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function editArticle(id) {
    const article = articles.find(a => a.id === id);
    if (article) {
        document.getElementById('articleTitle').value = article.title;
        document.getElementById('articleCategory').value = article.category;
        document.getElementById('articleContent').value = article.content;
        
        // Scroll to form
        document.getElementById('articleForm').scrollIntoView({ behavior: 'smooth' });
        
        // Remove the article to be replaced
        deleteArticle(id, false);
    }
}

function deleteArticle(id, confirm = true) {
    if (confirm && !window.confirm('Are you sure you want to delete this article?')) {
        return;
    }
    
    articles = articles.filter(a => a.id !== id);
    saveData();
    renderArticles();
    loadAdminArticles();
    
    if (confirm) {
        alert('Article deleted successfully!');
    }
}

// Search functionality
function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase();
    
    if (!query) {
        renderArticles();
        return;
    }
    
    // Search both CMS and sample articles
    const allArticles = [...cmsArticles, ...articles];
    const filteredArticles = allArticles.filter(article => 
        article.title.toLowerCase().includes(query) ||
        article.content.toLowerCase().includes(query) ||
        article.category.toLowerCase().includes(query)
    );
    
    const grid = document.getElementById('articlesGrid');
    grid.innerHTML = filteredArticles.map(article => createArticleHTML(article)).join('');
    
    if (filteredArticles.length === 0) {
        grid.innerHTML = '<p>No articles found matching your search.</p>';
    }
}

// Archive filtering
function filterArchive() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const dateFilter = document.getElementById('dateFilter').value;
    
    // Filter both CMS and sample articles
    const allArticles = [...cmsArticles, ...articles];
    let filteredArticles = [...allArticles];
    
    // Filter by category
    if (categoryFilter) {
        filteredArticles = filteredArticles.filter(article => 
            article.category === categoryFilter
        );
    }
    
    // Filter by date
    if (dateFilter) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        filteredArticles = filteredArticles.filter(article => {
            const articleDate = new Date(article.date);
            
            switch (dateFilter) {
                case 'today':
                    return articleDate >= today;
                case 'week':
                    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return articleDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                    return articleDate >= monthAgo;
                default:
                    return true;
            }
        });
    }
    
    const grid = document.getElementById('archiveGrid');
    grid.innerHTML = filteredArticles.map(article => createArticleHTML(article)).join('');
    
    if (filteredArticles.length === 0) {
        grid.innerHTML = '<p>No articles found with the selected filters.</p>';
    }
}

// Load CMS articles from content/articles directory
async function loadCMSArticles() {
    try {
        console.log('Loading CMS articles from GitHub...');
        
        // GitHub API endpoint for content/articles directory
        const response = await fetch('https://api.github.com/repos/ant-cw/capital-trend/contents/content/articles', {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'capital-trend-website'
            }
        });
        
        if (!response.ok) {
            console.log('GitHub API response not ok:', response.status, response.statusText);
            if (response.status === 403) {
                console.log('Rate limit exceeded, trying direct file access...');
                await loadCMSArticlesDirect();
                return;
            }
            renderArticles();
            return;
        }
        
        const files = await response.json();
        console.log('Found files:', files.map(f => f.name));
        
        // Filter for markdown files only, exclude .gitkeep
        const markdownFiles = files.filter(file => 
            file.name.endsWith('.md') && 
            file.name !== '.gitkeep' && 
            file.type === 'file'
        );
        
        console.log('Markdown files to load:', markdownFiles.map(f => f.name));
        
        if (markdownFiles.length === 0) {
            console.log('No markdown files found in content/articles/');
            renderArticles();
            return;
        }
        
        // Load each markdown file
        const articlePromises = markdownFiles.map(async (file) => {
            try {
                console.log(`Loading article: ${file.name}`);
                const fileResponse = await fetch(file.download_url);
                
                if (!fileResponse.ok) {
                    console.error(`Failed to load ${file.name}:`, fileResponse.status);
                    return null;
                }
                
                const content = await fileResponse.text();
                const article = parseMarkdownArticle(content, file.name);
                console.log(`Successfully parsed: ${article.title}`);
                return article;
            } catch (error) {
                console.error(`Error loading article ${file.name}:`, error);
                return null;
            }
        });
        
        const loadedArticles = await Promise.all(articlePromises);
        cmsArticles = loadedArticles.filter(article => article !== null);
        
        console.log(`Successfully loaded ${cmsArticles.length} CMS articles`);
        
        // Sort by date (newest first)
        cmsArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        renderArticles();
    } catch (error) {
        console.error('Error loading CMS articles:', error);
        // Fallback to direct file access
        await loadCMSArticlesDirect();
    }
}

// Fallback method to load known articles directly
async function loadCMSArticlesDirect() {
    console.log('Attempting direct file access...');
    const knownFiles = ['sample-cms-article.md'];
    const articlePromises = knownFiles.map(async (filename) => {
        try {
            const response = await fetch(`https://raw.githubusercontent.com/ant-cw/capital-trend/main/content/articles/${filename}`);
            if (response.ok) {
                const content = await response.text();
                return parseMarkdownArticle(content, filename);
            }
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
        }
        return null;
    });
    
    const loadedArticles = await Promise.all(articlePromises);
    cmsArticles = loadedArticles.filter(article => article !== null);
    
    // Sort by date (newest first)
    cmsArticles.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    renderArticles();
}

function parseMarkdownArticle(content, filename) {
    try {
        // Split frontmatter and content
        const parts = content.split('---');
        let frontmatter = {};
        let markdownContent = content;
        
        // Check if content has frontmatter (starts with ---)
        if (content.startsWith('---') && parts.length >= 3) {
            const frontmatterText = parts[1];
            markdownContent = parts.slice(2).join('---').trim();
            
            // Parse YAML frontmatter
            frontmatterText.split('\n').forEach(line => {
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    const key = line.substring(0, colonIndex).trim();
                    const value = line.substring(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
                    if (key && value) {
                        frontmatter[key] = value;
                    }
                }
            });
        }
        
        // Ensure marked is available
        if (typeof marked === 'undefined') {
            console.error('Marked library not loaded');
            return null;
        }
        
        // Convert markdown to HTML
        const htmlContent = marked.parse(markdownContent);
        
        // Create excerpt from HTML content
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        const textContent = tempDiv.textContent || tempDiv.innerText || '';
        const excerpt = textContent.substring(0, 150) + (textContent.length > 150 ? '...' : '');
        
        // Generate a readable title from filename if not provided
        const defaultTitle = filename
            .replace('.md', '')
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        
        // Parse date more robustly
        let articleDate = new Date().toISOString();
        if (frontmatter.date) {
            const parsedDate = new Date(frontmatter.date);
            if (!isNaN(parsedDate.getTime())) {
                articleDate = parsedDate.toISOString();
            }
        }
        
        const article = {
            id: filename.replace('.md', ''),
            title: frontmatter.title || defaultTitle,
            category: frontmatter.category || 'news',
            content: htmlContent,
            excerpt: excerpt,
            date: articleDate,
            author: frontmatter.author || 'Capital Trend',
            isCMS: true
        };
        
        console.log(`Parsed article: ${article.title} (${article.date})`);
        return article;
        
    } catch (error) {
        console.error(`Error parsing markdown article ${filename}:`, error);
        return null;
    }
}

function openArticleModal(article) {
    const modal = document.getElementById('articleModal');
    const title = document.getElementById('modalArticleTitle');
    const content = document.getElementById('modalArticleContent');
    const meta = document.getElementById('modalArticleMeta');
    
    title.textContent = article.title;
    content.innerHTML = article.content;
    
    const date = new Date(article.date).toLocaleDateString();
    meta.innerHTML = `
        <span class="article-category">${article.category}</span>
        <span class="article-date">${date}</span>
        ${article.author ? `<span class="article-author">By ${article.author}</span>` : ''}
    `;
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeArticleModal() {
    const modal = document.getElementById('articleModal');
    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// Load sample articles for demonstration
function loadSampleArticles() {
    if (articles.length === 0) {
        const sampleArticles = [
            {
                id: 1,
                title: "",
                category: "policy",
                content: "",
                excerpt: "",
                date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
                attachments: []
            },
            {
                id: 2,
                title: "Tech Stocks Rally as AI Investment Surge Continues",
                category: "technology",
                content: "Technology stocks experienced significant gains as investors continue to pour capital into artificial intelligence and machine learning companies. Major tech giants reported strong quarterly earnings driven by AI-related revenue streams. The semiconductor sector, in particular, has seen substantial growth as demand for AI chips remains robust across multiple industries.",
                excerpt: "Technology stocks experienced significant gains as investors continue to pour capital into artificial intelligence...",
                date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
                attachments: []
            },
            {
                id: 3,
                title: "Global Energy Markets React to Geopolitical Tensions",
                category: "markets",
                content: "Energy commodity prices have shown increased volatility as geopolitical tensions in key producing regions continue to influence global supply chains. Oil and natural gas futures have experienced significant price swings, prompting strategic reserve releases from major consuming nations. Energy analysts emphasize the importance of diversified supply sources and renewable energy transitions in maintaining market stability.",
                excerpt: "Energy commodity prices have shown increased volatility as geopolitical tensions in key producing regions...",
                date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
                attachments: []
            },
            {
                id: 4,
                title: "Consumer Spending Patterns Shift Amid Inflation Concerns",
                category: "analysis",
                content: "Recent consumer spending data reveals significant shifts in purchasing behavior as households adapt to persistent inflationary pressures. Retail sales figures show increased spending on essential goods while discretionary purchases decline. Economic researchers note the importance of monitoring these trends for insights into consumer confidence and broader economic health.",
                excerpt: "Recent consumer spending data reveals significant shifts in purchasing behavior as households adapt to persistent...",
                date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(),
                attachments: []
            }
        ];
        
        articles = sampleArticles;
        saveData();
    }
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Firebase Authentication Functions
function signUp() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    if (!email || !password) {
        showAuthStatus('Please enter both email and password.', 'error');
        return;
    }
    
    if (password.length < 6) {
        showAuthStatus('Password must be at least 6 characters long.', 'error');
        return;
    }
    
    window.createUserWithEmailAndPassword(window.firebaseAuth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            clearAuthForm();
        })
        .catch((error) => {
            showAuthStatus(`Sign up failed: ${error.message}`, 'error');
        });
}

function signIn() {
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    
    if (!email || !password) {
        showAuthStatus('Please enter both email and password.', 'error');
        return;
    }
    
    window.signInWithEmailAndPassword(window.firebaseAuth, email, password)
        .then((userCredential) => {
            clearAuthForm();
        })
        .catch((error) => {
            showAuthStatus(`Sign in failed: ${error.message}`, 'error');
        });
}

function sendVerification() {
    const user = window.firebaseAuth.currentUser;
    
    if (!user) {
        showAuthStatus('Please sign in first before sending verification email.', 'error');
        return;
    }
    
    window.sendEmailVerification(user)
        .then(() => {
            showAuthStatus(`Verification email sent to ${user.email}`, 'success');
        })
        .catch((error) => {
            showAuthStatus(`Failed to send verification email: ${error.message}`, 'error');
        });
}

function showAuthStatus(message, type) {
    const statusElement = document.getElementById('authStatus');
    statusElement.textContent = message;
    statusElement.className = `auth-status ${type}`;
    
    // Auto-hide success messages after 5 seconds
    if (type === 'success') {
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }
}

function clearAuthForm() {
    document.getElementById('authEmail').value = '';
    document.getElementById('authPassword').value = '';
}

// Export functions for testing (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleSearch,
        filterArchive,
        createArticleHTML,
        formatDate,
        truncateText,
        signUp,
        signIn,
        sendVerification
    };
}
