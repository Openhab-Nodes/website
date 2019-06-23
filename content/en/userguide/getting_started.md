+++
title = "Getting Started"
author = "David Graeff"
weight = 10
+++

You've got a few options.

{{< col3md >}}
{{< figure src="/img/raspberry-pi-3-case-enclosure.jpg" title="Standalone"  width="300px">}}

openHAB X comes as a [standalone](#standalone) SD-Card Image for the Raspberry PI 3 Hardware Bundle.

This is the easiest and most secure way to get a copy of openHAB X running.

<split>

{{< figure src="/img/raspberry-pi-3-case-enclosure.jpg" title="Container"  width="300px">}}

There is also a [container](#container) ("Docker") based installation for Windows, Mac OS or Linux.

You want this option to try openHAB X out and if you want to manage the operating system yourself. The provided container is stateless (easy updates!) and you only need to provide a writable directory and network connection.

<split>

{{< figure src="/img/raspberry-pi-3-case-enclosure.jpg" title="From Source"  width="300px">}}

A third option is to dowload the open sourced services that openHAB X is composed of and build and start those individually.

Head over to the [Developer Documentation](/developer) for more information, if interested.

{{< /col3md >}}

# Standalone

What you will need:
 
* A {{< details title="Raspberry Pi® 3" >}}
The Raspberry Pi® 3 is only one of many single board computer options actually. It the recommended one, but you will find download links for other systems down below as well.
{{< /details >}} single board computer, power supply (minimum 2A) and casing
* A microSD card (8GB, class 10 or better)

{{< callout >}}
Note: The Raspberry Pi 3 comes with Wi-Fi and Bluetooth radios. Optional USB dongles are needed if you want to support other smart home protocols like Zigbee and Z-Wave.
{{< /callout >}}

{{< col3md >}}
<h4>Zigbee Dongles</h4>

[Digi XStick](https://www.digi.com/products/xbee-rf-solutions/boxed-rf-modems-adapters/xstick) (ZB mesh version),
[ConBee Zigbee USB stick](https://phoscon.de/conbee),
[ConBee II Zigbee USB stick](https://phoscon.de/en/conbee2) also available on [Amazon](https://www.amazon.com/dresden-elektronik-ConBee-Universal-Gateway/dp/B07PZ7ZHG5)

<split>

<h4>ZWave Dongles</h4>

[Sigma Designs UZB Stick](http://www.vesternet.com/z-wave-sigma-designs-usb-controller), [Aeotec Z-Stick](http://aeotec.com/z-wave-usb-stick) (Gen5), Any [OpenZWave compatible dongle](https://github.com/OpenZWave/open-zwave/wiki/Controller-Compatibility-List)

{{< /col3md >}}

## 1. Download Image
<small class="muted">Latest Version: <button class="btn-link contexthelp" id="version_tr"
        title="Context help">{{< getversion tag_name >}}</button></small>

<a href="{{< readdata browser_download_url rpi3-64 >}}" title="{{< readdata name rpi3-64 >}}"
    class="btn btn-dwnload">
    <img src="/img/raspberrypi.png" style="height: 1em" class="mr-2">
    <span>RPI 3</span>
</a>
<button class="btn btn-dwnload" id="download_tr" title="Context help">Other &#9660;</button>
<br>
<template data-popover="download_tr">
    <dl style="max-width: 500px">
        {{< listofdownloads >}}
    </dl>
</template>
<ui-tooltip target="download_tr"></ui-to oltip>
<template data-popover="version_tr">
    <dl style="max-width: 500px">
        {{< changelogs >}}
    </dl>
</template>
<ui-tooltip target="version_tr"></ui-tooltip>

Please uncompress the downloaded file with any tool that can handle `gz` files (7-Zip, WinRar, `tar xfv` etc).

## 2. Flash Image
Next you will need to flash the downloaded image onto your microSD card. There are various methods of doing this but we recommend using <a href="https://www.balena.io/etcher/" target="_blank">Etcher</a>.

<img src="/img/doc/etcher_screenshot.png" style="max-width:70%">

1. Insert your SD card into an SD card reader attached to your computer
1. Select the downloaded image as the source file
1. Select your SD card as the target

Click “Flash!”

## 3. Boot Raspberry Pi

<img src="/img/doc/plug_in.png">

1. Insert the flashed microSD card into your Raspberry Pi
1. Plug in any USB dongles
1. Connect the power supply to boot the Pi. The first boot takes about 2 minutes. The software adapts your SD-Card and configures the hardware.
1. Connect to your network

{{< col3md >}}
#### Wired

Connect the Raspberry Pi to your home network using an Ethernet cable.
Type in “http://gateway.local” into your web browser to connect to it.

<split>

#### Wireless

When the gateway starts up it will create a Wi-Fi hotspot called “openHAB X XXXX” with XXXX being 4 device specific characters. Once connected the welcome screen should pop up. If not, type in “http://gateway.local” into your web browser.

{{< /col3md >}}

Skip to [First Time Setup](#first-time-setup).

# Container

A software container allows one or muliple applications to run in an isolated, defined environment.
The most known implementation for containers is [Docker](https://www.docker.io) and runs on all major operating systems. 

The command line on any operating system will allow to download and start the image via:

```
docker pull openhabx-x86-64bit
```

This only starts the core services. Download and use the [Docker Compose](https://example.com) file to run the full openHAB X distribution.

# First Time Setup

The first time setup process will guide you through the last steps.

### Optional WiFi Setup

Select your home network from the list and enter your Wi-Fi password to connect.
<img src="/img/features/connect_to_wifi.png">

### Create User Account
Enter your login name or email address and a password to create your administrative user account.

<img src="/img/features/create_account.png">

Learn in the next chapter on how to administer your openHAB X installation including    how to create additional user accounts.
