// Main initialization and orchestration
import { loadPortfolioConfig, getHoldingsConfig, getOptionsConfig, getFinancialConfig } from './config.js';
import { initializePortfolio, loadHoldings } from './stocks.js';
import { initializeSpending, addTransaction as addSpendingTransaction, deleteTransaction as deleteSpendingTransaction } from './spending.js';
import { generateBudgetCalendar } from './calendar.js';
import { formatCurrency, haptic } from './utils.js';

// Make functions globally available for inline handlers (temporary until full refactor)
window.addTransaction = addSpendingTransaction;
window.deleteTransaction = deleteSpendingTransaction;

// Theme toggle
export function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    const themeIcon = document.getElementById('themeIcon');
    if (themeIcon) themeIcon.textContent = isDark ? '🌙' : '☀️';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    // Regenerate calendar to update colors
    if (document.querySelector('[data-tab-content="calendar"]').classList.contains('active')) {
        generateBudgetCalendar();
    }
}

window.toggleTheme = toggleTheme;

// Tab switching
function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(t => t.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));

    const activeTab = document.querySelector(`[data-tab="${tabName}"]`);
    const activeContent = document.querySelector(`[data-tab-content="${tabName}"]`);

    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');

    localStorage.setItem('activeTab', tabName);

    // Trigger calendar regeneration if switching to calendar tab
    if (tabName === 'calendar') {
        generateBudgetCalendar();
    }
}

// Initialize collapsible sections
function initSlideToggle({ toggle, content, card, defaultOpen = false }) {
    if (!toggle || !content) return;
    const hostCard = card || content.closest('.glass-card');

    const expand = () => {
        if (content._expandTimer) clearTimeout(content._expandTimer);
        content.style.overflow = 'visible';
        content.style.maxHeight = `${content.scrollHeight}px`;
        content._expandTimer = setTimeout(() => {
            if (toggle.getAttribute('aria-expanded') === 'true') {
                content.style.maxHeight = 'none';
            }
        }, 400);
    };

    const collapse = () => {
        if (content._expandTimer) clearTimeout(content._expandTimer);
        content.style.overflow = 'hidden';
        if (content.style.maxHeight === 'none') {
            content.style.maxHeight = `${content.scrollHeight}px`;
            void content.offsetHeight;
        }
        content.style.maxHeight = '0px';
    };

    const setState = (expanded) => {
        toggle.setAttribute('aria-expanded', String(expanded));
        content.setAttribute('aria-hidden', String(!expanded));
        if (hostCard) {
            hostCard.classList.toggle('open', expanded);
        }
        if (expanded) {
            expand();
        } else {
            collapse();
        }
    };

    setState(defaultOpen);

    const handleToggle = () => {
        const isExpanded = toggle.getAttribute('aria-expanded') === 'true';
        setState(!isExpanded);
    };

    toggle.addEventListener('click', handleToggle);
    toggle.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleToggle();
    });

    window.addEventListener('resize', () => {
        if (toggle.getAttribute('aria-expanded') === 'true') {
            if (content.style.maxHeight === 'none') {
                content.style.maxHeight = `${content.scrollHeight}px`;
                content._expandTimer = setTimeout(() => {
                    if (toggle.getAttribute('aria-expanded') === 'true') {
                        content.style.maxHeight = 'none';
                    }
                }, 400);
            } else {
                content.style.maxHeight = `${content.scrollHeight}px`;
            }
        }
    });
}

// Scroll-based header animation
function initializeHeaderAnimation() {
    const siteHeader = document.querySelector('.site-header');
    const brandBadge = document.querySelector('.brand-badge');
    let ticking = false;

    function updateHeaderSpacing() {
        const scrollY = window.scrollY;
        const maxScroll = 400;
        const scrollProgress = Math.min(scrollY / maxScroll, 1);

        const isMobile = window.innerWidth <= 768;
        const startPadding = isMobile ? 12 : 20;
        const minPadding = isMobile ? 8 : 8;

        const sidePadding = startPadding - (scrollProgress * (startPadding - minPadding));

        const scaleAmount = isMobile ? 0.2 : 0.3;
        const opacityAmount = isMobile ? 0.3 : 0.5;
        const badgeScale = 1 - (scrollProgress * scaleAmount);
        const badgeOpacity = 1 - (scrollProgress * opacityAmount);

        if (siteHeader) {
            siteHeader.style.paddingLeft = `${sidePadding}px`;
            siteHeader.style.paddingRight = `${sidePadding}px`;
        }

        if (brandBadge) {
            brandBadge.style.transform = `scale(${badgeScale})`;
            brandBadge.style.opacity = badgeOpacity;
        }

        ticking = false;
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(updateHeaderSpacing);
            ticking = true;
        }
    });

    updateHeaderSpacing();
}

