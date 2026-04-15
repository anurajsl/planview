import { useThemeStore } from '../../stores/theme.store';

const THEMES = [
  { key: 'light' as const, icon: '☀️', label: 'Light' },
  { key: 'dark' as const, icon: '🌙', label: 'Dark' },
  { key: 'system' as const, icon: '💻', label: 'System' },
];

export default function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="relative group">
      <button
        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
        style={{ border: 'none', background: 'transparent', fontSize: 16 }}
        title={`Theme: ${theme}`}
      >
        {theme === 'dark' ? '🌙' : theme === 'system' ? '💻' : '☀️'}
      </button>
      <div className="absolute top-full right-0 mt-1 w-28 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-600 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        {THEMES.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setTheme(key)}
            className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-none bg-transparent font-medium flex items-center gap-2"
            style={{
              fontFamily: 'inherit',
              color: theme === key ? '#3b82f6' : undefined,
            }}
          >
            <span>{icon}</span>
            <span className="text-slate-700 dark:text-slate-300" style={theme === key ? { color: '#3b82f6' } : {}}>
              {label}
            </span>
            {theme === key && <span className="ml-auto text-blue-500">✓</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
