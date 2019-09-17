import firebase from '@firebase/app'
import '@firebase/auth'
import '@firebase/firestore'
import 'firebase/storage'

export async function getIdToken() {
    let user = firebase.auth().currentUser;
    if (user)
        return user.getIdToken();

    return new Promise((resolve, reject) => {
        let timer = null;
        const unsubscribe = firebase.auth().onAuthStateChanged(user => {
            if (timer) clearTimeout(timer);
            timer = null;
            unsubscribe();
            if (user) {
                resolve(user.getIdToken());
            } else {
                resolve(null);
            }
        });
        timer = setTimeout(reject, 2000);
    });
}


export async function fetchWithAuth(url, method = 'GET', body = null, timeout_ms = 3000) {
    const token = await getIdToken();
    if (token == null) throw new Error("Not authorized");
    const controller = new AbortController();
    const signal = controller.signal;
    setTimeout(() => controller.abort(), timeout_ms);
    const response = await fetch(url, {
        method,
        signal,
        withCredentials: true,
        credentials: 'include',
        headers: new Headers({
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }), body
    });
    if (!response.ok) {
        let e = new Error('Request failed. Error code: ' + response.status);
        e.response = response;
        throw e;
    }
    return response;
}

import { readable, get as store_get } from 'svelte/store';

class UserData {
    constructor() {
        this.auth_promise = new Promise((resolve, reject) => {
            this.auth_resolve = resolve;
        });
        this.access_tokens = {};
        this.backups = {};
        this.tidyupFn = [];

        this.data_setter = null;
        this.data = readable(null, setter => this.data_setter = setter);
        this.tidyupFn.push(this.data.subscribe(() => { })); // The setter is only set if subscribed

        this.user_setter = null;
        this.user = readable(null, setter => this.user_setter = setter);
        this.tidyupFn.push(this.user.subscribe(() => { })); // The setter is only set if subscribed

        this.actionqueue_has_subscribers = false;
        this.actionqueue_setter = null;
        this.actionqueue = readable({}, setter => {
            this.actionqueue_setter = setter;
            this.actionqueue_has_subscribers = true;
            this.actionqueue_init();
            return () => {
                this.actionqueue_has_subscribers = false;
                this.actionqueue_init();
            };
        });
        this.tidyupFn.push(this.actionqueue.subscribe(() => { })); // The setter is only set if subscribed

        this.BUCKET_BACKUP = "gs://openhabx-backups";
        this.BUCKET_BILLING = "gs://openhabx-bills";
        this.COLL_INVOICES = "invoices";

        const firebaseConfig = {
            apiKey: "AIzaSyDtVk7gzBYy4ub3B1JuB4xErb_CMcYXHtU",
            authDomain: "openhabx.firebaseapp.com",
            databaseURL: "https://openhabx.firebaseio.com",
            projectId: "openhabx",
            storageBucket: "openhabx-backups",
            messagingSenderId: "889637406242",
            appId: "1:889637406242:web:68e31a7134337311"
        };

        console.log("Start firebase");
        firebase.initializeApp(firebaseConfig);

        this.tidyupFn.push(firebase.auth().onAuthStateChanged(user => this.check_login(user)));
    }

    dispose() {
        if (this.userdata_listener_unsubscribe)
            this.userdata_listener_unsubscribe();
        delete this.userdata_listener_unsubscribe;
        for (const tidyFn of this.tidyupFn) tidyFn();
        this.tidyupFn = [];
        if (this.actionqueue_unsubscribe)
            this.actionqueue_unsubscribe();
        delete this.actionqueue_unsubscribe;
    }

    async ready() {
        return this.auth_promise;
    }

    storage(name) {
        return firebase.app().storage(name);
    }

    db() {
        return firebase.firestore();
    }

