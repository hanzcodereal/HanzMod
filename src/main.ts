import './index.css';

// --- PWA: Service Worker registration ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('SW registration failed:', err);
    });
  });
}

// --- PWA: Custom install popup ---
let deferredInstallPrompt: any = null;
(window as any).deferredInstallPrompt = null;

const installPopup = document.getElementById('install-popup');
const installBtn = document.getElementById('install-popup-btn');
const installDismissBtn = document.getElementById('install-popup-dismiss');
const installBackdrop = document.getElementById('install-popup-backdrop');

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
}

function showInstallPopup() {
  const dismissedAt = localStorage.getItem('installDismissedAt');
  const recentlyDismissed = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 3 * 24 * 60 * 60 * 1000;
  if (isStandalone() || recentlyDismissed) return;
  installPopup?.classList.remove('hidden');
}

function hideInstallPopup() {
  installPopup?.classList.add('hidden');
}

window.addEventListener('beforeinstallprompt', (e: any) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  (window as any).deferredInstallPrompt = e;
  showInstallPopup();
});

installBtn?.addEventListener('click', async () => {
  hideInstallPopup();
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    (window as any).deferredInstallPrompt = null;
  }
});

installDismissBtn?.addEventListener('click', () => {
  hideInstallPopup();
  localStorage.setItem('installDismissedAt', Date.now().toString());
});

installBackdrop?.addEventListener('click', () => {
  hideInstallPopup();
});

window.addEventListener('appinstalled', () => {
  hideInstallPopup();
  deferredInstallPrompt = null;
  (window as any).deferredInstallPrompt = null;
});

// SVGs
const icons = {
  sun: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`,
  moon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`,
  back: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>`,
  star: `<svg class="w-3 h-3 fill-current" viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>`,
  loader: `<div class="flex justify-center mt-10"><svg class="w-8 h-8 animate-spin text-green-500" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></div>`,
  download: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>`,
  shield: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>`,
  external: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>`,
  code: `<svg class="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>`,
  search: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>`
};

// Theme Management
const themeToggleBtn = document.getElementById('theme-toggle')!;
const metaThemeColor = document.getElementById('meta-theme-color')!;
let isDark = localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);

function updateTheme() {
  const favicon = document.getElementById('favicon') as HTMLLinkElement | null;
  if (favicon) favicon.href = '/logo.png';

  if (isDark) {
    document.documentElement.classList.add('dark');
    themeToggleBtn.innerHTML = icons.sun;
    metaThemeColor.setAttribute('content', '#111827');
  } else {
    document.documentElement.classList.remove('dark');
    themeToggleBtn.innerHTML = icons.moon;
    metaThemeColor.setAttribute('content', '#ffffff');
  }
}
updateTheme();

themeToggleBtn.addEventListener('click', () => {
  isDark = !isDark;
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  updateTheme();
});

// Router & State
let currentRoute = 'home';
let currentParam = '';
let homePage = 1;
let homeTotalPages = 1;

const mainContent = document.getElementById('main-content')!;
const headerLeft = document.getElementById('header-left')!;
const bottomNav = document.getElementById('bottom-nav')!;

function parseUrl() {
  const path = window.location.pathname;
  if (path.startsWith('/search/')) {
    currentRoute = 'search';
    currentParam = decodeURIComponent(path.split('/search/')[1] || '');
  } else if (path === '/search') {
    currentRoute = 'search';
    currentParam = '';
  } else if (path.startsWith('/detail/')) {
    currentRoute = 'detail';
    currentParam = decodeURIComponent(path.split('/detail/')[1] || '');
  } else if (path === '/info') {
    currentRoute = 'info';
    currentParam = '';
  } else {
    currentRoute = 'home';
    currentParam = '';
  }
}

window.addEventListener('popstate', () => {
  parseUrl();
  render();
});

(window as any).router = {
  navigate: (route: string, param: string = '') => {
    currentRoute = route;
    currentParam = param;
    
    let path = '/';
    if (route === 'search') path = param ? `/search/${encodeURIComponent(param)}` : '/search';
    else if (route === 'detail') path = `/detail/${encodeURIComponent(param)}`;
    else if (route === 'info') path = '/info';
    
    window.history.pushState({}, '', path);
    render();
  },
  homePage: (page: number) => {
    homePage = page;
    renderHome();
  }
};

(window as any).downloadApk = async (url: string, title: string) => {
  const btn = document.getElementById('download-btn');
  if (!btn) return;
  
  const originalHtml = btn.innerHTML;
  btn.innerHTML = `<svg class="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Downloading...`;
  btn.style.pointerEvents = 'none';

  try {
    const downloadUrl = `/api/download?url=${encodeURIComponent(url)}`;
    
    let iframe = document.getElementById('download-iframe') as HTMLIFrameElement;
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'download-iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }
    iframe.src = downloadUrl;
    
    setTimeout(() => {
      btn.innerHTML = originalHtml;
      btn.style.pointerEvents = 'auto';
    }, 2500);
  } catch (err) {
    alert("Gagal mendownload file, coba lagi nanti.");
    btn.innerHTML = originalHtml;
    btn.style.pointerEvents = 'auto';
  }
};

