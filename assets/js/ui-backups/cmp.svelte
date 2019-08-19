<script>
  let storage;
  let backupsRef;
  let error_message = null;
  let backups = [];
  let cache_valid_until;
  let uploadfile;
  let upload_current;
  /** Layout of a backup entry
   *     {
      title: "Test",
      uid: "abc",
      id: "test",
      iid: "dummy",
      install_name: "Dummy",
      created_at: Date.now(),
      size: 12457634
    }
    */

  export let classes = "";

    /// User Aware Component
  import { onDestroy } from "svelte";
  let user = null;
  let data = { installations: {} };
  let actionqueue = null;
  let onDestroyProxy = () => {};
  let userdb = null;
  onDestroy(() => onDestroyProxy());

  async function start() {
    const module = await import("/js/cmp/userdata.js");
    userdb = module.userdata;
    storage = userdb.storage(userdb.BUCKET_BACKUP);
    onDestroyProxy = module.UserAwareComponent(
      u => {
        user = u;
        if (u) {
          backupsRef = storage.ref().child(user.uid);
          get_backups_list().catch(error => {
            error_message = error.message;
          });
        }
      },
      data_ => (data = Object.assign({ installations: {} }, data_)),
      aq_ => (actionqueue = aq_)
    );
  }
  start();
  /// End -- User Aware Component

  async function get_backups_list() {
    let list = localStorage.getItem("backups");
    if (list) list = JSON.parse(list);
    if (list && list.valid_until > Date.now()) {
      cache_valid_until = list.valid_until;
      backups = list.data;
      return;
    }
    const backupsList = await backupsRef.listAll();
    list = [];
    for (let item of backupsList.items) {
      const meta = await item.getMetadata();
      const [iid, _] = meta.name.split("_");
      list.push({
        iid,
        id: meta.name,
        created_at: Date.parse(meta.timeCreated),
        size: meta.size,
        install_name: meta.customMetadata.install_name,
        title: meta.customMetadata.title
          ? meta.customMetadata.title
          : meta.name,
        uid: user.uid,
        ref: meta.fullPath
      });
      console.log(meta);
    }
    let d = new Date(Date.now());
    d.setDate(d.getDate() + 1);
    localStorage.setItem(
      "backups",
      JSON.stringify({ data: list, valid_until: d.getTime() })
    );
    backups = list;
  }

  function refresh_cache() {
    cache_valid_until = null;
    localStorage.removeItem("backups");
    get_backups_list();
  }

  function progress_message(selectedFile, snapshot) {
    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
    error_message = `Uploading (${progress}%) ${selectedFile.name} (Size: ${(
      selectedFile.size / 1024
    ).toFixed(2)}kb)`;
  }

  function cancel_upload() {
    upload_current.cancel();
    upload_current = null;
  }

  async function make_download_link(e, backup, backup_index) {
    const gsReference = storage.refFromURL(
      userdb.BUCKET_BACKUP + "/" + backup.ref
    );
    backups[backup_index].download_url = await gsReference.getDownloadURL();
  }

  async function upload(e) {
    e.target.disabled = true;
    for (let selectedFile of uploadfile.files) {
      let [iid, title] = selectedFile.name.split("_");
      if (!iid || !title || !data.installations[iid]) {
        error_message =
          "File name '" +
          selectedFile.name +
          "' must follow the pattern INSTALLID_A-TITLE.zip with INSTALLID matching one of the currently registered installation ids (" +
          Object.keys(data.installations)
            .map(e => `"${e}"`)
            .join(", ") +
          ") and A-TITLE being the backup title";
        e.target.disabled = false;
        return;
      }
      if (selectedFile.type != "application/zip") {
        error_message =
          "File " +
          selectedFile.name +
          " is not a zip file: " +
          selectedFile.type;
        e.target.disabled = false;
        return;
      }
      if (selectedFile.size / 1024 / 1024 > 5) {
        error_message =
          "File " + selectedFile.name + " is bigger than 5 megabytes!";
        e.target.disabled = false;
        return;
      }
      const fileRef = backupsRef.child(iid + "_" + Date.now());
      upload_current = fileRef.put(selectedFile, {
        customMetadata: {
          title,
          install_name: data.installations[iid].title
        }
      });
      upload_current.on("state_changed", snapshot => {
        progress_message(selectedFile, snapshot);
      });
      try {
        await upload_current;
        upload_current = null;
      } catch (err) {
        upload_current = null;
        error_message =
          "Upload of " + selectedFile.name + " failed: " + err.message;
        return;
      }
    }
    error_message = null;
    refresh_cache();
  }

  function restore(e, backup) {
    if (!userdb) return;
    e.target.disabled = true;
    e.target.innerText = "Restore Queued";
    userdb
      .queue_action(backup.iid, "restore", backup.id)
      .then(() => {
        e.target.disabled = false;
      })
      .catch(err => {
        e.target.disabled = false;
        error_message = err.message;
      });
  }

  async function remove(e, backup) {
    if (!userdb) return;
    e.target.disabled = true;
    try {
      const gsReference = storage.refFromURL(
        userdb.BUCKET_BACKUP + "/" + backup.ref
      );
      await gsReference.delete();
    } catch (err) {
      e.target.disabled = false;
      error_message = err.message;
      return;
    }
    refresh_cache();
  }
</script>

<style>
  .card:hover {
    box-shadow: 0 1px 3px 1px rgba(60, 64, 67, 0.2),
      0 2px 8px 4px rgba(60, 64, 67, 0.1);
  }
  .card-body {
    display: flex;
  }
  .card-body > div:first-child {
    flex: 1;
  }
</style>

{#each backups as backup, backup_index}
  <div class="card">
    <div class="card-body">
      <div>
        <h4>{backup.title}</h4>
        <p>
          Created at: {new Date(parseInt(backup.created_at)).toLocaleString()}
          <br />
          Size: {Number.parseFloat(backup.size / 1024 / 1024).toFixed(2)} MB
          <br />
          Installation Name (ID): {backup.install_name} ({backup.iid})
        </p>
      </div>
      <div class="mr-3" style="max-width:400px">
        <p class="small">
          Please note that a restore request is queued and not executed
          directly. A restore will
          <b>
            <u>OVERWRITE</u>
          </b>
          the selected installation.
        </p>
        {#if backup.download_url}
          <a href={backup.download_url}>Download</a>
        {:else}
          <button
            class="btn btn-success"
            on:click={e => make_download_link(e, backup, backup_index)}>
            Show Download Link
          </button>
        {/if}

        <button class="btn btn-danger" on:click={e => restore(e, backup)}>
          Restore
        </button>
        <button class="btn btn-danger" on:click={e => remove(e, backup)}>
          Delete
        </button>
      </div>
    </div>
  </div>
{:else}
  <p>No Backups so far.</p>
{/each}

<div class="mt-4">
  <input
    type="file"
    multiple
    accept="application/zip"
    bind:this={uploadfile}
    style="display:none"
    on:change={e => upload(e)} />
  <button class="btn btn-primary" on:click={e => uploadfile.click()}>
    Upload
  </button>
  {#if upload_current}
    <button class="btn btn-primary ml-4" on:click={cancel_upload}>
      Cancel Upload
    </button>
  {/if}
  {#if cache_valid_until}
    <button
      class="btn btn-primary ml-4"
      title="Cache is valid until {new Date(cache_valid_until).toLocaleString()}"
      on:click={refresh_cache}>
      Refresh list
    </button>
  {/if}
</div>

{#if error_message}
  <p>{error_message}</p>
{/if}
