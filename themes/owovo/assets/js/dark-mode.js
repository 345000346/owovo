'use strict';

// Reactive Dark Mode with Three-Mode Support (Light → Dark → System)

const overrideSystemPreferences = {{ if .Site.Params.overrideSystemPreferences }}true{{ else }}false{{ end }};
const defaultTheme = '{{ .Site.Params.defaultTheme | default "light" }}';
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

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

function resolveTheme(preference) {
    if (overrideSystemPreferences) {
        return defaultTheme;
    }
    if (preference === 'system') {
        return getSystemPreference();
    }
    return preference;
}

function changeModeMeta(theme) {
    document.documentElement.setAttribute('data-theme', theme);
}

function updateThemeIcons(preference) {
    const icons = document.querySelectorAll('.theme-icon-light, .theme-icon-dark, .theme-icon-system');
    if (!icons.length) {
        return;
    }
    icons.forEach(icon => icon.style.display = 'none');
    const iconToShow = document.querySelector(`.theme-icon-${preference}`);
    if (iconToShow) {
        iconToShow.style.display = 'inline-block';
    }
}

function changeMode() {
    const isDark = getCurrentTheme() === 'dark';
    const themeColor = isDark ? '{{ .Site.Params.themeColorDark }}' : '{{ .Site.Params.themeColor }}';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
        meta.setAttribute('content', themeColor);
    }
}

function applyThemeFromPreference(preference) {
    changeModeMeta(resolveTheme(preference));
    updateThemeIcons(preference);
}

function cycleTheme() {
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

// FOUC prevention: set data-theme before paint (icons/meta wait for DOM)
changeModeMeta(resolveTheme(getUserPreference()));

if (!overrideSystemPreferences) {
    mediaQuery.addEventListener('change', () => {
        if (getUserPreference() === 'system') {
            applyThemeFromPreference('system');
            changeMode();
        }
    });

    window.addEventListener('storage', (event) => {
        if (event.key !== 'theme') {
            return;
        }
        applyThemeFromPreference(event.newValue || 'system');
        changeMode();
    });
}

window.addEventListener("DOMContentLoaded", () => {
    changeMode();
    updateThemeIcons(getUserPreference());

    if (!overrideSystemPreferences) {
        const themeSwitcher = document.getElementById('theme-switcher');
        if (themeSwitcher) {
            themeSwitcher.addEventListener('click', (e) => {
                e.preventDefault();
                cycleTheme();
                changeMode();
            });
        }
    }
}, {once: true});
