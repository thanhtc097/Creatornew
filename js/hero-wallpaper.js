/**
 * CreatorNew - Dynamic 4K Hero Wallpaper Rotator
 * Loads high-definition 4K curated wallpapers from Unsplash CDN on every visit/session.
 * 0 host storage cost, 0 host bandwidth used.
 */
(function () {
  'use strict';

  const WALLPAPERS = [
    {
      id: 'creative-workspace',
      photoId: 'photo-1518770660439-4636190af475',
      titleEn: '4K Creative Studio',
      titleVi: 'Góc Sáng Tạo 4K'
    },
    {
      id: 'clean-modern-studio',
      photoId: 'photo-1497366216548-37526070297c',
      titleEn: '4K Modern Office',
      titleVi: 'Không Gian Hiện Đại 4K'
    },
    {
      id: 'cyber-creative-desk',
      photoId: 'photo-1550745165-9bc0b252726f',
      titleEn: '4K Cyber Tech Studio',
      titleVi: 'Góc Công Nghệ Cyber 4K'
    },
    {
      id: 'architectural-studio',
      photoId: 'photo-1600585154340-be6161a56a0c',
      titleEn: '4K Architectural Space',
      titleVi: 'Kiến Trúc Tối Giản 4K'
    },
    {
      id: 'alpine-mountain-mist',
      photoId: 'photo-1506744038136-46273834b3fb',
      titleEn: '4K Alpine Sunrise',
      titleVi: 'Bình Minh Núi Tuyết 4K'
    },
    {
      id: 'cosmic-aurora',
      photoId: 'photo-1534447677768-be436bb09401',
      titleEn: '4K Cosmic Aurora',
      titleVi: 'Cực Quang Huyền Ảo 4K'
    },
    {
      id: 'sunlit-forest',
      photoId: 'photo-1448375240586-882707db888b',
      titleEn: '4K Misty Forest',
      titleVi: 'Rừng Thông Ánh Nắng 4K'
    },
    {
      id: 'fluid-gradient-art',
      photoId: 'photo-1618005182384-a83a8bd57fbe',
      titleEn: '4K Fluid Aesthetics',
      titleVi: 'Nghệ Thuật Trừu Tượng 4K'
    },
    {
      id: 'tokyo-twilight-city',
      photoId: 'photo-1503899036084-c55cdd92da26',
      titleEn: '4K Tokyo Twilight',
      titleVi: 'Hoàng Hôn Tokyo 4K'
    },
    {
      id: 'design-studio-glow',
      photoId: 'photo-1513542789411-b6a5d4f31634',
      titleEn: '4K Designer Studio',
      titleVi: 'Xưởng Thiết Kế 4K'
    },
    {
      id: 'sunset-horizon',
      photoId: 'photo-1507525428034-b723cf961d3e',
      titleEn: '4K Ocean Horizon',
      titleVi: 'Biển Chiều Hoàng Hôn 4K'
    },
    {
      id: 'matrix-creative-tech',
      photoId: 'photo-1526374965328-7f61d4dc18c5',
      titleEn: '4K Code & Creative',
      titleVi: 'Lập Trình & Sáng Tạo 4K'
    }
  ];

  const STORAGE_KEY = 'cn_last_hero_wallpaper';
  const isVi = document.documentElement.lang === 'vi' || window.location.pathname.startsWith('/vi');

  function getOptimalWidth() {
    const dpr = window.devicePixelRatio || 1;
    const screenWidth = window.innerWidth || document.documentElement.clientWidth || 1920;
    const target = screenWidth * dpr;
    if (target <= 1280) return 1280;
    if (target <= 2560) return 2560;
    return 3840; // Full 4K Ultra HD
  }

  function getWallpaperUrl(photoId) {
    const width = getOptimalWidth();
    return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=85`;
  }

  function pickNextWallpaper(currentId) {
    const available = WALLPAPERS.filter(w => w.id !== currentId);
    const selected = available[Math.floor(Math.random() * available.length)] || WALLPAPERS[0];
    return selected;
  }

  let currentWallpaper = null;
  let isLoading = false;

  function applyWallpaper(wallpaper, immediate = false) {
    if (!wallpaper) return;
    const bgLayer = document.getElementById('heroBgLayer');
    const titleEl = document.getElementById('heroWallpaperTitle');
    const btn = document.getElementById('heroWallpaperBtn');
    if (!bgLayer) return;

    const url = getWallpaperUrl(wallpaper.photoId);
    isLoading = true;
    if (btn) btn.classList.add('loading');

    const img = new Image();
    img.src = url;

    img.onload = function () {
      if (!immediate) {
        bgLayer.classList.add('changing');
        setTimeout(() => {
          bgLayer.style.backgroundImage = `url('${url}')`;
          bgLayer.classList.remove('changing');
          isLoading = false;
          if (btn) btn.classList.remove('loading');
        }, 300);
      } else {
        bgLayer.style.backgroundImage = `url('${url}')`;
        isLoading = false;
        if (btn) btn.classList.remove('loading');
      }

      currentWallpaper = wallpaper;
      try {
        localStorage.setItem(STORAGE_KEY, wallpaper.id);
      } catch (e) {}

      if (titleEl) {
        titleEl.textContent = isVi ? wallpaper.titleVi : wallpaper.titleEn;
      }
    };

    img.onerror = function () {
      isLoading = false;
      if (btn) btn.classList.remove('loading');
    };
  }

  function init() {
    const bgLayer = document.getElementById('heroBgLayer');
    if (!bgLayer) return;

    let lastId = null;
    try {
      lastId = localStorage.getItem(STORAGE_KEY);
    } catch (e) {}

    const initial = pickNextWallpaper(lastId);
    // Asynchronously load the 4K wallpaper to keep initial page render instant
    if (window.requestIdleCallback) {
      window.requestIdleCallback(() => applyWallpaper(initial, false));
    } else {
      setTimeout(() => applyWallpaper(initial, false), 100);
    }

    const btn = document.getElementById('heroWallpaperBtn');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        if (isLoading) return;
        const next = pickNextWallpaper(currentWallpaper ? currentWallpaper.id : null);
        applyWallpaper(next, false);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
