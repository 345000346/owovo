// --- 1. DEFINE ALL HELPERS ---

// Nav helpers
const closeNav = () => {
  const navContent = document.getElementById('nav-content-mobile')
  if (navContent) navContent.classList.add('hidden')
  document.body.classList.remove('overflow-hidden')
}

const openNav = () => {
  const navContent = document.getElementById('nav-content-mobile')
  if (navContent) navContent.classList.remove('hidden')
  document.body.classList.add('overflow-hidden')
}

// Theme helper
const handleThemeToggle = () => {
  const htmlElement = document.documentElement
  const currentTheme = htmlElement.getAttribute('data-theme')
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark'
  htmlElement.setAttribute('data-theme', newTheme)
  localStorage.setItem('theme', newTheme)
}

// Scroll helper
const handleScroll = () => {
  const progressBar = document.querySelector('#progress')
  const scrollY = window.scrollY
  const scrollHeight =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight

  if (progressBar) {
    progressBar.style.setProperty(
      '--scroll',
      `${(scrollY / scrollHeight) * 100}%`
    )
  }
}

// Accordion helper
const handleAccordion = () => {
  document.querySelectorAll('.sidebar-accordion-header').forEach((header) => {
    header.addEventListener('click', () => {
      const content = header.nextElementSibling
      const arrow = header.querySelector('.accordion-arrow')
      if (content.style.display === 'block') {
        content.style.display = 'none'
        arrow.style.transform = 'rotate(0deg)'
      } else {
        content.style.display = 'block'
        arrow.style.transform = 'rotate(180deg)'
      }
    })
  })
}

// Content-specific helper
const handleExternalLinks = () => {
  const hostname = window.location.hostname
  document.querySelectorAll('a[href^="http"]').forEach((link) => {
    if (new URL(link.href).hostname !== hostname) {
      link.target = '_blank'
    }
  })
}

// --- 2. ADD PERSISTENT LISTENERS ONCE ---
document.addEventListener('DOMContentLoaded', () => {
  // Nav click listener
  document.body.addEventListener('click', (e) => {
    if (e.target.closest('#nav-toggle')) {
      openNav()
    } else if (
      e.target.closest('#nav-close') ||
      e.target.closest('#nav-content-mobile a')
    ) {
      closeNav()
    }
    // Theme toggle is also handled here since it's a click on the body
    if (
      e.target.closest('#theme-toggle') ||
      e.target.closest('#theme-toggle-mobile')
    ) {
      handleThemeToggle()
    }
  })

  // System color scheme listener
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      const newTheme = e.matches ? 'dark' : 'light'
      document.documentElement.setAttribute('data-theme', newTheme)
    }
  })

  // Scroll listener
  document.addEventListener('scroll', handleScroll)
})

// --- 3. RUN PAGE-SPECIFIC SCRIPTS ---
const runPageScripts = () => {
  handleExternalLinks()
  handleAccordion()
}

// Initial load
runPageScripts()
