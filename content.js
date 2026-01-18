// Zargov - ArgoCD Image Viewer
// Injects image badges directly onto ArgoCD application cards

(function() {
  'use strict';

  let appsData = {};
  let lastUrl = '';
  const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    if (!isArgoCD()) return;
    
    lastUrl = window.location.href;
    
    // Initial fetch and inject
    fetchAndInject();
    
    // Refresh every 5 minutes
    setInterval(() => {
      fetchAndInject();
    }, REFRESH_INTERVAL);
    
    // Check for URL changes (SPA navigation) every 2 seconds
    setInterval(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        // Small delay for page to render
        setTimeout(fetchAndInject, 1000);
      }
    }, 2000);
  }

  function isArgoCD() {
    return (
      document.querySelector('[class*="argo"]') ||
      document.querySelector('[class*="application"]') ||
      window.location.href.toLowerCase().includes('argocd') ||
      window.location.href.toLowerCase().includes('argo-cd') ||
      document.title.toLowerCase().includes('argo')
    );
  }

  async function fetchAndInject() {
    try {
      const response = await fetch(`${window.location.origin}/api/v1/applications`, {
        credentials: 'include',
        headers: { 'Accept': 'application/json' }
      });
      
      if (!response.ok) return;
      
      const data = await response.json();
      
      // Build a map of app name -> images
      appsData = {};
      (data.items || []).forEach(app => {
        const name = app.metadata?.name;
        if (name) {
          appsData[name] = extractImages(app);
        }
      });
      
      // Inject badges once
      injectBadges();
      
    } catch (error) {
      console.log('Zargov: Could not fetch apps', error);
    }
  }

  function extractImages(app) {
    const images = new Set();
    
    if (app.status?.summary?.images) {
      app.status.summary.images.forEach(img => images.add(img));
    }
    
    if (app.status?.resources) {
      app.status.resources.forEach(resource => {
        if (resource.image) images.add(resource.image);
      });
    }

    return Array.from(images).map(parseImage);
  }

  function parseImage(imageString) {
    let name, version;
    
    if (imageString.includes('@sha256:')) {
      const [imagePart, hash] = imageString.split('@sha256:');
      name = imagePart;
      version = 'sha256:' + hash.substring(0, 12);
    } else if (imageString.includes(':')) {
      const lastColon = imageString.lastIndexOf(':');
      const afterColon = imageString.substring(lastColon + 1);
      if (afterColon.includes('/')) {
        name = imageString;
        version = 'latest';
      } else {
        name = imageString.substring(0, lastColon);
        version = afterColon;
      }
    } else {
      name = imageString;
      version = 'latest';
    }
    
    const parts = name.split('/');
    const shortName = parts[parts.length - 1];
    
    return { full: imageString, name, shortName, version };
  }

  function injectBadges() {
    // Remove existing badges first
    document.querySelectorAll('.zargov-badge').forEach(el => el.remove());
    document.querySelectorAll('.zargov-tooltip').forEach(el => el.remove());
    
    // Find all application cards
    const appCards = document.querySelectorAll('[class*="application-status-panel"], [class*="applications-list__entry"], [class*="argo-table-list__row"]');
    
    appCards.forEach(card => {
      // Try to find the app name from the card
      const nameEl = card.querySelector('[class*="application-status-panel__title"], [class*="applications-list__title"], a[href*="/applications/"]');
      if (!nameEl) return;
      
      let appName = nameEl.textContent?.trim();
      
      // Also try to get from href
      if (!appName) {
        const link = card.querySelector('a[href*="/applications/"]');
        if (link) {
          const match = link.href.match(/\/applications\/(?:[^/]+\/)?([^/?]+)/);
          if (match) appName = match[1];
        }
      }
      
      if (!appName || !appsData[appName]) return;
      
      const images = appsData[appName];
      if (images.length === 0) return;
      
      // Create the badge
      const badge = document.createElement('div');
      badge.className = 'zargov-badge';
      badge.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M7 8h10M7 12h10M7 16h6"/>
        </svg>
        <span>${images.length}</span>
      `;
      
      // Create the tooltip
      const tooltip = document.createElement('div');
      tooltip.className = 'zargov-tooltip';
      tooltip.innerHTML = `
        <div class="zargov-tooltip-header">
          <span class="zargov-tooltip-title">${escapeHtml(appName)}</span>
          <span class="zargov-tooltip-count">${images.length}</span>
        </div>
        <div class="zargov-tooltip-images">
          ${images.map(img => `
            <div class="zargov-tooltip-image">
              <span class="zargov-tooltip-image-name">${escapeHtml(img.shortName)}</span>
              <span class="zargov-tooltip-image-version">${escapeHtml(img.version)}</span>
              <button class="zargov-copy-btn" data-copy="${escapeHtml(img.full)}" title="${escapeHtml(img.full)}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              </button>
            </div>
          `).join('')}
        </div>
      `;
      
      // Position the badge
      card.style.position = 'relative';
      card.appendChild(badge);
      card.appendChild(tooltip);
      
      // Show/hide tooltip on hover
      let hideTimeout;
      
      badge.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        const badgeRect = badge.getBoundingClientRect();
        const tooltipWidth = 300;
        
        if (badgeRect.right + tooltipWidth > window.innerWidth) {
          tooltip.style.right = '0';
          tooltip.style.left = 'auto';
        } else {
          tooltip.style.left = '0';
          tooltip.style.right = 'auto';
        }
        
        tooltip.classList.add('visible');
      });
      
      badge.addEventListener('mouseleave', () => {
        hideTimeout = setTimeout(() => {
          tooltip.classList.remove('visible');
        }, 150);
      });
      
      tooltip.addEventListener('mouseenter', () => {
        clearTimeout(hideTimeout);
        tooltip.classList.add('visible');
      });
      
      tooltip.addEventListener('mouseleave', () => {
        tooltip.classList.remove('visible');
      });
      
      // Copy button functionality
      tooltip.querySelectorAll('.zargov-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const text = btn.getAttribute('data-copy');
          navigator.clipboard.writeText(text).then(() => {
            btn.classList.add('copied');
            setTimeout(() => btn.classList.remove('copied'), 1500);
          });
        });
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

})();