    check_login(user) {
        if (user && user.uid == "IocPph06rUWM3ABcIHguR3CIw6v1") user.is_admin = true;
        this.user_setter(user); // update user object

        if (this.userdata_listener_unsubscribe) {
            this.userdata_listener_unsubscribe();
            delete this.userdata_listener_unsubscribe;
        }
        this.actionqueue_init();

        if (user) {
            const db = firebase.firestore();
            this.userdata_listener_unsubscribe = db.collection("users")
                .doc(user.uid)
                .onSnapshot(snapshot => {
                    this.data_setter(snapshot.data());
                    this.auth_promise.is_resolved = true;
                    this.auth_resolve();
                }, error => {
                    this.auth_promise.is_resolved = true;
                    this.auth_resolve();
                    console.warn("User data error", error);
                });
        } else {
            this.auth_promise.is_resolved = true;
            this.auth_resolve();
        }
    }

    /**
     * Rejects the returned promise if not logged in
     */
    check_logged_in() {
        const user = store_get(this.user);
        if (!user || !user.uid) {
            console.warn("Not logged in!");
            throw new Error("Not logged in");
        }
        return user;
    }

    async applyData(val, merge = false) {
        const user = this.check_logged_in();
        var db = firebase.firestore();
        return db.collection("users").doc(user.uid).set(val, { merge: merge });
    }
    async updateData(val) {
        const user = this.check_logged_in();
        var db = firebase.firestore();
        return db.collection("users").doc(user.uid).update(val);
    }

    async queue_removal() {
        return this.updateData({ queued_remove: Date.now() });
    }

    async clear_removal() {
        return this.updateData({ queued_remove: firebase.firestore.FieldValue.delete() });
    }

    async add_installation(install) {
        const user = this.check_logged_in();

        const key = "installations." + install.id;
        const update_obj = {};
        update_obj[key] = install;

        var db = firebase.firestore();
        return db.collection("users")
            .doc(user.uid)
            .update(update_obj);
    }

    /**
     * Removes an installation from the user data and also removes the installation related command queue and access token.
     * @param {Object} install The installation object
     * @param {String} install.id The installation id
     */
    async remove_installation(install) {
        const user = this.check_logged_in();
        await this.clear_queue(install.id);
        await this.remove_from_collection("access_tokens", user.uid + "_" + install.id);

        const key = "installations." + install.id;
        const update_obj = {};
        update_obj[key] = firebase.firestore.FieldValue.delete();

        var db = firebase.firestore();
        return db.collection("users")
            .doc(user.uid)
            .update(update_obj);
    }