// Pull to refresh
function initializePullToRefresh() {
    const pullIndicator = document.getElementById('pullIndicator');
    let touchStartY = 0;
    let isPulling = false;
    const PULL_THRESHOLD = 80;

    document.addEventListener('touchstart', (e) => {
        if (window.scrollY === 0) {
            touchStartY = e.touches[0].clientY;
            isPulling = true;
        }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!isPulling || window.scrollY > 0) return;
        const touchY = e.touches[0].clientY;
        const pullDistance = touchY - touchStartY;

        if (pullDistance > 0 && pullDistance < PULL_THRESHOLD * 2) {
            if (pullIndicator) {
                pullIndicator.classList.add('visible');
                pullIndicator.style.transform = `translateX(-50%) translateY(${Math.min(pullDistance * 0.5, 40)}px)`;
            }
            if (pullDistance > PULL_THRESHOLD * 0.5) {
                haptic('light');
            }
        }
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (!isPulling) return;
        isPulling = false;

        if (pullIndicator && pullIndicator.classList.contains('visible')) {
            const transform = pullIndicator.style.transform;
            const match = transform.match(/translateY\((\d+)px\)/);
            const currentY = match ? parseInt(match[1]) : 0;

            if (currentY >= 35) {
                haptic('medium');
                pullIndicator.classList.add('refreshing');
                setTimeout(() => location.reload(), 500);
            } else {
                pullIndicator.classList.remove('visible');
                pullIndicator.style.transform = '';
            }
        }
    }, { passive: true });
}

// Initialize keyboard shortcuts
function initializeKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input/textarea or if modifier keys are pressed
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.ctrlKey || e.metaKey || e.altKey) {
            return;
        }

        const key = e.key.toLowerCase();
        let tabName = null;

        switch(key) {
            case 'p':
            case '1':
                tabName = 'portfolio';
                break;
            case 'b':
            case '2':
                tabName = 'budget';
                break;
            case 'c':
            case '3':
                tabName = 'calendar';
                break;
            case 'd':
            case '4':
                tabName = 'debt';
                break;
            case 's':
            case '5':
                tabName = 'summary';
                break;
            case 'i':
            case 'm':
            case '6':
                tabName = 'insights';
                break;
            case 't':
            case '7':
                tabName = 'mint';
                break;
        }

        if (tabName) {
            e.preventDefault();
            switchTab(tabName);
        }
    });
}

// Main initialization
async function initialize() {
    // Initialize theme
    const theme = localStorage.getItem('theme');
    if (theme === 'dark' || (!theme && matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.body.classList.add('dark');
        const themeIcon = document.getElementById('themeIcon');
        if (themeIcon) themeIcon.textContent = '🌙';
    }

    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!theme) {
            document.body.classList.toggle('dark', e.matches);
            const themeIcon = document.getElementById('themeIcon');
            if (themeIcon) themeIcon.textContent = e.matches ? '🌙' : '☀️';
        }
    });

    // Load configuration
    await loadPortfolioConfig();

    // Load holdings data
    let holdingsData = [];
    try {
        holdingsData = await loadHoldings();
    } catch (error) {
        console.error('Failed to load holdings:', error);
    }

    // Initialize portfolio (stocks, options, pie chart)
    const { currentTotal } = initializePortfolio(holdingsData, []);

    // Initialize spending tracker
    initializeSpending();

    // Initialize budget calendar
    generateBudgetCalendar();

    // Set up collapsible sections
    initSlideToggle({
        toggle: document.getElementById('marketInsightsToggle'),
        content: document.getElementById('marketInsightsContent'),
        card: document.getElementById('marketInsightsCard'),
        defaultOpen: false
    });
    initSlideToggle({
        toggle: document.getElementById('budgetToggle'),
        content: document.getElementById('budgetContent'),
        card: document.getElementById('budgetCard'),
        defaultOpen: true
    });
    initSlideToggle({
        toggle: document.getElementById('debtToggle'),
        content: document.getElementById('debtContent'),
        card: document.getElementById('debtCard'),
        defaultOpen: false
    });
    initSlideToggle({
        toggle: document.getElementById('summaryToggle'),
        content: document.getElementById('summaryContent'),
        card: document.getElementById('summaryCard'),
        defaultOpen: false
    });

    // Set up tab navigation
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Restore saved tab
    const savedTab = localStorage.getItem('activeTab') || 'portfolio';
    switchTab(savedTab);

    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts();

    // Initialize header animation
    initializeHeaderAnimation();

    // Initialize pull to refresh
    initializePullToRefresh();

    console.log('Finn initialized successfully');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}
