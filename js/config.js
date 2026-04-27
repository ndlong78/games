window.FFV_CONFIG = {
  APP_NAME: 'Hoa Quả Bay Mắt Vui',
  TIMER_SECONDS: 60,
  MAX_HEARTS: 3,
  COMBO_WINDOW_MS: 1800,
  STORAGE_KEYS: {
    parentPin: 'ffv_parent_pin',
    reports: 'ffv_reports',
    level: 'ffv_level'
  },
  LEVELS: [
    { id: 1, label: 'Level 1', fruitsPerWave: 1, speed: 0.85, radiusScale: 1.2, forbidden: false, redOnly: false },
    { id: 2, label: 'Level 2', fruitsPerWave: 2, speed: 1, radiusScale: 1, forbidden: false, redOnly: false },
    { id: 3, label: 'Level 3', fruitsPerWave: 2, speed: 1.2, radiusScale: 0.84, forbidden: false, redOnly: false },
    { id: 4, label: 'Level 4', fruitsPerWave: 3, speed: 1.3, radiusScale: 0.82, forbidden: true, redOnly: false },
    { id: 5, label: 'Level 5', fruitsPerWave: 3, speed: 1.35, radiusScale: 0.8, forbidden: true, redOnly: true }
  ],
  FRUITS: [
    { type: 'apple', emoji: '🍎', color: '#ef4a4a', score: 10, red: true },
    { type: 'orange', emoji: '🍊', color: '#ff9f1a', score: 10, red: false },
    { type: 'banana', emoji: '🍌', color: '#f5d547', score: 12, red: false },
    { type: 'watermelon', emoji: '🍉', color: '#27ae60', score: 15, red: true },
    { type: 'strawberry', emoji: '🍓', color: '#d63031', score: 13, red: true },
    { type: 'grape', emoji: '🍇', color: '#7d3c98', score: 12, red: false }
  ],
  FORBIDDEN: {
    type: 'sad_cloud',
    emoji: '☁️',
    color: '#9ca9bf'
  }
};
