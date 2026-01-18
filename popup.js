document.addEventListener('DOMContentLoaded', init);

let allApps = [];

async function init() {
  const refreshBtn = document.getElementById('refresh-btn');
  const searchInput = document.getElementById('search');
  
  refreshBtn.addEventListener('click', fetchData);
  searchInput.addEventListener('input', filterApps);
  
  await fetchData();
}

async function fetchData() {
  showStatus();
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.url) {
      showNotArgoCD();
      return;
    }

    // Inject and execute content script to get ArgoCD data
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractArgoData
    });

    const data = results[0]?.result;
    
    if (!data || data.error) {
      if (data?.error === 'not_argocd') {
        showNotArgoCD();
      } else {
        showError(data?.message || 'Failed to fetch data');
      }
      return;
    }

    allApps = data.apps || [];
    renderApps(allApps);
    
  } catch (error) {
    console.error('Zargov error:', error);
    showError(error.message);
  }
}

// This entire function runs in the page context - all helpers must be inside
function extractArgoData() {
  // Check if this is an ArgoCD page
  const isArgoCD = 
    document.querySelector('[class*="argo"]') ||
    document.querySelector('[class*="application"]') ||
    window.location.href.includes('argocd') ||
    document.title.toLowerCase().includes('argo');

  if (!isArgoCD) {
    return { error: 'not_argocd' };
  }

  // Helper function to extract images - MUST be inside extractArgoData
  function extractImagesFromApp(app) {
    const images = new Set();
    
    // Get images from summary
    if (app.status?.summary?.images) {
      app.status.summary.images.forEach(img => images.add(img));
    }
    
    // Get images from resources
    if (app.status?.resources) {
      app.status.resources.forEach(resource => {
        if (resource.image) {
          images.add(resource.image);
        }
      });
    }

    // Parse images into name and version
    return Array.from(images).map(imageString => {
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
      
      // Get short name (last part of the image path)
      const parts = name.split('/');
      const shortName = parts[parts.length - 1];
      
      return { full: imageString, name, shortName, version };
    });
  }

  const baseUrl = window.location.origin;
  
  return fetch(`${baseUrl}/api/v1/applications`, {
    credentials: 'include',
    headers: {
      'Accept': 'application/json'
    }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    const apps = (data.items || []).map(app => {
      const images = extractImagesFromApp(app);
      return {
        name: app.metadata?.name || 'Unknown',
        namespace: app.spec?.destination?.namespace || '',
        health: app.status?.health?.status || 'Unknown',
        sync: app.status?.sync?.status || 'Unknown',
        images: images
      };
    });
    
    // Sort by app name
    apps.sort((a, b) => a.name.localeCompare(b.name));
    
    return { apps };
  })
  .catch(error => {
    return { error: 'fetch_failed', message: error.message };
  });
}

function renderApps(apps) {
  const container = document.getElementById('apps-container');
  const list = document.getElementById('apps-list');
  const countEl = document.getElementById('app-count');
  
  hideAll();
  container.classList.remove('hidden');
  
  // Count total images
  const totalImages = apps.reduce((sum, app) => sum + app.images.length, 0);
  countEl.textContent = `${apps.length} apps · ${totalImages} images`;
  
  if (apps.length === 0) {
    list.innerHTML = '<div class="no-images">No applications found</div>';
    return;
  }
  
  // Simple table-like view showing app name and images directly
  list.innerHTML = apps.map((app, index) => {
    const healthClass = getHealthClass(app.health);
    const imagesHtml = app.images.length > 0 
      ? app.images.map(img => `
          <div class="image-row">
            <span class="image-short-name">${escapeHtml(img.shortName)}</span>
            <span class="version-tag">${escapeHtml(img.version)}</span>
            <button class="copy-btn" onclick="copyToClipboard('${escapeAttr(img.full)}', this)" title="Copy: ${escapeAttr(img.full)}">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
            </button>
          </div>
        `).join('')
      : '<span class="no-img">No images</span>';
    
    return `
      <div class="app-row">
        <div class="app-info">
          <span class="status-dot ${healthClass}" title="${app.health}"></span>
          <span class="app-name-text">${escapeHtml(app.name)}</span>
        </div>
        <div class="app-images">
          ${imagesHtml}
        </div>
      </div>
    `;
  }).join('');
}

function getHealthClass(health) {
  const h = health?.toLowerCase() || '';
  if (h === 'healthy') return 'healthy';
  if (h === 'degraded' || h === 'progressing') return 'degraded';
  return 'unhealthy';
}

function copyToClipboard(text, btn) {
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('copied');
    setTimeout(() => btn.classList.remove('copied'), 1500);
  });
}

function filterApps() {
  const query = document.getElementById('search').value.toLowerCase();
  
  if (!query) {
    renderApps(allApps);
    return;
  }
  
  const filtered = allApps.filter(app => {
    if (app.name.toLowerCase().includes(query)) return true;
    return app.images.some(img => 
      img.name.toLowerCase().includes(query) || 
      img.version.toLowerCase().includes(query)
    );
  });
  
  renderApps(filtered);
}

function showStatus() {
  hideAll();
  document.getElementById('status').classList.remove('hidden');
}

function showNotArgoCD() {
  hideAll();
  document.getElementById('not-argocd').classList.remove('hidden');
}

function showError(message) {
  hideAll();
  document.getElementById('error-message').textContent = message;
  document.getElementById('error').classList.remove('hidden');
}

function hideAll() {
  document.getElementById('status').classList.add('hidden');
  document.getElementById('not-argocd').classList.add('hidden');
  document.getElementById('apps-container').classList.add('hidden');
  document.getElementById('error').classList.add('hidden');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// Expose functions to global scope for onclick handlers
window.copyToClipboard = copyToClipboard;
