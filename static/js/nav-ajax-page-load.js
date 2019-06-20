/**
 * Class to handle a loaded page
 */
class Page {
  constructor(dom) {
    this.dom = dom;
  }

  /**
   * Performs a querySelector in the page content or document
   *
   * @param  {string} selector
   * @param  {DocumentElement} context
   *
   * @return {Node}
   */
  querySelector(selector, context = this.dom) {
    const result = context.querySelector(selector);

    if (!result) {
      throw new Error(`Could not find target "${selector}"`);
    }

    return result;
  }

  /**
   * Performs a querySelector
   *
   * @param  {string} selector
   * @param  {DocumentElement} context
   *
   * @return {Nodelist}
   */
  querySelectorAll(selector, context = this.dom) {
    const result = context.querySelectorAll(selector);

    if (!result.length) {
      throw new Error(`Not found the target "${selector}"`);
    }

    return result;
  }

  /**
   * Removes elements in the document
   *
   * @param  {String} selector
   *
   * @return {this}
   */
  removeContent(selector) {
    this.querySelectorAll(selector, document).forEach(element =>
      element.remove()
    );

    return this;
  }

  async timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Replace an element in the document by an element in the page
   * Optionally, it can execute a callback to the new inserted element
   *
   * @param  {String} selector
   * @param  {Function|undefined} callback
   *
   * @return {this}
   */
  async replaceContent(selector = 'body', options = null) {
    const content = this.querySelector(selector);

    if (!options || !options.animationClass)
      this.querySelector(selector, document).replaceWith(content);
    else {
      try {
        const oldMain = this.querySelector(selector, document);
        const duration = options.duration || 1;
        // First insert the new element, just before the old one.
        // The grid layout will make sure the old one is still at the front
        oldMain.parentNode.insertBefore(content, oldMain);
        // Add animation class and remove old after timeout
        oldMain.classList.add(options.animationClass);
        await this.timeout(duration * 1000)
        oldMain.remove();
      } catch (e) {
        console.warn("ANIM failed", e);
      }
    }

    if (options && typeof options.callback === 'function') {
      options.callback(content);
    }

    return this;
  }

  /**
   * Appends the content of an element in the page in other element in the document
   * Optionally, it can execute a callback for each new inserted elements
   *
   * @param  {String} selector
   * @param  {Function|undefined} callback
   *
   * @return {this}
   */
  appendContent(target = 'body', callback = undefined) {
    const content = Array.from(this.querySelector(target).childNodes);
    const fragment = document.createDocumentFragment();

    content.forEach(item => fragment.appendChild(item));

    this.querySelector(target, document).append(fragment);

    if (typeof callback === 'function') {
      content
        .filter(item => item.nodeType === Node.ELEMENT_NODE)
        .forEach(callback);
    }

    return this;
  }

  replaceNavReferences(context = 'head') {
    const documentContext = this.querySelector(context, document);
    const pageContext = this.querySelector(context);

    documentContext.querySelectorAll('link[rel="prev"]').forEach(link => link.remove());
    documentContext.querySelectorAll('link[rel="next"]').forEach(link => link.remove());
    documentContext.querySelectorAll('link[rel="parent"]').forEach(link => link.remove());

    var link;
    link = pageContext.querySelector('link[rel="prev"]');
    if (link) documentContext.append(link);
    link = pageContext.querySelector('link[rel="next"]');
    if (link) documentContext.append(link);
    link = pageContext.querySelector('link[rel="parent"]');
    if (link) documentContext.append(link);

    return this;
  }

  addNewStyles(context = 'head') {
    const currentPage = this.querySelector(context, document);
    const newPage = this.querySelector(context);

    // Inline styles are perfomed immediately
    currentPage
      .querySelectorAll('style')
      .forEach(style => style.remove());
    newPage
      .querySelectorAll('style')
      .forEach(style => currentPage.append(style));


    this.oldLinks = Array.from(
      currentPage.querySelectorAll('link[rel="stylesheet"]')
    )

    const newLinks = Array.from(
      newPage.querySelectorAll('link[rel="stylesheet"]')
    ).filter(newLink => {
      let found = this.oldLinks.findIndex(oldLink => oldLink.href == newLink.href);
      if (found != -1) {
        this.oldLinks.splice(found, 1);
        return false;
      }
      return true;
    });

    // Don't remove stylesheets with the data-keep flag like in:
    // <link rel="stylesheet" href="css/tutorial.css" type="text/css" data-keep="true" />
    this.oldLinks = this.oldLinks.filter(e => !e.dataset.keep);

    return Promise.all(
      newLinks.map(
        link =>
          new Promise((resolve, reject) => {
            link.addEventListener('load', resolve);
            link.addEventListener('error', reject);
            currentPage.append(link);
          })
      )
    ).then(() => this);
  }

