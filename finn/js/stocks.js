// Portfolio/Stocks functionality - pie chart, table view, options
import { formatCurrency, formatPrice, formatShares, formatPercent, animateValueHTML, getContrastColor, haptic } from './utils.js';
import { buildHoldings, buildOptions, getHoldingsConfig, getOptionsConfig, getFinancialConfig } from './config.js';

let holdingsData = [];
let optionsData = [];
let activeSymbol = null;

const legendMap = {};
const logoMap = {};
const tableRowMap = {};
const sliceGeometry = {};


function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function sanitizeUrl(url) {
    if (!url) return '#';
    try {
        const parsed = new URL(url, window.location.origin);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
        }
    } catch (_) {
        // fall through
    }
    return '#';
}


export async function loadHoldings() {
    const holdingsConfig = getHoldingsConfig();
    try {
        const response = await fetch('/api/stocks');
        if (response.ok) {
            const data = await response.json();
            return buildHoldings(holdingsConfig, data.quotes);
        }
    } catch (error) {
        console.log('Using fallback prices:', error);
    }
    return buildHoldings(holdingsConfig);
}

function buildOptionsData() {
    const optionsConfig = getOptionsConfig();
    const now = new Date();
    return optionsConfig.map(option => {
        const expDate = new Date(option.expiration + 'T16:00:00-05:00');
        const daysToExpiration = Math.ceil((expDate - now) / (1000 * 60 * 60 * 24));
        const expired = daysToExpiration < 0;

        const totalPremiumPaid = option.premiumPaid * option.contracts * 100;
        const currentValue = option.currentPremium * option.contracts * 100;
        const profitLoss = currentValue - totalPremiumPaid;
        const profitLossPercent = totalPremiumPaid > 0 ? (profitLoss / totalPremiumPaid) * 100 : 0;

        const underlyingPrice = option.underlyingPrice || 0;
        let intrinsicValue = 0;
        if (option.type === 'put') {
            intrinsicValue = Math.max(0, option.strike - underlyingPrice);
        } else {
            intrinsicValue = Math.max(0, underlyingPrice - option.strike);
        }

        return {
            ...option,
            daysToExpiration,
            expired,
            totalPremiumPaid,
            currentValue,
            profitLoss,
            profitLossPercent,
            underlyingPrice,
            intrinsicValue,
            inTheMoney: intrinsicValue > 0
        };
    });
}

