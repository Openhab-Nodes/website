+++
title = "Backup & Restore"
author = "David Graeff"
weight = 50
tags = ["backup","restore","reliable","stability"]
+++

{{< indent >}}
*Backup* refers to the copying of physical or virtual files or databases to a secondary location for preservation in case of equipment failure or catastrophe. The process of backing up data is pivotal to a successful disaster recovery plan (DRP).
{{< /indent >}}

Having a disaster recovery plan is generally a good idea to protect from miss-configuration and hardware failures. openHAB X implements a Snapshot/Rollback system and offers integration points for external backup providers.

Although OHX consists of robust, mostly self-recovering services a deliberately provoked miss-configuration, for example for testing certain limits, might reduce the operability considerably. That is when you want to roll back to a former configuration snapshot.

The standalone installation tries to minimize impacts on power outage and unplanned, sudden reboots by using a read only operating system partition. There are only a few writable directories which are covered by the snapshot system, logs are stored in-memory. This ensures that even a simple SD-Card on a single board computer with an OHX installation will last long and boot up extremely fast.

This chapter explains some used technologies and explains capabilities and limits of the backup and restore functionality. Defaults are usually sufficient, but all knobs to tune available settings are explained. In the last section you will learn about external Backup Providers, especially the *Cloud Connector* which is the subscription based offering of this website.

## Snapshots

openHAB X creates a snapshot automatically every 24 hours and on demand.
They do not require much disk space, because only differences to the last state are actually stored. If no configuration change has happened, no snapshot will be created.

Snapsnots need a name. Automatically created ones carry the data and time as a name.

*Things*, *Rules*, service and Addon configuration are considered to be tightly coupled and are considered as one inseparable unit when it comes to snapshots.

{{< details >}}
The time-series database is not included in snapshots. Be aware that frequently using the snapshot and rollback mechanism might render your time-series dataset less usefull on certain conditions. Like when at one time Things are configured and at another they are not.
{{< /details >}}

Only user accounts with the BACKUP permission are allowed to create on-demand snapshots.

Snapshots are stored on-disk and are plain text, non encrypted data. openHAB X generally assumes that no unauthorized person has access to the disk. The storage is protected by runtime measures like quota restrictions and service access models however to minimize impact if an addon contains malicous code.

### Schedule

You can alter the schedule for the snapshot service. Your user account requires the BACKUP permission, which is the default for the administrative account.

Every 24 hours is a reasonable value for snapshots, but you can alter this on the <a class="demolink" href="">Maintenance</a> page in **Setup &amp; Maintenance** within the *Backup Service* area.

If you just want to tinker with an installation (non production mode), you can also completely disable the time based snapshoting.

## Configuration Rollback

Head over to the *Backup Service* area on the <a class="demolink" href="">Maintenance</a> page in **Setup &amp; Maintenance**. You find a list of all snapshots with a snapshot name, the date and time that those were taken and a simple metric, the line change count, that tells you how much a specific snapshot differs from the one before.

You might notice that the list does not contain consecutive snapshots, even if a 24 hour schedule has been setup. That is because OHX only stores a new snapshot if there are actually changes on disk. Effectively that means, if you don't touch and reconfigure your running system for a year, your last snapshot might as well be a year old.

Clicking on the restore link on any of the listed entries will perform a configuration *rollback*. You can freely jump between listed snapshots and also return to the most recent one.

A rollback changes the Thing, Rules, configuration files on-disk and triggers all OHX services to re-read the configuration. This happens instantly. Be aware that the rule engine might require a few more seconds dependending on the amount of rules.

## Backups 

There are a few backup providers available. A backup must reside on a physically different device, so USB sticks or different disk partitions on the same system and therealike hackish solutions are not supported. 

When a backup takes place, the time-series database (InfluxDB) is exported first and then the configuration storage and the database content are compressed to a `.br` ([Brotli](https://github.com/google/brotli/)) file (best generic-purpose lossless compression ratio as of 2019). That file is encrypted with a key, derived by the administrator accounts password. Consequential you will unrecoverably loose all data if you forget your admin accounts password.

### What data is covered 

The snapshot system of openHAB X covers all configured user accounts, Things, Rules, and service configuration. A backup additionally covers Time-Series data.

A typical backup for a 5 addons installation that has run for 2 months with a decent amount of configuration changes and time-series enabled Things is about 250kb.

### Backup Provider

You can configure one or more of the following backup providers.

Git
: A remote Git repository. You need to provide an author, an email address, and credentials either username and password or an SSH key. Git is not the best storage for binary data, and a backup file is just that, a binary blob. But the simple repository clone process allows for fast and easy replicas.

Google Drive
: A Google Cloud Drive location. You need to provide the directory location and grant access to your drive account.

Cloud Connector
: Your backups are stored on Google servers as well like with Google Drive, but don't count towards your quota. You need to have an active subscription to perform backups but you will support development of this service. You can list your backups in your login area and even remotely restore an installation.

A backup is deemed failed if none of the configured providers complete the upload procedure. If a few, but not all providers fail, you will get notified, but the backup is deemed successful.

## Backup Restoring

On the <a class="demolink" href="">Maintenance</a> page in **Setup &amp; Maintenance** under "Backup Service" you can restore your installation to a previous state. This will take a few minutes to complete, in contrast to snapshot rollbacks, because the external file need to be downloaded and extracted.

{{< details type="warning" >}}
It is usually no problem to even restore very old backups, because all OHX services have a configuration update procedure included and Addon developers are also encouraged to perform version updates for provided older configuration files or Thing files.

Be aware however that you cannot restore a backup of a new OHX installation to an older OHX version. 
{{< /details >}}