  removeOldStyles(context = 'head') {
    for (let link of this.oldLinks) {
      link.remove();
    }
    delete this.oldLinks;
    return this;
  }

  /**
   * Change the scripts of the current page
   *
   * @param {string} context
   *
   * @return Promise
   */
  replaceScripts(context = 'head') {
    const documentContext = this.querySelector(context, document);
    const pageContext = this.querySelector(context);
    const oldScripts = Array.from(
      documentContext.querySelectorAll('script')
    );
    const newScripts = Array.from(pageContext.querySelectorAll('script'));

    oldScripts.forEach(script => {
      if (!script.src) {
        script.remove();
        return;
      }

      const index = newScripts.findIndex(
        newScript => newScript.src === script.src
      );

      if (index === -1) {
        script.remove();
      } else {
        newScripts.splice(index, 1);
      }
    });

    return Promise.all(
      newScripts.map(
        script =>
          new Promise((resolve, reject) => {
            const scriptElement = document.createElement('script');

            scriptElement.type = script.type || 'text/javascript';
            scriptElement.defer = script.defer;
            scriptElement.async = script.async;

            if (script.src) {
              scriptElement.src = script.src;
              scriptElement.addEventListener('load', resolve);
              scriptElement.addEventListener('error', reject);
              documentContext.append(scriptElement);
              return;
            }

            scriptElement.innerText = script.innerText;
            documentContext.append(script);
            resolve();
          })
      )
    ).then(() => Promise.resolve(this));
  }
}

/**
 * Class to load an url and generate a page with the result
 */
export class UrlLoader {
  constructor(url) {
    this.url = url;
    this.html = null;
    this.state = {};
  }

  /**
   * Performs a fetch to the url and return a promise
   *
   * @return {Promise}
   */
  fetch() {
    return fetch(this.url);
  }

  /**
   * Go natively to the url. Used as fallback
   */
  fallback() {
    document.location = this.url;
  }

  /**
   * Load the page with the content of the page
   *
   * @return {Promise}
   */
  async load(replace = false, state = null) {
    if (this.html) {
      const page = new Page(parseHtml(this.html));
      this.setState(page.dom.title, replace, state);
      return page;
    }

    const html = await this.fetch()
      .then(res => {
        if (res.status < 200 || res.status >= 300) {
          throw new Error(`The request status code is ${res.status}`);
        }

        return res;
      })
      .then(res => res.text());

    if (this.html !== false) {
      this.html = html;
    }

    const page = new Page(parseHtml(html));
    this.setState(page.dom.title, replace, state);
    return page;
  }

  setState(title, replace = false, state = null) {
    document.title = title;

    if (state) {
      this.state = state;
    }

    if (this.url !== document.location.href) {
      if (replace) {
        history.replaceState(this.state, null, this.url);
      } else {
        history.pushState(this.state, null, this.url);
      }
    } else {
      history.replaceState(this.state, null, this.url);
    }
  }
}

/**
 * Class to submit a form and generate a page with the result
 */
export class FormLoader extends UrlLoader {
  constructor(form) {
    let url = form.action.split('?', 2).shift();
    const method = (form.method || 'GET').toUpperCase();

    if (method === 'GET') {
      url += '?' + new URLSearchParams(new FormData(form));
    }

    super(url);

    this.html = false;
    this.method = method;
    this.form = form;
  }

  /**
   * Submit natively the form. Used as fallback
   */
  fallback() {
    this.form.submit();
  }

  /**
   * Performs a fetch with the form data and return a promise
   *
   * @return {Promise}
   */
  fetch() {
    const options = { method: this.method };

    if (this.method === 'POST') {
      options.body = new FormData(this.form);
    }

    return fetch(this.url, options);
  }
}