export function renderOptions() {
    const container = document.getElementById('optionsContainer');
    if (!container || !optionsData || optionsData.length === 0) return;

    container.innerHTML = '';
    optionsData.forEach(option => {
        const card = document.createElement('div');
        card.className = 'option-card';
        card.style.borderLeft = `4px solid ${option.color}`;

        const isProfit = option.profitLoss >= 0;
        const profitClass = isProfit ? 'profit' : 'loss';
        const daysClass = option.daysToExpiration <= 3 ? 'urgent' : option.daysToExpiration <= 7 ? 'warning' : '';

        card.innerHTML = `
            <div class="option-header">
                <div class="option-title">
                    <span class="option-symbol">${escapeHTML(option.symbol)}</span>
                    <span class="option-type ${escapeHTML(option.type)}">${escapeHTML(option.type.toUpperCase())}</span>
                    <span class="option-strike">$${option.strike}</span>
                </div>
                <div class="option-status ${option.inTheMoney ? 'itm' : 'otm'}">
                    ${option.inTheMoney ? 'ITM' : 'OTM'}
                </div>
            </div>
            <div class="option-details">
                <div class="option-row">
                    <span class="option-label">Underlying:</span>
                    <span class="option-value">${escapeHTML(option.underlying)} @ $${option.underlyingPrice.toFixed(2)}</span>
                </div>
                <div class="option-row">
                    <span class="option-label">Expiration:</span>
                    <span class="option-value ${daysClass}">${escapeHTML(option.expiration)} (${option.daysToExpiration}d)</span>
                </div>
                <div class="option-row">
                    <span class="option-label">Contracts:</span>
                    <span class="option-value">${option.contracts} × 100 shares</span>
                </div>
                <div class="option-row">
                    <span class="option-label">Premium Paid:</span>
                    <span class="option-value">$${option.totalPremiumPaid.toFixed(2)}</span>
                </div>
                <div class="option-row">
                    <span class="option-label">Current Value:</span>
                    <span class="option-value">$${option.currentValue.toFixed(2)}</span>
                </div>
                <div class="option-row highlight">
                    <span class="option-label">P/L:</span>
                    <span class="option-value ${profitClass}">
                        ${isProfit ? '+' : ''}$${option.profitLoss.toFixed(2)} (${isProfit ? '+' : ''}${option.profitLossPercent.toFixed(1)}%)
                    </span>
                </div>
                <div class="option-row">
                    <span class="option-label">Intrinsic Value:</span>
                    <span class="option-value">$${option.intrinsicValue.toFixed(2)}/share</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function showOptionModal(option) {
    const modal = document.getElementById('optionModal');
    const modalBody = document.getElementById('optionModalBody');

    const isProfit = option.profitLoss >= 0;
    const profitClass = isProfit ? 'profit' : 'loss';
    const daysClass = option.daysToExpiration <= 3 ? 'urgent' :
                     option.daysToExpiration <= 7 ? 'warning' : '';

    modalBody.innerHTML = `
        <div class="option-card" style="border-left: 4px solid ${option.color}; margin-bottom: 0;">
            <div class="option-header">
                <div class="option-title">
                    <span class="option-symbol">${escapeHTML(option.symbol)}</span>
                    <span class="option-type ${escapeHTML(option.type)}">${escapeHTML(option.type.toUpperCase())}</span>
                    <span class="option-strike">$${option.strike}</span>
                </div>
                <div class="option-status ${option.inTheMoney ? 'itm' : 'otm'}">
                    ${option.inTheMoney ? 'ITM' : 'OTM'}
                </div>
            </div>
            <div class="option-details">
                <div class="option-row">
                    <span class="option-label">Underlying</span>
                    <span class="option-value">${escapeHTML(option.underlying)} @ $${option.underlyingPrice.toFixed(2)}</span>
                </div>
                <div class="option-row">
                    <span class="option-label">Expiration</span>
                    <span class="option-value ${daysClass}">${escapeHTML(option.expiration)} (${option.daysToExpiration} days)</span>
                </div>
                <div class="option-row">
                    <span class="option-label">Contracts</span>
                    <span class="option-value">${option.contracts} × 100 = ${option.contracts * 100} shares</span>
                </div>
                <div class="option-row">
                    <span class="option-label">Premium Paid</span>
                    <span class="option-value">$${option.premiumPaid.toFixed(2)}/share ($${option.totalPremiumPaid.toFixed(2)} total)</span>
                </div>
                <div class="option-row">
                    <span class="option-label">Current Value</span>
                    <span class="option-value">$${option.currentPremium.toFixed(2)}/share ($${option.currentValue.toFixed(2)} total)</span>
                </div>
                <div class="option-row">
                    <span class="option-label">P/L</span>
                    <span class="option-value ${profitClass}">$${option.profitLoss.toFixed(2)} (${option.profitLossPercent.toFixed(2)}%)</span>
                </div>
                <div class="option-row">
                    <span class="option-label">Intrinsic Value</span>
                    <span class="option-value">$${option.intrinsicValue.toFixed(2)}</span>
                </div>
                ${option.filledDate ? `
                <div class="option-row">
                    <span class="option-label">Filled</span>
                    <span class="option-value">${escapeHTML(option.filledDate)} at ${escapeHTML(option.filledTime)}</span>
                </div>
                ` : ''}
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function closeOptionModal() {
    const modal = document.getElementById('optionModal');
    modal.classList.remove('active');
}

export function initializePortfolio(holdings, options) {
    holdingsData = holdings;
    optionsData = buildOptionsData();

    // Render options cards
    renderOptions();

    // Merge options into pie chart as holdings
    const optionHoldings = optionsData.map(option => ({
        symbol: option.symbol,
        shares: option.contracts,
        currentValue: option.currentValue,
        targetValue: option.currentValue,
        gainPercent: option.profitLossPercent,
        color: option.color,
        logoLabel: option.logoLabel,
        logoSvg: option.logoSvg,
        isOption: true,
        optionData: option
    }));

    const pieHoldings = [...holdingsData, ...optionHoldings].sort((a, b) => b.currentValue - a.currentValue);
    const tableHoldings = [...holdingsData].sort((a, b) => b.gainPercent - a.gainPercent);

    const currentTotal = pieHoldings.reduce((sum, h) => sum + h.currentValue, 0);

    // Initialize pie chart
    initializePieChart(pieHoldings, currentTotal);

    // Initialize table view
    initializeTableView(tableHoldings);

    // Set up view toggle
    setupViewToggle();

    // Set up option modal handlers
    setupOptionModal();

    return { pieHoldings, tableHoldings, currentTotal };
}

function initializePieChart(pieHoldings, currentTotal) {
    const pieChart = document.getElementById('stockPieChart');
    const pieCanvas = document.getElementById('stockPieCanvas');
    const pieCenter = document.getElementById('stockPieCenter');
    const pieLegend = document.getElementById('stockPieLegend');
    const pieLogos = document.getElementById('stockPieLogos');

    if (!pieCanvas || !pieChart) return;

    let pieCtx = pieCanvas.getContext('2d');
    let pieLogicalSize = 0;

    const resizePieCanvas = () => {
        const rect = pieChart.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height);
        if (size <= 0) return false;
        pieLogicalSize = size;
        const scale = window.devicePixelRatio || 1;
        pieCanvas.style.width = `${size}px`;
        pieCanvas.style.height = `${size}px`;
        pieCanvas.width = size * scale;
        pieCanvas.height = size * scale;
        pieCtx.setTransform(1, 0, 0, 1, 0, 0);
        pieCtx.scale(scale, scale);
        return true;
    };

    resizePieCanvas();
    window.addEventListener('resize', () => {
        resizePieCanvas();
        renderPie();
    });

    // Calculate slice geometry
    let startPercent = 0;
    pieHoldings.forEach(item => {
        const share = currentTotal > 0 ? item.currentValue / currentTotal : 0;
        const sweepPercent = share * 100;
        const startDeg = startPercent * 3.6;
        const sweepDeg = sweepPercent * 3.6;
        sliceGeometry[item.symbol] = {
            startDeg,
            sweepDeg,
            midAngle: startDeg + sweepDeg / 2,
            color: item.color
        };
        startPercent += sweepPercent;
    });

    const renderPie = (highlightSymbol = null) => {
        if (!pieCtx || pieLogicalSize <= 0) return;
        const size = pieLogicalSize;
        const centerCoord = size / 2;
        const radius = (size * 0.92) / 2;
        const isMobile = size < 300;
        const minSlicePercent = isMobile ? 8 : 5;
        const isDark = document.body.classList.contains('dark');

        pieCtx.clearRect(0, 0, size, size);

        pieHoldings.forEach(item => {
            const geometry = sliceGeometry[item.symbol];
            if (!geometry) return;
            const startAngle = (geometry.startDeg - 90) * (Math.PI / 180);
            const sweepAngle = geometry.sweepDeg * (Math.PI / 180);
            const endAngle = startAngle + sweepAngle;
            const isActive = highlightSymbol === item.symbol;
            const slicePercent = geometry.sweepDeg / 360 * 100;
            const baseOffset = slicePercent < 15 ? 24 : 6;
            const offset = isActive ? baseOffset : 0;
            const midAngle = startAngle + sweepAngle / 2;
            const dx = Math.cos(midAngle) * offset;
            const dy = Math.sin(midAngle) * offset;

            pieCtx.beginPath();
            pieCtx.moveTo(centerCoord + dx, centerCoord + dy);
            const radiusExpansion = isActive ? (slicePercent < 15 ? 10 : 2) : 0;
            pieCtx.arc(centerCoord + dx, centerCoord + dy, radius + radiusExpansion, startAngle, endAngle);
            pieCtx.closePath();
            pieCtx.fillStyle = item.color;
            pieCtx.shadowColor = 'rgba(0,0,0,0.08)';
            pieCtx.shadowBlur = isActive ? (slicePercent < 15 ? 35 : 20) : 8;
            pieCtx.fill();

            // Draw percentage label
            if (slicePercent >= minSlicePercent) {
                const labelRadius = radius * 0.7;
                const labelX = centerCoord + dx + Math.cos(midAngle) * labelRadius;
                const labelY = centerCoord + dy + Math.sin(midAngle) * labelRadius;
                const fontSize = Math.max(11, Math.min(16, size * 0.055));
                pieCtx.shadowBlur = 0;
                pieCtx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
                pieCtx.textAlign = 'center';
                pieCtx.textBaseline = 'middle';
                pieCtx.strokeStyle = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.3)';
                pieCtx.lineWidth = isMobile ? 2 : 2.5;
                pieCtx.strokeText(`${slicePercent.toFixed(1)}%`, labelX, labelY);
                pieCtx.fillStyle = isDark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.98)';
                pieCtx.fillText(`${slicePercent.toFixed(1)}%`, labelX, labelY);
            }
        });
    };

    const activateSlice = (symbol) => {
        const item = pieHoldings.find(h => h.symbol === symbol);
        if (!item || !pieCenter) return;
        if (activeSymbol !== symbol) haptic('light');
        activeSymbol = symbol;

        const displayText = item.isOption
            ? `${formatCurrency(item.currentValue, 'USD')}<span>${escapeHTML(item.symbol)} Option</span>`
            : `${formatCurrency(item.currentValue, item.currency || 'USD')}<span>${escapeHTML(item.symbol)} • ${escapeHTML(formatPercent(item.gainPercent))} target</span>`;

        pieCenter.innerHTML = displayText;

        Object.entries(legendMap).forEach(([sym, li]) => {
            li.classList.toggle('active', sym === symbol);
        });
        Object.entries(logoMap).forEach(([sym, logo]) => {
            logo.classList.toggle('active', sym === symbol);
        });
        Object.entries(tableRowMap).forEach(([sym, row]) => {
            row.classList.toggle('active', sym === symbol);
        });
        renderPie(symbol);
    };

    const resetSlice = () => {
        activeSymbol = null;
        if (pieCenter) {
            pieCenter.innerHTML = `${formatCurrency(currentTotal)}<span>Current</span>`;
        }
        Object.values(legendMap).forEach(li => li.classList.remove('active'));
        Object.values(logoMap).forEach(logo => logo.classList.remove('active'));
        Object.values(tableRowMap).forEach(row => row.classList.remove('active'));
        renderPie();
    };

    const toggleSlice = (symbol) => {
        const holding = pieHoldings.find(h => h.symbol === symbol);
        if (holding && holding.isOption) {
            showOptionModal(holding.optionData);
            return;
        }

        if (activeSymbol === symbol) {
            resetSlice();
        } else {
            activateSlice(symbol);
        }
    };

    // Render initial pie
    renderPie();
    window.addEventListener('load', () => setTimeout(() => renderPie(), 100));

    // Animate center label
    if (pieCenter) {
        animateValueHTML(pieCenter, currentTotal, 1000, 'USD', '<span>Current</span>');
        pieCenter.tabIndex = 0;
        pieCenter.addEventListener('click', resetSlice);
    }

    // Build legend
    if (pieLegend) {
        pieLegend.innerHTML = '';
        pieHoldings.forEach(item => {
            const li = document.createElement('li');
            const swatch = document.createElement('span');
            swatch.className = 'legend-swatch';
            swatch.style.background = item.color;

            const label = document.createElement('span');
            label.className = 'legend-label';
            label.textContent = item.symbol;

            const value = document.createElement('span');
            value.className = 'legend-value';
            value.textContent = formatCurrency(item.currentValue, item.currency || 'USD');

            li.appendChild(swatch);
            li.appendChild(label);
            li.appendChild(value);
            pieLegend.appendChild(li);
            legendMap[item.symbol] = li;

            li.addEventListener('mouseenter', () => activateSlice(item.symbol));
            li.addEventListener('mouseleave', resetSlice);
            li.addEventListener('click', () => toggleSlice(item.symbol));
        });
    }

    // Build logos
    if (pieLogos) {
        pieLogos.innerHTML = '';
        pieHoldings.forEach(item => {
            const geometry = sliceGeometry[item.symbol];
            const midAngle = geometry ? geometry.midAngle : 0;
            const radians = (midAngle - 90) * (Math.PI / 180);
            const radius = 125;
            const x = 130 + Math.cos(radians) * radius;
            const y = 130 + Math.sin(radians) * radius;
            const logo = document.createElement('div');
            logo.className = 'pie-logo';
            logo.style.background = item.color;
            logo.style.color = getContrastColor(item.color);
            logo.style.left = `${x}px`;
            logo.style.top = `${y}px`;
            if (item.logoSvg) {
                logo.innerHTML = item.logoSvg;
            } else {
                logo.textContent = item.logoLabel || item.symbol[0];
            }
            pieLogos.appendChild(logo);
            logoMap[item.symbol] = logo;

            logo.addEventListener('mouseenter', () => activateSlice(item.symbol));
            logo.addEventListener('mouseleave', resetSlice);
            logo.addEventListener('click', () => toggleSlice(item.symbol));
        });
    }

    // Pie chart mouse/touch interactions
    if (pieChart) {
        pieChart.style.cursor = 'pointer';

        pieChart.addEventListener('mousemove', (event) => {
            const rect = pieChart.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const deltaX = event.clientX - centerX;
            const deltaY = event.clientY - centerY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const size = Math.min(rect.width, rect.height);
            const radius = (size * 0.92) / 2;

            if (distance > radius || distance < radius * 0.25) {
                if (!activeSymbol) renderPie();
                return;
            }

            let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            angle = angle < -90 ? 450 + angle : angle + 90;

            const matched = pieHoldings.find(item => {
                const geom = sliceGeometry[item.symbol];
                if (!geom) return false;
                const normalized = angle % 360;
                const start = geom.startDeg % 360;
                const end = (geom.startDeg + geom.sweepDeg) % 360;
                if (start < end) {
                    return normalized >= start && normalized <= end;
                }
                return normalized >= start || normalized <= end;
            });

            if (matched) activateSlice(matched.symbol);
        });

        pieChart.addEventListener('mouseleave', () => {
            if (!activeSymbol) renderPie();
        });

        pieChart.addEventListener('click', (event) => {
            const rect = pieChart.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const deltaX = event.clientX - centerX;
            const deltaY = event.clientY - centerY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const size = Math.min(rect.width, rect.height);
            const radius = (size * 0.92) / 2;

            if (distance > radius || distance < radius * 0.25) return;

            let angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);
            angle = angle < -90 ? 450 + angle : angle + 90;

            const matched = pieHoldings.find(item => {
                const geom = sliceGeometry[item.symbol];
                if (!geom) return false;
                const normalized = angle % 360;
                const start = geom.startDeg % 360;
                const end = (geom.startDeg + geom.sweepDeg) % 360;
                if (start < end) {
                    return normalized >= start && normalized <= end;
                }
                return normalized >= start || normalized <= end;
            });

            if (matched) toggleSlice(matched.symbol);
        });
    }
}

