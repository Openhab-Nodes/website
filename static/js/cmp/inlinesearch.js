function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  const html = document.documentElement;
  return rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || html.clientHeight) &&
    rect.right <= (window.innerWidth || html.clientWidth);
}

class Popover {
  constructor(trigger, popoverTemplate, { position = 'top', className = 'popover' }) {
    this.trigger = trigger;
    this.position = position;
    this.className = className;
    this.isTemplate = false;
    this.orderedPositions = ['top', 'right', 'bottom', 'left'];

    this.isTemplate = popoverTemplate.tagName.toUpperCase() == "TEMPLATE";
    if (this.isTemplate) {
      this.popover = document.createElement('div');
      this.popover.innerHTML = popoverTemplate.innerHTML;
    } else {
      this.popover = popoverTemplate;
    }
    this.popover.style.zIndex = 100;

    Object.assign(this.popover.style, {
      position: 'fixed'
    });

    this.popover.classList.add(className);

    this.handleWindowEvent = () => {
      if (this.isVisible) {
        this.reposition();
      }
    };

    this.handleDocumentEvent = (evt) => {
      if (this.isVisible && evt.target !== this.trigger && evt.target !== this.popover) {
        this.destroy();
      }
    };
  }

  get isVisible() {
    return this.isTemplate ? document.body.contains(this.popover) : this.popover.style.visibility !== "hidden";
  }

  show() {
    if (this.isVisible) return;

    document.addEventListener('click', this.handleDocumentEvent);
    window.addEventListener('scroll', this.handleWindowEvent);
    window.addEventListener('resize', this.handleWindowEvent);

    if (this.isTemplate)
      document.body.appendChild(this.popover);
    else {
      this.popover.style.setProperty('visibility', 'visible', 'important');
    }

    this.reposition();
  }

  reposition() {
    const { top: triggerTop, left: triggerLeft } = this.trigger.getBoundingClientRect();
    const { offsetHeight: triggerHeight, offsetWidth: triggerWidth } = this.trigger;
    const { offsetHeight: popoverHeight, offsetWidth: popoverWidth } = this.popover;

    const positionIndex = this.orderedPositions.indexOf(this.position);

    const positions = {
      top: {
        name: 'top',
        top: triggerTop - popoverHeight,
        left: triggerLeft - ((popoverWidth - triggerWidth) / 2)
      },
      right: {
        name: 'right',
        top: triggerTop - ((popoverHeight - triggerHeight) / 2),
        left: triggerLeft + triggerWidth
      },
      bottom: {
        name: 'bottom',
        top: triggerTop + triggerHeight,
        left: triggerLeft - ((popoverWidth - triggerWidth) / 2)
      },
      left: {
        name: 'left',
        top: triggerTop - ((popoverHeight - triggerHeight) / 2),
        left: triggerLeft - popoverWidth
      }
    };

    const position = this.orderedPositions
      .slice(positionIndex)
      .concat(this.orderedPositions.slice(0, positionIndex))
      .map(pos => positions[pos])
      .find(pos => {
        this.popover.style.top = `${pos.top}px`;
        this.popover.style.left = `${pos.left}px`;
        return isInViewport(this.popover);
      });

    this.orderedPositions.forEach(pos => {
      this.popover.classList.remove(`${this.className}--${pos}`);
    });

    if (position) {
      this.popover.classList.add(`${this.className}--${position.name}`);
    } else {
      this.popover.style.top = positions.bottom.top;
      this.popover.style.left = positions.bottom.left;
      this.popover.classList.add(`${this.className}--bottom`);
    }
  }

  destroy() {
    if (this.isTemplate)
      this.popover.remove();
    else
      this.popover.style.setProperty('visibility', 'hidden', 'important');

    document.removeEventListener('click', this.handleDocumentEvent);
    window.removeEventListener('scroll', this.handleWindowEvent);
    window.removeEventListener('resize', this.handleWindowEvent);
  }

  toggle() {
    if (this.isVisible) {
      this.destroy();
    } else {
      this.show();
    }
  }
}

function tmpContents(link, title, tags, categories, snippet) {
    return `
    <div class="search-results-summary">
        <h4>${title}</h4>
        <p>${snippet}  &hellip; <a class="search-item-more" href="${link}">[more]</a></p>
        ${ tags != null ? `<p>${tags}</p>` : ''}
    </div>
    `;
}
function tmpTitle(link, title, tags, categories, summary) {
    return `
    <div class="search-results-summary">
        <h4><a class="search-item" href="${link}">${title}</a></h4>
        ${ summary.length ? `<p>${summary} &hellip;</p>` : ''}
        ${ tags != null ? `<p>${tags}</p>` : ''}
    </div>
    `;
}

const summaryInclude = 60;
const fuseOptions = {
    shouldSort: true,
    includeMatches: true,
    threshold: 0.3,
    tokenize: false,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 2,
    keys: [
        { name: "title", weight: 0.8 },
        { name: "contents", weight: 0.5 },
        { name: "tags", weight: 0.3 },
        //{ name: "categories", weight: 0.3 }
    ]
};