function parseHtml(html) {
  html = html.trim().replace(/^\<!DOCTYPE html\>/i, '');
  const doc = document.implementation.createHTMLDocument();
  doc.documentElement.innerHTML = html;

  return doc;
}


/**
 * A filter function
 * 
 * @param {Element} element The element that was clicked on.
 * @param {String|URL} url The url to navigate to.
 * @returns Return true a full page reload is required.
 *  Return false if a html replacement is fine.
 *  Return null if the page navigation should be aborted.
 */
function fnRequirePageReloadPrototype(element, url) {

}

/**
 * Class to handle the navigation history
 */
class Navigator {
  constructor(handler) {
    this.handler = handler;
    this.fnRequirePageReloadList = [
      async (el, url) => !(url && url.indexOf(`${document.location.protocol}//${document.location.host}`) === 0),
      async (el, url) => url === document.location.href ? null : false,
      async (el, url) => new URL(url).hash === "#" ? null : false

    ];
  }

  /**
   * Add a filter. Depending on the return value a page will be served via
   * partial html replacement, a complete page reload or the page navigation will
   * be aborted.
   * 
   * @param {fnRequirePageReloadPrototype} fnRequirePageReload The filter function accepting two arguments: the element clicked and url
   *
   * @return {this}
   */
  addFilter(fnRequirePageReload) {
    this.fnRequirePageReloadList.push(fnRequirePageReload);
    return this;
  }

  async consultFilters(event, el, url) {
    for (let fnRequirePageReload of this.fnRequirePageReloadList) {
      const r = await fnRequirePageReload(el, url);
      if (r === true) {
        event.stopPropagation();
        // Default handling. Clone the old event and attach a "alreadyHandled" property.
        // The event will arrive at the a.click handler further down, but not handled
        // ourself anymore when that property is noticed.
        const new_e = new event.constructor(event.type, event);
        new_e.alreadyHandled = true;
        el.dispatchEvent(new_e);
        return false;
      } else if (r === null)
        return false;
    }
    return true;
  }

  /**
   * Init the navigator, attach the events to capture the history changes
   *
   * @return {this}
   */
  init() {
    var handlePopState = (event) => {
      this.go(document.location.href, event);
    }

    delegate('click', 'a', async (event, link) => {
      window.removeEventListener('popstate', handlePopState);
      if (event.alreadyHandled) return;
      event.preventDefault();
      if (await this.consultFilters(event, link, link.href)) this.go(link.href, event);
      setTimeout(() => window.addEventListener('popstate', handlePopState), 0);
    });

    delegate('submit', 'form', (event, form) => {
      if (event.alreadyHandled) return;
      if (this.consultFilters(event, form, resolve(form.action)))
        this.submit(form, event);
    });

    window.addEventListener('popstate', handlePopState);

    return this;
  }

  /**
   * Go to other url.
   *
   * @param  {string} url
   * @param  {Event} event
   *
   * @return {Promise|void}
   */
  go(url, event) {
    return this.load(new UrlLoader(resolve(url)), event);
  }

  /**
   * Submit a form via ajax
   *
   * @param  {HTMLFormElement} form
   * @param  {Event} event
   *
   * @return {Promise}
   */
  submit(form, event) {
    return this.load(new FormLoader(form), event);
  }

  /**
   * Execute a page loader
   *
   * @param  {UrlLoader|FormLoader} loader
   * @param  {Event} event
   *
   * @return {Promise}
   */
  load(loader, event) {
    try {
      return this.handler(loader, event);
    } catch (err) {
      console.error(err);
      loader.fallback();

      return Promise.resolve();
    }
  }
}

const link = document.createElement('a');

function resolve(url) {
  link.setAttribute('href', url);
  return link.href;
}

function delegate(event, selector, callback) {
  document.addEventListener(
    event,
    function (event) {
      for (
        let target = event.target;
        target && target != this;
        target = target.parentNode
      ) {
        if (target.matches(selector)) {
          callback.call(target, event, target);
          break;
        }
      }
    },
    true
  );
}

