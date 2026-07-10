'use strict';

// Reactive Dark Mode with Three-Mode Support (Light → Dark → System)

const overrideSystemPreferences = {{ if .Site.Params.overrideSystemPreferences }}true{{ else }}false{{ end }};
const defaultTheme = '{{ .Site.Params.defaultTheme | default "light" }}';
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

applyThemeFromPreference(getUserPreference());

mediaQuery.addEventListener('change', () => {
    if (!overrideSystemPreferences && getUserPreference() === 'system') {
        applyThemeFromPreference('system');
        changeMode();
    }
});

window.addEventListener("DOMContentLoaded", () => {
    changeMode();
    updateThemeIcons(getUserPreference());

    const themeSwitcher = document.getElementById('theme-switcher');
    if (themeSwitcher) {
        themeSwitcher.addEventListener('click', (e) => {
            e.preventDefault();
            if (!overrideSystemPreferences) {
                cycleTheme();
                changeMode();
            }
        });
    }
}, {once: true});

window.addEventListener('storage', function (event) {
    if (event.key !== 'theme' || overrideSystemPreferences) {
        return;
    }
    applyThemeFromPreference(event.newValue || 'system');
    changeMode();
});

function getUserPreference() {
    if (overrideSystemPreferences) {
        return defaultTheme;
    }
    return localStorage.getItem('theme') || 'system';
}

function getSystemPreference() {
    return mediaQuery.matches ? 'dark' : 'light';
}

function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || getSystemPreference();
}

function applyThemeFromPreference(preference) {
    let actualTheme;
    if (overrideSystemPreferences) {
        actualTheme = defaultTheme;
    } else if (preference === 'system') {
        actualTheme = getSystemPreference();
    } else {
        actualTheme = preference;
    }
    changeModeMeta(actualTheme);
    updateThemeIcons(preference);
}

function cycleTheme() {
    if (overrideSystemPreferences) {
        return;
    }
    const currentPreference = getUserPreference();
    let newPreference;
    switch (currentPreference) {
        case 'light':
            newPreference = 'dark';
            break;
        case 'dark':
            newPreference = 'system';
            break;
        case 'system':
        default:
            newPreference = 'light';
            break;
    }
    localStorage.setItem('theme', newPreference);
    applyThemeFromPreference(newPreference);
}

function updateThemeIcons(preference) {
    const icons = document.querySelectorAll('.theme-icon-light, .theme-icon-dark, .theme-icon-system');
    icons.forEach(icon => icon.style.display = 'none');
    const iconClass = overrideSystemPreferences
        ? `.theme-icon-${defaultTheme}`
        : `.theme-icon-${preference}`;
    const iconToShow = document.querySelector(iconClass);
    if (iconToShow) {
        iconToShow.style.display = 'inline-block';
    }
}

function changeModeMeta(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

function changeMode() {
    const isDark = getCurrentTheme() === 'dark';
    const themeColor = isDark ? '{{ .Site.Params.themeColorDark }}' : '{{ .Site.Params.themeColor }}';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', themeColor);
    }
}