window.customElements.define('ui-inlinesearch', class extends HTMLElement {
    constructor() {
        super();
    }

    clear(resultshtml, resultshtmltags, resultshtmlfulltext, resultshtmlpages) {
        while (resultshtml.firstChild) {
            resultshtml.firstChild.remove();
        }
        while (resultshtmltags.firstChild) {
            resultshtmltags.firstChild.remove();
        }
        while (resultshtmlfulltext.firstChild) {
            resultshtmlfulltext.firstChild.remove();
        }
        while (resultshtmlpages.firstChild) {
            resultshtmlpages.firstChild.remove();
        }
    }

    renderResult(result, maxresults_, startPage, resultshtml, resultshtmltags, resultshtmlfulltext, resultshtmlpages) {
        const startIndex = startPage * maxresults_;
        const maxresults = startIndex + maxresults_;
        let entryTags = null;

        let foundcontents = 0;
        let foundtags = [];

        for (let entry of result) {
            for (let mvalue of entry.matches) {
                if (!entryTags && entry.item.tags) {
                    entryTags = "";
                    for (let element of entry.item.tags) {
                        entryTags = entryTags + "<a href='/tags/" + element + "'>" + "#" + element + "</a> ";
                    }                }

                if (mvalue.key === "contents") {
                    ++foundcontents;
                    if (foundcontents-1 < startIndex) continue;
                    if (foundcontents > maxresults) continue;

                    //console.log("contents",mvalue);
                    let resultPart = document.createElement("div");
                    const start = mvalue.indices[0][0] - summaryInclude > 0 ? mvalue.indices[0][0] - summaryInclude : 0;
                    const end = mvalue.indices[0][1] + summaryInclude < entry.item.contents.length ? mvalue.indices[0][1] + summaryInclude : entry.item.contents.length;
                    let snippet = entry.item.contents.substring(start, end);
                    resultPart.innerHTML = tmpContents(entry.item.permalink,
                        entry.item.title, entryTags, entry.item.categories, snippet);
                    resultshtmlfulltext.appendChild(resultPart);
                } else if (mvalue.key === "tags") {
                    foundtags.push(mvalue.value);
                } else if (mvalue.key === "title") {
                    ++foundcontents;
                    if (foundcontents-1 < startIndex) continue;
                    if (foundcontents > maxresults) continue;

                    let resultPart = document.createElement("div");
                    resultPart.innerHTML = tmpTitle(entry.item.permalink,
                        entry.item.title, entryTags, entry.item.categories, entry.item.contents.substring(0, summaryInclude));
                    resultshtml.appendChild(resultPart);
                }
            }
            entryTags = null;
        }

        entryTags = "";
        for (let element of foundtags) {
            entryTags = entryTags + "<a href='/tags/" + element + "'>" + "#" + element + "</a> ";
        }        resultshtmltags.innerHTML = entryTags;

        let pages = foundcontents / maxresults_;
        if (pages > 1) {
            for (let c = 0; c < pages; ++c) {
                const link = document.createElement("a");
                link.innerText = c;
                if (c != startPage) {
                    link.href = "?s=" + c * maxresults_;
                    link.onclick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        this.clear(resultshtml, resultshtmltags, resultshtmlfulltext, resultshtmlpages);
                        this.renderResult(result, maxresults_, c, resultshtml, resultshtmltags, resultshtmlfulltext, resultshtmlpages);
                    };
                }
                link.classList.add("m-1", "border", "px-2");
                resultshtmlpages.appendChild(link);
            }
        }
    }

    init() {
        let target = document.getElementById(this.getAttribute("target"));

        const popoverTemplate = document.createElement('template');
        popoverTemplate.innerHTML = `
        <div class="card p-1 mb-2">Document Titles</div><div id="search-results"></div>
        <div class="card p-1 mb-2">Fulltext matches</div><div id="search-results-fulltext"></div>
        <div class="card p-1 mb-2">Tags</div><div id="search-results-tags"></div>
        <div id="search-results-pages"></div>
        `;

        if (!target) {
            console.warn("Did not find target: ", target);
            return;
        }
        if (!popoverTemplate) {
            console.warn("Did not find template for ", target.id);
            return;
        }

        const input = target.querySelector("input");
        if (!input) {
            console.warn("Did not find input for ", target.id);
            return;
        }
        //console.log("INIT", input);

        if (this.popover) this.popover.destroy();
        this.popover = new Popover(target, popoverTemplate, { position: 'bottom' });

        this.lastresultlen = 0;
        target.action = "#";
        target.onsubmit = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };
        const maxresults = 5;
        input.onmouseup = () => {
            window.requestAnimationFrame(() => {
                this.popover.show();
            });
        };
        input.onkeyup = (e) => {
            this.popover.show();
            var result = input.value.length ? this.fuse.search(input.value) : [];
            const resultshtml = this.popover.popover.querySelector("#search-results");
            const resultshtmltags = this.popover.popover.querySelector("#search-results-tags");
            const resultshtmlfulltext = this.popover.popover.querySelector("#search-results-fulltext");
            const resultshtmlpages = this.popover.popover.querySelector("#search-results-pages");
            this.clear(resultshtml, resultshtmltags, resultshtmlfulltext, resultshtmlpages);
            if (result.length > 0) {
                this.renderResult(result, maxresults, 0, resultshtml, resultshtmltags, resultshtmlfulltext, resultshtmlpages);
            } else if (this.lastresultlen != 0) {
                resultshtml.innerHTML = `<p class=\"search-results-empty\">No matches found</p>`;
            }
            this.lastresultlen = result.length;
        };
    }

    async connectedCallback() {
        let index = "";
        if (this.hasAttribute("index")) index = "/"+ this.getAttribute("index");
        let imp = import('../../../../../../../../js/fuse.min.js');
        let jsonindex = await fetch(index+"/index.json");
        let Fuse = await imp;
        Fuse = Fuse.default();
        jsonindex = await jsonindex.json();
        this.fuse = new Fuse(jsonindex, fuseOptions);
        this.init();
    }
    disconnectedCallback() {
        if (this.popover) this.popover.destroy();
    }
});
//# sourceMappingURL=inlinesearch.js.map
