window.FFV_CONFIG = {
  APP_NAME: 'Hoa Quả Bay Mắt Vui',
  GAME: {
    SESSION_SECONDS: 120
  },
  MAX_HEARTS: 3,
  COMBO_WINDOW_MS: 1800,
  STORAGE_KEYS: {
    parentPin: 'ffv_parent_pin',
    reports: 'ffv_reports',
    level: 'ffv_level'
  },
  DIFFICULTY_STAGES: [
    { id: 1, label: 'Dễ', startSecond: 0, endSecond: 30, fruitsPerWave: 1, speed: 0.82, radiusScale: 1.24, forbidden: false },
    { id: 2, label: 'Vừa', startSecond: 31, endSecond: 60, fruitsPerWave: 2, speed: 1.02, radiusScale: 1.06, forbidden: false },
    { id: 3, label: 'Nhanh', startSecond: 61, endSecond: 90, fruitsPerWave: 3, speed: 1.22, radiusScale: 0.92, forbidden: false },
    { id: 4, label: 'Thử thách', startSecond: 91, endSecond: 120, fruitsPerWave: 3, speed: 1.34, radiusScale: 0.86, forbidden: true }
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