    async remove_from_collection(collection = "", doc_id = "") {
        const user = this.check_logged_in();
        const db = firebase.firestore();
        const colref = db.collection(collection).where("uid", "==", user.uid);
        if (doc_id == null) colref = colref.doc(doc_id);
        return colref
            .get()
            .then(function (querySnapshot) {
                let batch = db.batch();
                querySnapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });
                batch.commit().catch(e => console.warn("Batch deleting failed:", e));
            })
    }

    async set_collection_doc(collection = "", doc_id = "", document = {}, is_update = false) {
        const user = this.check_logged_in();
        const db = firebase.firestore();
        const colref = db.collection(collection);
        if (doc_id.empty())
            return colref.set(document);
        else
            return is_update ? colref.doc(doc_id).update(document) : colref.doc(doc_id).set(document);
    }

    /**
     * Fetch a collection. Returns a promise with the last document reference for paginated requerying
     * @param {String} collection The collection name
     * @param {Number|Null} limit An optional limit
     * @param {String} orderby A field to be used for ordering
     */
    async fetch_collection(collection = "access_tokens", limit = null, orderby = null, docref = null) {
        const user = this.check_logged_in();
        const db = firebase.firestore();
        let ref = db.collection(collection).where("uid", "==", user.uid);
        if (limit) {
            ref = ref.orderBy(orderby).limit(limit)
        }
        if (docref) {
            ref = ref.startAfter(docref);
        }
        let coldata = {};
        //console.log("FETCH COLL", collection);
        return ref
            .get()
            .then(querySnapshot => {
                const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
                querySnapshot.forEach(doc => coldata[doc.id] = doc.data())
                return lastVisible; // query cursor
            }).then(lastVisible => { this[collection] = coldata; return lastVisible; });
    }

    // "Reference" counted firestore collection observer for the "queue" collection.
    // Unfortunately a Firestore multi-collection subscriber cannot be enforced to a specific root collection.
    // 
    // Potentially all queues of all users are received here.
    // A specific firestore rule, that checks for the uid of a user, restricts access.
    //
    // A queue document is required to have an installation id (iid) and a user id (uid) and if related to
    // an addon action also an addon id (aid). Because an addon can only be target of one command (install, uninstall, update),
    // the `aid` is used as queue doc key. Otherwise the action code itself (doc.c) is used as queue doc key.
    actionqueue_init() {
        if (!this.actionqueue_has_subscribers) {
            if (this.actionqueue_unsubscribe)
                this.actionqueue_unsubscribe();
            delete this.actionqueue_unsubscribe;
            return;
        }

        const user = store_get(this.user);
        if (!user || !user.uid || this.actionqueue_unsubscribe) return;

        var db = firebase.firestore();
        this.actionqueue_unsubscribe = db.collectionGroup('queue').where("uid", "==", user.uid).onSnapshot(snapshot => {
            snapshot.docChanges().forEach(change => {
                const data = change.doc.data();
                if (!data.iid || !data.c) {
                    console.warn("Found queue document that is incomplete", data);
                    return;
                }
                const queue_key = (data.aid ? data.aid : data.c);
                const temp = store_get(this.actionqueue);
                if (change.type === "removed") {
                    if (temp[data.iid]) {
                        delete temp[data.iid][queue_key];
                        this.actionqueue_setter(temp);
                    }
                } else {
                    if (!temp[data.iid]) temp[data.iid] = {};
                    temp[data.iid][queue_key] = data;
                    this.actionqueue_setter(temp);
                }
            });
        });
    }

    async queue_action(install_id, actioncode, addonid = null) {
        const user = this.check_logged_in();
        let db = firebase.firestore();
        const queue_key = (addonid ? addonid : actioncode);
        return db.collection("users")
            .doc(user.uid)
            .collection("installations")
            .doc(install_id)
            .collection("queue")
            .doc(queue_key).set({ t: Date.now(), iid: install_id, c: actioncode, aid: addonid, uid: user.uid })
    }

    async remove_queued_action(install_id, actioncode, addonid = null) {
        const user = this.check_logged_in();
        let db = firebase.firestore();
        const queue_key = (addonid ? addonid : actioncode);
        return db.collection("users")
            .doc(user.uid)
            .collection("installations")
            .doc(install_id)
            .collection("queue")
            .doc(queue_key).delete();
    }

    async clear_queue(doc_id = "") {
        const user = this.check_logged_in();
        let db = firebase.firestore();
        return db.collection("users")
            .doc(user.uid)
            .collection("installations")
            .doc(doc_id)
            .collection("queue").get().then(snapshot => {
                return snapshot.docs.map(doc => {
                    doc.reference.delete();
                });
            });
    }

}

const userdataobj = window._userdata ? window._userdata : new UserData();
window._userdata = userdataobj;
export { userdataobj as userdata, firebase };


export function UserAwareComponent(userUpdaterFn, dataUpdaterFn, actionQueueUpdaterFn) {
    const user_unsub = userUpdaterFn ? userdataobj.user.subscribe(value => userUpdaterFn(value)) : () => { };
    const data_unsub = dataUpdaterFn ? userdataobj.data.subscribe(value => dataUpdaterFn(value)) : () => { };
    const actionqueue_unsub = actionQueueUpdaterFn ? userdataobj.actionqueue.subscribe(value => actionQueueUpdaterFn(value)) : () => { };
    return () => {
        user_unsub();
        data_unsub();
        actionqueue_unsub();
    };
}
