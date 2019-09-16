+++
title = "Insights - Document Store"
date = "2019-05-17T15:02:31+02:00"
archives = "2019"
tags = ["insights"]
categories = ["architecture"]
author = "David Graeff"
+++

An industrial grade home automation solution touches quite some areas of expertise ranging from authentication to authorisation, to untrusted process communication, persistent storage questions and more.

This article series is about design decisions that have been taken and what other options have been considered during decision taking.

This post is about the **Document Store** or persistent storage.

## What is a Document Store used for

Next to relational database with data organised in tables and rows and following a defined data schema, there exist document based databases. An example is MongoDB or CouchDB. Such a database stores schema-less, "complex", json-like documents. A document contains key-value pairs, but may as well contain further nested documents. Supported datatypes for document based databases are often strings, numbers, geo-locations and date/time. Indices can be created for specific fields or are automatically created.

OHX requires a document storage for addon-, service-, thing- and other **configurations** as well as **rules** (including scenes and scheduled actions). Especially the first category of data cannot be coined into a schema and is more suited for a document storage than a relational database.

Other data of OHX is:

* **Configuration Schemas** can be requested on-demand from addons and services and are cached in the key-value storage.
* **Inbox** Things are stored in the key-value storage. They do not need to be persisted even, because they can be auto discovered at any time.
* **Access and Refresh Tokens** are also stored in the key-value storage.

## Feature Requirements

Incomplete data is unacceptable. The storage is used the most at start up (in read mode) where services and addons request their configuration and is infrequently used to store configuration / rules. If services run on different machines, stored data should be eventually consistent across nodes.

A list of required features:

* "Snapshots" and "Rollbacks" in some form
* Some form of access control. All addons and services are permitted to use configurations, but should not be able to manipulate other addons or services data.
* Around 20mb main memory at max

An optional feature is quota support. This can also be checked periodically, assuming that no malicous addon tries to overload the storage.

## Evaluation

A huge time was spend on evaluating MongoDB. It is written in Go. Hopes are high that its memory footprint is not huge and its reputation leans towards resource leak free operation.

It turns out fast and automatically indexes documents, most importantly by the documents unique id.

What is a bit unfortunate, is how `snapshot`s and rollbacks would be realized. By exporting and importing the dataset. The database files are binary, which is of course reasonable, but doesn't help for backups or for presenting the user a diff-view.

What features are actually used, that justifies MongoDB? Documents need to be queried by their unique id! Just one  single index is required? I thought about using Redis (Key-Value DB) for a short moment. An epiphany came to my mind. There is already a basically resource neutral database with a single index capability available on any target operating system. The filesystem.

## Filesystem

The filesystem allows quering for filenames. Those are indexed. Querying for a range of files, especially if happening in rapid succession is also fast, the kernel caches filesystem inodes.

Combined with git, for snapshoting and rolling back, the most suitable document storage for OHX's usecase have been found.

Using a distributed filesystem or a git-commit-push-on-change service this solution scales up fine. Remember that we do not need real-time configuration "synchronisation" and it only needs to be eventually consistent.

## Conclusion 

Sometimes the simple solution is absolutely sufficient. Wear-Leaving strategies, crash resistence and caching are all handled for us.

The only caveat: There is always only one indexed property (the unique id). If you want to query for, say, all configurations of a specific service "type", you are back to filesystems file enumeration speed and need to open every single file.

Those queries are rare. However, one goal for the future will be to prevent unnessesary file openings by evaluating file attributes (file system meta data).

Stay tuned for more articles in this series.
Any suggestions or ideas? Comment below.