function initializeTableView(tableHoldings) {
    const tbody = document.querySelector('#stockTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    tableHoldings.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.symbol = item.symbol;

        const cells = [
            `<a href="${sanitizeUrl(item.url)}" target="_blank" rel="noopener">${escapeHTML(item.symbol)}</a>`,
            escapeHTML(formatShares(item.shares)),
            escapeHTML(formatPrice(item.price, item.currency)),
            escapeHTML(formatPercent(item.dailyChangePercent || 0)),
            escapeHTML(formatCurrency(item.currentValue, item.currency)),
            escapeHTML(formatPrice(item.targetPrice)),
            escapeHTML(formatCurrency(item.targetValue)),
            escapeHTML(formatPercent(item.gainPercent))
        ];

        cells.forEach(content => {
            const td = document.createElement('td');
            td.innerHTML = content;
            tr.appendChild(td);
        });

        tr.addEventListener('mouseenter', () => {
            if (activeSymbol !== item.symbol) {
                activeSymbol = item.symbol;
                Object.entries(tableRowMap).forEach(([sym, row]) => {
                    row.classList.toggle('active', sym === item.symbol);
                });
            }
        });
        tr.addEventListener('mouseleave', () => {
            activeSymbol = null;
            Object.values(tableRowMap).forEach(row => row.classList.remove('active'));
        });

        tbody.appendChild(tr);
        tableRowMap[item.symbol] = tr;
    });
}

