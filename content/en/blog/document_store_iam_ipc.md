+++
title = "Insights - Document Store"
date = "2019-05-17T15:02:31+02:00"
archives = "2019"
tags = ["insights"]
categories = ["architecture"]
author = "David Graeff"
+++

An industrial grade home automation solution touches quite some areas of expertise from user management to service access tokens, to untrusted process communication, persistent storage questions and more.

In this article series it is about design decisions that have been taken and what other options have been considered during decision taking. Be warned: It will read a bit technical from time to time.

This post is about the **Document Store** or persistent storage.

## What is a Document Store used for

Next to relational database with tables and rows and a defined data schema, there exist document based databases. An example is MongoDB or CouchDB. Such a database stores schema-less "complex" json-like documents. A document contains key-value pairs, but may as well contain further nested documents. Support datatypes for docuemnt based databases are often strings, numbers, geo-locations and date/time. Indices can be created for specific fields or are automatically created.

openHAB X requires a document storage for **configurations**, **rules** (including scenes and scheduled actions), **things**. For not much more actually. 

* **Configuration Schemas** can be requested on-demand from addons and services and are cached in the key-value storage.
* **Inbox** Things are stored in the key-value storage. They do not need to be persisted even, because they can be auto discovered at any time.
* **Access and Refresh Tokens** are also stored in the key-value storage.

## Feature Requirements

One feature is of course: No broken, incomplete data. Another feature wish grow over time while researching. What if configuration can be `snapshot`ed and rolled back. For going back to a working setup after experimenting for example.

An important factor is also memory usage and potential resource leaks. The service should not take more than 20mb.

## Evaluation

A huge time was spend on evaluating MongoDB. It is written in Go, so generally not using up too much resources and hopefully also memory leak free for the features used.

It turns out fast and automatically indexes my documents, most importantly by the documents unique id.

What I didn't like about it, is how `snapshot`s and rollbacks would be realized. By exporting and importing the dataset. The database files are binary, which is of course reasonable, but doesn't help for backups or for presenting the user a diff-view.

I than asked myself, what features I actually use of such a document storage database. The answer is simple: I like to query for documents by their unique id. I thought about using Redis (Key-Value DB) for a short moment. But guess what? There is already a basically resource neutral database with a single index capability available on any target operating system. The filesystem.

## Filesystem

The filesystem allows for quering for filenames. Those are indexed. Querying for a range of files, especially if happening in rapid succession is also fast, the kernel caches filesystem inodes.

Combined with git, for snapshoting and rolling back, the almost perfect document storage for openHAB X's usecase have been found.

Using a distributed filesystem or git-commit-push-on-change this storage even scales up fine. Remember that we do not need real-time configuration "synchronisation" and it only needs to be eventually consistent.

## Conclusion 

Sometimes the simple solution is absolutely sufficient. Wear-Leaving strategies, crash resistence and caching are all handled for us.

The only caveat: There is always only one indexed property (the unique id). If you want to query for, say, all configurations of a specific service "type", you are back to filesystems file enumeration speed and need to open every single file.

Those queries are rare. However, one goal for the future will be to prevent unnessesary file openings by evaluating file attributes (file system meta data).

Stay tuned for more articles in this series.
Any suggestions or ideas? Comment below.