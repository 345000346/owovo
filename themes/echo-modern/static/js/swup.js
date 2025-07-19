!(function (t, e) {
  'object' == typeof exports && 'undefined' != typeof module
    ? (module.exports = e())
    : 'function' == typeof define && define.amd
      ? define(e)
      : ((t || self).Swup = e())
})(this, function () {
  const t = new WeakMap()
  function e(e, n, o, i) {
    if (!e && !t.has(n)) return !1
    const r = t.get(n) ?? new WeakMap()
    t.set(n, r)
    const s = r.get(o) ?? new Set()
    r.set(o, s)
    const a = s.has(i)
    return (e ? s.add(i) : s.delete(i), a && e)
  }
  const n = (t, e) =>
      String(t)
        .toLowerCase()
        .replace(/[\s/_.]+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+|-+$/g, '') ||
      e ||
      '',
    o = function (t) {
      let { hash: e } = void 0 === t ? {} : t
      return (
        window.location.pathname +
        window.location.search +
        (e ? window.location.hash : '')
      )
    },
    i = function (t, e) {
      ;(void 0 === t && (t = null),
        void 0 === e && (e = {}),
        (t = t || o({ hash: !0 })))
      const n = {
        ...(window.history.state || {}),
        url: t,
        random: Math.random(),
        source: 'swup',
        ...e,
      }
      window.history.replaceState(n, '', t)
    },
    r = (t, n, o, i) => {
      const r = new AbortController()
      return (
        (function (t, n, o, i = {}) {
          const { signal: r, base: s = document } = i
          if (r?.aborted) return
          const { once: a, ...c } = i,
            l = s instanceof Document ? s.documentElement : s,
            h = Boolean('object' == typeof i ? i.capture : i),
            u = (i) => {
              const r = (function (t, e) {
                let n = t.target
                if (
                  (n instanceof Text && (n = n.parentElement),
                  n instanceof Element && t.currentTarget instanceof Element)
                ) {
                  const o = n.closest(e)
                  if (o && t.currentTarget.contains(o)) return o
                }
              })(i, String(t))
              if (r) {
                const t = Object.assign(i, { delegateTarget: r })
                ;(o.call(l, t),
                  a && (l.removeEventListener(n, u, c), e(!1, l, o, d)))
              }
            },
            d = JSON.stringify({ selector: t, type: n, capture: h })
          ;(e(!0, l, o, d) || l.addEventListener(n, u, c),
            r?.addEventListener('abort', () => {
              e(!1, l, o, d)
            }))
        })(t, n, o, (i = { ...i, signal: r.signal })),
        { destroy: () => r.abort() }
      )
    }
  class s extends URL {
    constructor(t, e) {
      ;(void 0 === e && (e = document.baseURI),
        super(t.toString(), e),
        Object.setPrototypeOf(this, s.prototype))
    }
    get url() {
      return this.pathname + this.search
    }
    static fromElement(t) {
      const e = t.getAttribute('href') || t.getAttribute('xlink:href') || ''
      return new s(e)
    }
    static fromUrl(t) {
      return new s(t)
    }
  }
  const a = function (t, e) {
    void 0 === e && (e = {})
    try {
      const o = this
      function n(n) {
        const { status: r, url: a } = u
        return Promise.resolve(
          o.hooks.call(
            'content:replace',
            { page: u, popstate: n },
            void 0,
            (t) => t
          )
        )
          .then(() => {
            if (
              ((o.currentPageId = o.createPage(u).id),
              n && !o.options.animateHistoryBrowsing)
            ) {
              const t = document.documentElement
              return (
                t.classList.remove(...o.getAnimationClasses('out')),
                Promise.resolve()
              )
            }
            return o
              .animatePageOut(n)
              .then((t) => o.animatePageIn(n))
              .then(() => {
                ;(o.triggerEvent('page:view', n),
                  o.options.announcements && o.announce(o.getPageData(u).title),
                  Promise.resolve())
              })
          })
          .catch((t) =>
            t instanceof Error
              ? (console.error(t), Promise.reject(t))
              : (o.go(o.options.page), Promise.reject())
          )
      }
    } catch (t) {
      return Promise.reject(t)
    }
  }
  var l = a
  class c {
    constructor(t) {
      ;((this.swup = t),
        this.swup.options.containers.forEach((t) => {
          if (document.querySelector(t)) return
          const e = new Error(`[swup] Container not found: ${t}`)
          throw (console.warn(e), e)
        }))
    }
    get all() {
      return Array.from(document.querySelectorAll(this.swup.options.containers))
    }
    get main() {
      const t = this.all[0]
      if (t) return t
      throw new Error('[swup] No container found')
    }
    findAll(t) {
      return this.all.map((e) => e.querySelector(t)).filter(Boolean)
    }
    find(t) {
      return this.findAll(t)[0]
    }
  }
  class h {
    constructor(t) {
      ;((this.swup = t),
        (this.pages = new Map()),
        (this.last = void 0),
        this.swup.options.cache ||
          (this.getPage = (t) => Promise.resolve(this.createPage(t))))
    }
    createPage(t) {
      const e = n(t.url)
      return {
        id: e,
        url: t.url,
        document: t.document,
        html: t.html,
        title: t.title,
        blocks: t.blocks,
        metas: t.metas,
      }
    }
    cachePage(t) {
      const e = this.createPage(t)
      ;(this.pages.set(e.id, e),
        (this.last = e),
        this.swup.log(`Cache: Cached page ${e.url}`))
    }
    updatePage(t) {
      const e = this.createPage(t)
      ;(this.pages.set(e.id, e), (this.last = e))
    }
    getPage(t) {
      const e = n(t.url)
      return this.pages.has(e)
        ? (this.swup.log(`Cache: Found page ${t.url}`),
          Promise.resolve(this.pages.get(e)))
        : Promise.reject(new Error(`Cache: Page ${t.url} not found`))
    }
    clear() {
      ;(this.pages.clear(),
        (this.last = void 0),
        this.swup.log('Cache: Cleared'))
    }
  }
  class u {
    constructor(t) {
      this.swup = t
    }
    run(t, e, n, o) {
      const i = 'function' == typeof e ? e.call(this.swup, t, n) : e
      return (this.swup.log(o, i), Promise.resolve(i))
    }
  }
  class d {
    constructor(t) {
      ;((this.swup = t), (this.registry = new Map()))
    }
    add(t, e) {
      this.registry.has(t)
        ? this.registry.get(t).push(e)
        : this.registry.set(t, [e])
    }
    call(t, e, n, o) {
      const i = this.registry.get(t) || []
      return (
        this.swup.log(`Hook: Running ${i.length} handler(s) for ${t}`),
        i.reduce(
          (t, i) => t.then(() => this.runHandler(i, e, n, o)),
          Promise.resolve()
        )
      )
    }
    runHandler(t, e, n, o) {
      const i = new u(this.swup)
      return i.run(e, t, n, `Hook: ${t.name || 'anonymous'}()`)
    }
  }
  const p = function (t, e) {
      const n = document.createElement('html')
      n.innerHTML = t
      const o = Array.from(n.querySelectorAll(this.options.containers))
      if (o.length) {
        const t = o.map((t) => t.outerHTML)
        return {
          title: n.querySelector('title')?.innerText || '',
          blocks: t,
          metas: this.getMetaTags(n),
          html: n.innerHTML,
        }
      }
      const i = new Error(`[swup] No containers found in response of ${e}`)
      throw (console.warn(i), i)
    },
    m = function () {
      return Array.from(
        document.head.querySelectorAll('meta[name^="swup:"]')
      ).map((t) => {
        const e = t.cloneNode()
        return ((e.name = e.name.replace('swup:', '')), e)
      })
    },
    f = function (t) {
      const e = t.html.match(/<body.*?class=(['"])([^'"]+)/),
        n = e ? e[2].split(' ').filter((t) => '' !== t) : []
      return {
        ...t,
        document: new DOMParser().parseFromString(t.html, 'text/html'),
        title: t.document.querySelector('title')?.innerText || '',
        bodyClasses: n,
      }
    },
    g = function (t) {
      return this.getAnchorElement(t)?.href
    },
    v = function (t) {
      const e = t.getAttribute('href')
      if (e) return e
      if (t.hasAttribute('xlink:href')) {
        const e = t.getAttribute('xlink:href')
        if (e) return e
      }
      return null
    },
    b = function (t) {
      if (t instanceof Element) return t.closest('a[href], a[xlink\\:href]')
      if (t instanceof SVGElement) {
        const e = t.ownerSVGElement?.closest('a[href], a[xlink\\:href]')
        if (e) return e
      }
      return null
    },
    y = function (t) {
      const e = this.getPageData(t)
      return e ? Promise.resolve(e) : this.fetchPage(t.url)
    },
    w = function (t) {
      return fetch(t, {
        headers: this.options.requestHeaders,
        signal: this.options.signal,
      })
        .then((e) => {
          const { status: n, url: o } = e
          if (500 <= n)
            return (
              this.triggerEvent('serverError', { status: n, url: o }),
              Promise.reject(new Error(`Server error: ${n} on ${o}`))
            )
          {
            const i = this.getPageDataFromHtml(e.text(), o)
            return i
              ? Promise.resolve(i)
              : Promise.reject(new Error(`Could not parse response for ${o}`))
          }
        })
        .catch((e) => {
          if ('AbortError' === e.name) throw e
          return (
            this.triggerEvent('fetchError', { url: t, error: e }),
            Promise.reject(e)
          )
        })
    },
    E = function (t) {
      const e = t.delegateTarget
      this.swup.followLink(e, t)
    },
    P = function (t) {
      'popstate' === t.type
        ? this.swup.loadPage({ url: o({ hash: !0 }) }, { popstate: t })
        : this.swup.loadPage({ url: g.call(this.swup, t) }, { event: t })
    },
    k = function () {
      this.swup.modules.forEach((t) => t.mount())
    },
    S = function () {
      this.swup.modules.forEach((t) => t.unmount())
    },
    L = function (t, e) {
      const n = this.getAnimationClasses('in')
      ;(document.documentElement.classList.add(...n),
        this.replaceContent(t).then(() => {
          ;(this.triggerEvent('content:replace', t),
            this.triggerEvent('page:in', e),
            this.animatePageIn(e))
        }))
    },
    A = function (t) {
      const e = this.getAnimationClasses('out')
      return (
        document.documentElement.classList.add(...e),
        this.triggerEvent('page:out', t),
        new Promise((e) => {
          setTimeout(e, this.options.animationDuration)
        })
      )
    },
    C = function (t) {
      const e = this.getAnimationClasses('in')
      return new Promise((n) => {
        setTimeout(() => {
          ;(document.documentElement.classList.remove(...e),
            this.triggerEvent('page:in:end', t),
            n())
        }, this.options.animationDuration)
      })
    },
    T = function (t) {
      const e = this.getAnimationClasses('out')
      return new Promise((n) => {
        setTimeout(() => {
          ;(document.documentElement.classList.remove(...e),
            this.triggerEvent('page:out:end', t),
            n())
        }, this.options.animationDuration)
      })
    },
    q = function (t) {
      const e = this.getAnimationClasses('in')
      return (
        document.documentElement.classList.remove(...e),
        Promise.resolve()
      )
    },
    O = function (t) {
      const e = this.getAnimationClasses('out')
      return (
        document.documentElement.classList.remove(...e),
        Promise.resolve()
      )
    },
    x = function (t) {
      const e = this.swup.options.containers,
        n = this.swup.cache.last,
        o = t.blocks,
        i = n.blocks
      if (o.length !== i.length)
        return (console.warn('[swup] Mismatched number of containers'), !1)
      const r = o.map((t, n) => this.replaceBlock(e[n], t)).every(Boolean)
      return r
    },
    _ = function (t, e) {
      const n = document.querySelector(t)
      return n
        ? ((n.outerHTML = e), !0)
        : (console.warn(`[swup] Container not found: ${t}`), !1)
    },
    D = function (t) {
      const e = t.title || ''
      document.title = e
      const n = document.head.querySelectorAll('meta[name^="swup:"]')
      n.forEach((t) => t.remove())
      const o = t.metas
      o.forEach((t) => {
        document.head.appendChild(t)
      })
    },
    N = function (t) {
      const e = t.bodyClasses || []
      document.body.className = e.join(' ')
    },
    M = function (t, e) {
      this.swup.hooks.call(t, e)
    },
    H = function (t, e) {
      this.swup.log(t, e)
    },
    I = function (t) {
      const e = s.fromElement(t)
      return this.swup.shouldIgnoreVisit(e.url, e.el)
    },
    B = function (t, e, n) {
      let o = !1
      return (
        'A' === t.tagName &&
          t.matches('[download], [target="_blank"]') &&
          (o = !0),
        t.matches('[aria-disabled="true"]') && (o = !0),
        e.protocol !== window.location.protocol && (o = !0),
        e.host !== window.location.host && (o = !0),
        e.el?.matches(this.options.ignoreVisits) && (o = !0),
        this.options.linkSelector &&
          !e.el?.matches(this.options.linkSelector) &&
          (o = !0),
        this.hooks.call(
          'visit:ignore',
          { url: e.url, el: e.el },
          void 0,
          (t) => (o = t)
        ),
        o
      )
    },
    R = function (t) {
      const e = s.fromElement(t)
      return e.url
    },
    F = function () {
      return ['ready', ...this.getAnimationClasses('in')]
    },
    j = function (t) {
      return [
        `to-${n(t.url, this.swup.options.page)}`,
        ...this.getAnimationClasses('out'),
      ]
    },
    U = function () {
      return [
        'is-changing',
        'is-rendering',
        'is-popstate',
        ...this.getAnimationClasses('out'),
        ...this.getAnimationClasses('in'),
      ]
    },
    z = function (t) {
      const e = document.createElement('div')
      ;((e.className = 'swup-announcer'),
        e.setAttribute('aria-live', 'assertive'),
        e.setAttribute('aria-atomic', !0),
        e.setAttribute('role', 'alert'),
        document.body.appendChild(e))
      const n = document.createElement('div')
      ;((n.className = 'swup-progress-bar'),
        n.setAttribute('role', 'progressbar'),
        n.setAttribute('aria-valuenow', '0'),
        document.body.appendChild(n))
      const o = new d(this)
      this.hooks = o
      const i = new c(this)
      this.containers = i
      const r = new h(this)
      this.cache = r
      const s = {
        ...{
          animationDuration: 800,
          animationSelector: '[class*="transition-"]',
          cache: !0,
          containers: ['#swup'],
          ignoreVisits: !1,
          linkSelector:
            'a[href]:not([data-no-swup]), a[xlink\\:href]:not([data-no-swup])',
          page: o({ hash: !1 }),
          plugins: [],
          requestHeaders: {},
          resolveUrl: (t) => t,
          skipPopStateHandling: () => !1,
          animateHistoryBrowsing: !1,
          announcements: !0,
        },
        ...t,
      }
      ;((this.options = s),
        (this.currentPageId = n(o({ hash: !1 }), this.options.page)),
        (this.modules = []),
        this.loadPlugins(s.plugins),
        this.log('Swup loaded', this),
        (this.parse = p),
        (this.getMetaTags = m),
        (this.getPageData = f),
        (this.getAnchorElement = b),
        (this.getLinkUrl = v),
        (this.fetchPage = w),
        (this.triggerEvent = M),
        (this.log = H),
        (this.shouldIgnoreVisit = B),
        (this.getAnimationClassesIn = F),
        (this.getAnimationClassesOut = j),
        (this.getAnimationClasses = (t) =>
          'in' === t
            ? this.getAnimationClassesIn()
            : this.getAnimationClassesOut()),
        (this.getCurrentUrl = o),
        (this.cleanupAnimationClasses = U),
        (this.replaceContent = x),
        (this.replaceBlock = _),
        (this.updateHead = D),
        (this.updateBodyClass = N),
        (this.handleLink = P),
        (this.handlePopstate = E),
        (this.mount = k),
        (this.unmount = S),
        (this.animatePageIn = L),
        (this.animatePageOut = A),
        (this.animatePageInFallback = C),
        (this.animatePageOutFallback = T),
        (this.animatePageInCleanup = q),
        (this.animatePageOutCleanup = O),
        this.enable(),
        this.hooks.call('construct', void 0, void 0, (t) => (this.options = t)))
    },
    W = function () {
      return (
        this.modules.forEach((t) => t.unmount()),
        this.delegatedListeners.click?.destroy(),
        this.delegatedListeners.popstate?.destroy(),
        this
      )
    },
    V = function () {
      this.delegatedListeners = {}
      const t = { delegate: !0 }
      ;((this.delegatedListeners.click = r(
        this.options.linkSelector,
        'click',
        this.handleLink.bind(this),
        t
      )),
        window.addEventListener('popstate', this.handlePopstate.bind(this)))
    },
    G = function (t) {
      const e = s.fromUrl(t)
      return this.loadPage({ url: e.url })
    },
    Y = function (t, e) {
      const { url: n } = t,
        { event: o, popstate: r } = e || {}
      if (this.isSamePage(n)) return
      const a = o?.delegateTarget || window
      this.triggerEvent('visit:start', { url: n, event: o, popstate: r, el: a })
      const l = this.cache.getPage(t).catch(() => this.fetchPage(t.url))
      l.then((t) => {
        this.loadPageFromCache(t, e)
      }).catch((t) => {
        this.triggerEvent('fetchError', {
          url: n,
          event: o,
          popstate: r,
          el: a,
          error: t,
        })
      })
    },
    X = function (t, e) {
      const { popstate: n } = e || {}
      this.triggerEvent('page:load', t)
      const o = this.createPage(t)
      ;(this.cache.cachePage(o), this.load(o, { popstate: n }))
    },
    Z = function (t) {
      return n(t) === this.currentPageId
    },
    $ = function (t) {
      ;((this.options.plugins = t), (this.modules = t.map((t) => new t(this))))
    },
    J = function (t) {
      const e = document.querySelector('.swup-announcer')
      e && (e.textContent = t || '')
    }
  return (
    (z.prototype.version = '4.6.0'),
    (z.prototype.enable = V),
    (z.prototype.disable = W),
    (z.prototype.loadPage = Y),
    (z.prototype.loadPageFromCache = X),
    (z.prototype.go = G),
    (z.prototype.isSamePage = Z),
    (z.prototype.loadPlugins = $),
    (z.prototype.announce = J),
    (z.prototype.load = l),
    z
  )
})
//# sourceMappingURL=Swup.umd.js.map
