
  async function get_meta_data(item) {
    const storage_key = "cache_addon_" + item.id;
    let cache = localStorage.getItem(storage_key);
    if (cache) cache = JSON.parse(cache);
    let d = new Date(cache && cache.t ? cache.t : 0);
    d.setDate(d.getDate() + 1);
    if (d < Date.now()) {
      // Refresh cache
      const url =
        "https://api.github.com/repos/" +
        item.github
          .replace("https://www.github.com/", "")
          .replace("https://github.com/", "");
      let response = await fetch(url);
      let data = await response.json();
      if (!(data instanceof Object)) throw new TypeError();
      cache = {
        stars: data.stargazers_count,
        forks: data.forks_count,
        issues: data.open_issues_count,
        license: data.license,
        language: data.language,
        pushed_at: new Date(data.pushed_at),
        t: Date.now()
      };
      // Get releases
      if (data.releases_url) {
        let response = await fetch(data.releases_url);
        let data = await response.json();
        if (!(data instanceof Object)) throw new TypeError();
        cache.releases = data.map(item => {
          return {
            published_at: item.published_at,
            version: item.tag_name,
            label: item.name
          };
        });
      }

      localStorage.setItem(storage_key, JSON.stringify(cache));
    }
    gh_meta_data = cache;
  }