/**
 * @category Web Components
 * @customelement nav-ajax-page-load
 * @description 
 * To avoid flickering of the website-shell, an ajax loading mechanism
 * is used. This is a progressive enhancement and the page works without
 * it as well.
 * 
 * The script only replaces part of the page with the downloaded content.
 * That is:
 * - All styles and scripts linked in the body section
 * - <main>, <footer>, <section.header>, <aside>, <nav> is replaced.
 * - "prev"/"next"/"parent" ref links in <head> are replaced.
 * - A "DOMContentLoaded" event is emitted after loading
 * 
 * A not-found message is shown if loading failed.
 * 
 * A replacement does not happen if the link points to the same page or ("#").
 * 
 * @see https://github.com/oom-components/page-loader
 * @example <caption>An example</caption>
 * <nav-ajax-page-load></nav-ajax-page-load>
 */
class NavAjaxPageLoad extends HTMLElement {
  constructor() {
    super();

    this.nav = new Navigator((loader, event) => {
      if (event && event.target && event.target.classList)
        event.target.classList.add("disabled");
      loader.load()
        .then(page => page.addNewStyles("body"))
//        .then(page => this.checkReload(event.target, "aside") ? page.replaceContent('aside') : page)
//        .then(page => this.checkReload(event.target, "nav") ? page.replaceContent('body>nav') : page)
        .then(page => page.replaceNavReferences())
        .then(page => page.replaceContent('footer#footer'))
        .then(page => page.replaceContent('header#header .navbar-nav'))
        .then(page => page.replaceContent('header #navbarlogo'))
        .then(page => page.replaceContent('main'))
        .then(page => page.removeOldStyles("body"))
        .then(page => page.replaceScripts("body"))
        .then(() => this.prepareLoadedContent(event))
        .catch(e => { // Connection lost? Check login
          console.log("Failed to load page:", e);
          document.querySelector("main").innerHTML = `
<main class='centered m-4'>
  <section class='card p-4'>
    <h4>Error loading the page ☹</h4>
    ${e.message ? e.message : e}
  </section>
</main>
`;
          document.dispatchEvent(new Event('FailedLoading'));
        })
    });

    // Perform default action if clicking on a same page link where only the hash differs.
    // Required for anchor links
    this.nav.addFilter((el, url) => ((el && el.dataset && !el.dataset.noReload) && new URL(url).pathname == window.location.pathname));
    this.nav.addFilter((el, url) => {
      if (!el || ! el.dataset) return false;
      return el.dataset.fullreload?true:false;
    });

    // Abort page request on demand
    this.nav.addFilter((el, url) => {
      if (this.hasUnsavedChanges) {
        const r = window.confirm("You have unsaved changes. Dismiss them?");
        if (r) this.hasUnsavedChanges = false;
        return r ? false : null; // Perform a normal xhr page replacement or abort the request
      }
      return false;
    });

    this.boundUnsavedChanges = (event) => {
      this.hasUnsavedChanges = event.detail;
      window.removeEventListener("beforeunload", this.boundBeforeUnload, { passive: false });
      if (this.hasUnsavedChanges) window.addEventListener("beforeunload", this.boundBeforeUnload, { passive: false });
    }
    this.boundBeforeUnload = (event) => {
      if (this.hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = 'You have unsaved changes which will not be saved.';
        return event.returnValue;
      }
    }
  }

  prepareLoadedContent(event) {
    if (event.target && event.target.classList) event.target.classList.remove("disabled");
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.dispatchEvent(new Event('DOMContentLoaded'));
    }, 50);
  }

  checkReload(target, section) {
    const d = (target && target.dataset && target.dataset.noReload) ? target.dataset.noReload.split(",") : [];
    return !d.includes(section);
  }

  connectedCallback() {
    this.nav.init();

    document.addEventListener("unsavedchanges", this.boundUnsavedChanges, { passive: true });

    if (localStorage.getItem('skiphome') != "true") return;
    const hasRedirected = sessionStorage.getItem("redirected");
    if (!hasRedirected) {
      sessionStorage.setItem("redirected", "true");
      if (window.location.pathname === "/index.html") {
        this.nav.go("maintenance.html");
        return;
      }
    }
  }
  disconnectedCallback() {
    document.removeEventListener("unsavedchanges", this.boundUnsavedChanges, { passive: true });
    window.removeEventListener("beforeunload", this.boundBeforeUnload, { passive: false });
  }
}

customElements.define('nav-ajax-page-load', NavAjaxPageLoad);