async function render() {
  mainContent.scrollTop = 0;
  
  document.querySelectorAll('.nav-btn').forEach(btn => {
    if (btn.getAttribute('data-target') === currentRoute) {
      btn.classList.remove('text-gray-400');
      btn.classList.add('text-green-500', 'dark:text-green-400');
    } else {
      btn.classList.add('text-gray-400');
      btn.classList.remove('text-green-500', 'dark:text-green-400');
    }
  });

  if (currentRoute === 'home') {
    bottomNav.classList.remove('hidden');
    renderHome();
  } else if (currentRoute === 'search') {
    bottomNav.classList.remove('hidden');
    renderSearch();
  } else if (currentRoute === 'info') {
    bottomNav.classList.remove('hidden');
    renderInfo();
  } else if (currentRoute === 'detail') {
    bottomNav.classList.add('hidden');
    renderDetail(currentParam);
  }
}

// Pages
async function renderHome() {
  headerLeft.innerHTML = `<h1 class="text-xl font-bold text-green-500 tracking-tight">HanzMod</h1>`;
  mainContent.innerHTML = icons.loader;

  try {
    const res = await fetch(`/api/home?page=${homePage}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const data = await res.json();
    
    if (data.status) {
      homeTotalPages = data.result.total_pages;
      
      let html = `<div class="p-4 pb-8 space-y-4"><h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Latest Mods</h2>`;
      
      data.result.games.forEach((g: any) => {
        html += `
          <div onclick="window.router.navigate('detail', '${g.id}')" class="cursor-pointer flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 hover:bg-green-50 dark:hover:bg-gray-800 transition active:scale-[0.98]">
            <img src="${g.thumbnail}" class="w-16 h-16 rounded-xl object-cover shadow-sm" loading="lazy" />
            <div class="flex-1 overflow-hidden">
              <h3 class="font-medium text-gray-900 dark:text-white truncate">${g.title}</h3>
              <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">${g.developer}</p>
              <div class="flex items-center mt-1.5 text-amber-400">
                ${icons.star} <span class="text-xs ml-1 font-medium text-gray-700 dark:text-gray-300">${g.rating}</span>
              </div>
            </div>
          </div>
        `;
      });

      html += `
        <div class="flex justify-between items-center mt-8 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button onclick="window.router.homePage(${Math.max(1, homePage - 1)})" ${homePage === 1 ? 'disabled' : ''} class="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 disabled:opacity-50 font-medium text-gray-800 dark:text-gray-200 active:scale-95 transition">Prev</button>
          <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Page ${homePage} of ${homeTotalPages}</span>
          <button onclick="window.router.homePage(${Math.min(homeTotalPages, homePage + 1)})" ${homePage === homeTotalPages ? 'disabled' : ''} class="px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 disabled:opacity-50 font-medium text-gray-800 dark:text-gray-200 active:scale-95 transition">Next</button>
        </div>
      </div>`;
      
      mainContent.innerHTML = html;
    }
  } catch (e) {
    mainContent.innerHTML = `<div class="p-4 text-red-500 text-center mt-10">Gagal memuat data</div>`;
  }
}

async function renderSearch() {
  headerLeft.innerHTML = `<h1 class="text-xl font-bold text-green-500 tracking-tight">Search</h1>`;
  
  mainContent.innerHTML = `
    <div class="p-4">
      <form id="search-form" class="relative mb-6">
        <input type="text" id="search-input" placeholder="Cari game atau mod..." class="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white outline-none transition" />
        <div class="absolute left-4 top-3.5 text-gray-400">${icons.search}</div>
      </form>
      <div id="search-results"></div>
    </div>
  `;

  async function performSearch(query: string) {
    if (!query) return;
    const resDiv = document.getElementById('search-results')!;
    resDiv.innerHTML = icons.loader;

    try {
      const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
      const data = await res.json();
      
      if (data.status) {
        if (data.result.results.length === 0) {
          resDiv.innerHTML = `<div class="text-center text-gray-500 dark:text-gray-400 mt-10">Tidak ada hasil untuk "${query}"</div>`;
          return;
        }

        let html = `<div class="space-y-3">`;
        data.result.results.forEach((g: any) => {
          html += `
            <div onclick="window.router.navigate('detail', '${g.id}')" class="cursor-pointer flex items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 hover:bg-green-50 dark:hover:bg-gray-800 transition active:scale-[0.98]">
              <img src="${g.thumbnail}" class="w-16 h-16 rounded-xl object-cover shadow-sm" loading="lazy" />
              <div class="flex-1 overflow-hidden">
                <h3 class="font-medium text-gray-900 dark:text-white truncate">${g.title}</h3>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">${g.developer}</p>
                <div class="flex items-center mt-1.5 text-amber-400">
                  ${icons.star} <span class="text-xs ml-1 font-medium text-gray-700 dark:text-gray-300">${g.rating}</span>
                </div>
              </div>
            </div>
          `;
        });
        html += `</div>`;
        resDiv.innerHTML = html;
      }
    } catch (e) {
      resDiv.innerHTML = `<div class="text-red-500 text-center mt-10">Gagal mencari</div>`;
    }
  }

  document.getElementById('search-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = (document.getElementById('search-input') as HTMLInputElement).value.trim();
    if (query) {
      window.history.pushState({}, '', `/search/${encodeURIComponent(query)}`);
      currentParam = query;
      performSearch(query);
    }
  });

  if (currentParam) {
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    if (searchInput) searchInput.value = currentParam;
    performSearch(currentParam);
  }
}

async function renderInfo() {
  headerLeft.innerHTML = `<h1 class="text-xl font-bold text-green-500 tracking-tight">Info</h1>`;
  
  (window as any).installApp = async () => {
    const dp = (window as any).deferredInstallPrompt;
    if (dp) {
      dp.prompt();
      await dp.userChoice;
      (window as any).deferredInstallPrompt = null;
    } else {
      alert("Untuk menginstall HanzMod:\\n\\n1. Buka di Chrome/Safari\\n2. Klik menu/share (titik tiga)\\n3. Pilih 'Tambahkan ke Layar Utama' (Add to Home Screen)");
    }
  };

  mainContent.innerHTML = `
    <div class="p-6">
      <div class="flex flex-col items-center text-center mb-8 pt-4">
        <div class="w-28 h-28 flex items-center justify-center mb-4">
          <img src="/logo.png" class="w-full h-full rounded-full object-cover drop-shadow-md" alt="HanzMod Logo" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900 dark:text-white">HanzMod</h2>
        <p class="text-gray-500 dark:text-gray-400 mt-1 text-sm">Versi 1.0.0</p>
      </div>

      <div class="space-y-4">
        <div class="bg-gray-50 dark:bg-gray-800/50 p-5 rounded-2xl border border-gray-100 dark:border-gray-800">
          <h3 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Developer Info</h3>
          <div class="flex justify-between items-center py-2.5 border-b border-gray-200/60 dark:border-gray-700/50">
            <span class="text-gray-600 dark:text-gray-400 text-sm">Creator</span>
            <span class="font-semibold text-gray-900 dark:text-white">Hanzz</span>
          </div>
          <div class="flex justify-between items-center py-2.5">
            <span class="text-gray-600 dark:text-gray-400 text-sm">Platform</span>
            <span class="font-semibold text-gray-900 dark:text-white text-sm">AN1.com Unofficial</span>
          </div>
        </div>

        <a href="https://saweria.co/hanzreally" target="_blank" class="flex items-center justify-between bg-green-500 text-white p-5 rounded-2xl hover:bg-green-600 transition active:scale-[0.98] shadow-md shadow-green-500/20">
          <span class="font-semibold">Support Me</span>
          ${icons.external}
        </a>

        <button onclick="window.installApp()" class="w-full flex items-center justify-between bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-5 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/70 transition active:scale-[0.98]">
          <div class="flex items-center gap-3">
            <span class="text-green-500">${icons.download}</span>
            <span class="font-semibold">Install App (PWA)</span>
          </div>
        </button>
      </div>
    </div>
  `;
}

async function renderDetail(id: string) {
  headerLeft.innerHTML = `
    <button onclick="window.router.navigate('home')" class="p-2 -ml-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition active:scale-95">
      ${icons.back}
    </button>
  `;
  mainContent.innerHTML = icons.loader;

  try {
    const res = await fetch(`/api/detail?id=${id}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    const data = await res.json();

    if (!data.status || !data.result) {
      mainContent.innerHTML = `<div class="p-4 text-center mt-10 font-medium text-gray-800 dark:text-gray-200">Game tidak ditemukan</div>`;
      return;
    }

    const g = data.result;
    
    let html = `
      <div class="pb-10">
        <div class="relative h-48 w-full bg-gray-200 dark:bg-gray-800 mb-12">
            ${g.screenshots && g.screenshots.length > 0 
                ? `<img src="${g.screenshots[0]}" class="w-full h-full object-cover opacity-60 dark:opacity-40" />` 
                : `<div class="w-full h-full bg-gradient-to-br from-green-400 to-green-600 opacity-20"></div>`}
            <div class="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 to-transparent"></div>
            
            <img src="${g.thumbnail}" alt="Thumbnail" class="absolute -bottom-8 left-6 w-24 h-24 rounded-2xl shadow-xl object-cover border-4 border-white dark:border-gray-900" />
        </div>

        <div class="px-6 space-y-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900 dark:text-white leading-tight mb-2">${g.title}</h2>
            <div class="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
              <span class="font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded">${g.version ? 'v' + g.version : 'Mod'}</span>
              <span>${g.developer || 'Unknown'}</span>
            </div>
          </div>

          ${g.download_url ? `
            <button id="download-btn" onclick="window.downloadApk('${g.download_url}', '${g.title.replace(/'/g, "\\'")}')" class="flex items-center justify-center gap-2 w-full bg-green-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-500/30 hover:bg-green-600 transition active:scale-[0.98]">
              ${icons.download}
              Download APK ${g.size ? `(${g.size})` : ''}
            </button>
          ` : ''}

          ${g.screenshots && g.screenshots.length > 0 ? `
            <div class="flex gap-3 overflow-x-auto pb-2 snap-x hide-scrollbar -mx-6 px-6">
              ${g.screenshots.map((s: string) => `<img src="${s}" class="h-44 w-auto rounded-xl object-cover snap-center flex-shrink-0 border border-gray-100 dark:border-gray-800" />`).join('')}
            </div>
          ` : ''}

          <div class="space-y-6 pt-2">
            ${g.mod_info ? `
              <div class="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-5 rounded-2xl">
                <h3 class="flex items-center gap-2 font-bold text-red-600 dark:text-red-400 mb-2">
                  ${icons.shield} Mod Info
                </h3>
                <p class="text-sm text-red-800 dark:text-red-200/80 leading-relaxed">${g.mod_info}</p>
              </div>
            ` : ''}

            <div>
              <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3">Description</h3>
              <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                ${g.description}
              </p>
            </div>

            ${g.features && g.features.length > 0 ? `
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3">Features</h3>
                <ul class="list-disc pl-5 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
                  ${g.features.map((f: string) => `<li>${f}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    mainContent.innerHTML = html;
  } catch (e) {
    mainContent.innerHTML = `<div class="p-4 text-red-500 text-center mt-10">Gagal memuat detail</div>`;
  }
}

// Initial Render
parseUrl();
render();