function setupViewToggle() {
    const pieView = document.getElementById('stockPieView');
    const tableView = document.getElementById('stockTableWrapper');
    const viewToggleButtons = document.querySelectorAll('[data-view-toggle]');

    function setPortfolioView(view) {
        if (!pieView || !tableView) return;
        if (view === 'table') {
            pieView.classList.add('hidden');
            tableView.classList.remove('hidden');
        } else {
            pieView.classList.remove('hidden');
            tableView.classList.add('hidden');
        }

        viewToggleButtons.forEach(btn => {
            const isActive = btn.dataset.viewToggle === view;
            btn.classList.toggle('active', isActive);
        });
    }

    setPortfolioView('pie');

    viewToggleButtons.forEach(button => {
        button.addEventListener('click', () => {
            setPortfolioView(button.dataset.viewToggle);
        });
    });
}

function setupOptionModal() {
    const modal = document.getElementById('optionModal');
    if (!modal) return;

    const modalBackdrop = modal.querySelector('.option-modal-backdrop');
    const modalClose = modal.querySelector('.option-modal-close');

    if (modalBackdrop) modalBackdrop.addEventListener('click', closeOptionModal);
    if (modalClose) modalClose.addEventListener('click', closeOptionModal);
}

export function getHoldingsData() {
    return holdingsData;
}

export function getOptionsData() {
    return optionsData;
}
