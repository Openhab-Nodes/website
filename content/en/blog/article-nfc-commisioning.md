+++
title = "Cableless Wi-Fi commisioning - Entering the realm of NFC"
date = "2017-10-10T13:07:31+02:00"
archives = "2017"
tags = ["iot"]
categories = ["lorem"]
author = "David Graeff"
+++

Provision connection parameters is solved differently across the existing wireless protocols.
Before we turn our focus on the 802.11 Wi-Fi standard, how does other protocols pair wireless peer devices?
<!--more-->
## Bluetooth 4 / LE

The Bluetooth protocol operates at 2.4GHz in the same unlicensed ISM frequency band where RF protocols like ZigBee and WiFi also exist.
Every single Bluetooth device has a unique 48-bit address, commonly abbreviated BD_ADDR. This will usually be presented in the form of a 12-digit hexadecimal value.

Creating a Bluetooth connection between two devices is a multi-step process involving three progressive states:

1. Inquiry – If two Bluetooth devices know absolutely nothing about each other, one must run an inquiry to try to discover the other. One device sends out the inquiry request, and any device listening for such a request will respond with its address, and possibly its name and other information.
2. Paging (Connecting) – Paging is the process of forming a connection between two Bluetooth devices. Before this connection can be initiated, each device needs to know the address of the other (found in the inquiry process).
3. Connection – After a device has completed the paging process, it enters the connection state. While connected, a device can either be actively participating or it can be put into a low power sleep mode.

Pairing usually requires an authentication process where a user must validate the connection between devices.
The flow of the authentication process varies and usually depends on the interface capabilities of one device or the other.
Bluetooth allows a simple click of a button pairing mode (this is common for devices with no UI, like headsets).
Other times pairing involves matching 6-digit numeric codes.
Older, legacy (v2.0 and earlier), pairing processes involve the entering of a common PIN code on each device.
The PIN code can range in length and complexity from four numbers (e.g. “0000” or “1234”) to a 16-character alphanumeric string.

## Zigbee

Zigbee works a lot like Bluetooth, but the nature of Zigbee-enabled products (devices with no UI, most of the time even without a button) usually requires more complex procedures to enter pairing mode or to forget the last pairing.
Some products enter pairing mode if a specific wireless command asks them for pairing, some go into pairing mode for a few seconds after the power-on cycle or after a specific sequence of power-ons.
An example are the IKEA Zigbee products which enter pairing after turned off and on 6 times in a fast sequence.

The ZigBee Security is based on the assumption that keys are securely stored, and devices are pre-loaded with symmetric keys so they have never to be transmitted unencrypted.
If a non-preconfigured device joins a network, a single key may be sent unprotected and enable encrypted communication.
This one-time transmission of the unprotected key results in a short timeframe of exploitability in which the key could be sniffed by an attacker.
Especially if the attacker can remotely make the devices go into pairing mode.

Zigbee 3.0 therefore introduced touchlink commisioning to faciliate close physical proximity for pairing.

## Wi-Fi

Wi-Fi, being the oldest protocol of the three, has no native way for easy commisioning in the original standard.
With WPS, a way of commising connection parameters in the same fashion like with Bluetooth got introduced.
Unfortunately the feature is not well promoted and not a requirement which led to incomplete, not certified and only partially working support or no support even in new solutions.

## Entering the realm of Near field communication (NFC)

Commisioning Wi-Fi devices should be as easy as with Zigbees touchlink.
It actually gets more and more common to establish Bluetooth pairings via NFC.

For our own product range we wanted a secure way to commision Wi-Fi connection parameters at least as easy as those mentioned technologies. From the nfc-forum itself:

> NFC is able to replace the pairing of Bluetooth-enabled devices, or the configuration of a Wi-Fi network through PINs and keys, by simply touching the two devices to be paired or connected to the network, or by touching the device to a tag. The gain in simplicity of use is substantial while the level of confidence is exactly similar. (http://members.nfc-forum.org/aboutnfc/tech_enabler/)

No pairing code is necessary to link up because it faciliates close physical proximity.
Commisioning should not require a special device but just an application on our day-to-day mobile.

## On the hardware side

NFC runs on very low amounts of power.
The [PN7150](https://www.nxp.com/docs/en/data-sheet/PN7150.pdf) uses maximum 14µA in monitor state for instance and interfaces to the main application processor via I²C (2 wires), SPI (3 wires) and UART (2 wires). It embeds a microcontroller to handle the NFC timing and protocol details. A NFC frontend IC like the [NT3H1201](https://www.mouser.de/datasheet/2/302/NT3H1101_1201-1127167.pdf) supports an external silicon system-power-on switch by using the energy of the RF field generated by an NFC phone and consumes basically no energy at all if no NFC phone is in range.

To understand the components of an NFC enabled hardware product, let us have a look at the following figure. The data flow from the commissioning app (Tag) to the Device Host (DH) is shown:

[[figure]]

NFC Controllers (NFCC) like the mentioned PN7150 are programmed, read from and written to via the NFC Controller Interface (NCI) protocol. A frontend IC like the NT3H1201 is interfaced with a propritary I²C protocol, but is an order of magnitudes cheaper.

There are basically two distinct ways of using NFC for the Wi-Fi commissioning usecase. Either the phone emulates a NFC card (Host Card Emulation) or the NFC Data Exchange Format (NDEF) is used in a peer to peer (P2P) mode.

## Commisioning application

We would have loved a solution that works accross all NFC enabled mobiles.
Unfortunately Apple does not allow card-emulation or NDEF write support yet on their devices which restricts us to Android devices.
We do not see this as a huge burden though, as NFC capable Android phones are quite affordable even if just used for this purpose. On the other hand we believe that in the mid to long run Apple will open up access to the NFC chip at some point as well [1](http://www.idownloadblog.com/2017/06/30/nfcwriter/).

### User interface

The user selects the destination Wi-Fi from a list of all known networks.
To prevent NFC commissioned Wi-Fi devices to be overtaken, the pairing procedure
is protected by a secret key. The very first pairing procedure programs the secret key.

### Implementation

This section might get a little technical and shows the two discussed ways (Host Card Emulation and NDEF) of transmitting data from the commissioning app to the Wi-Fi enabled product. For this article we are going to have a look at some Android code only. NFC NDEF was introduced with Android 4 and host based card emulation was introduced with Android 4.4, so basically all current NFC enabled Android phones are supported.

For the Host Card Emulation way see the important code below:
A NFC response service that `extends` **HostAdpuService** is registered.
The service method `processCommandApdu` is overriden like in the following code:

```java
@Override
public byte[] processCommandApdu(byte[] commandApdu, Bundle extras) {
    // If the APDU matches the SELECT AID command for this service,
    // send the wifi credentials, followed by a SELECT_OK status trailer (0x9000).
    // SELECT_APDU Format: [CLASS | INSTRUCTION | PARAMETER 1 | PARAMETER 2 | LENGTH | DATA]
    if (Arrays.equals(SELECT_APDU, commandApdu)) {
        WifiCredentials wc = SelectedWifi.GetCredentials(this);
        byte[] wcBytes = wc.getTLVBytes();
        byte[] secCode = SelectedWifi.GetSecurityCodeTLVBytes(this);
        return ConcatArrays(wcBytes, secCode, SELECT_OK_SW);
    } else {
        return UNKNOWN_CMD_SW; // invalid APDU command (0x0000)
    }
}
```

The control flow is quite easy, but have a look at the [source code](www.github.com) for more information.
As you can see only the wifi credentials (encoded as UTF-8 TLV, type-length-value) concatenated with a pre-shared fixed security code is transmitted.

The NDEF way is different in how Android reacts to discovered Tags. It launches the Activity that registered an intent filter for NFC Tags or let the user select if multiple applications are matching. Without any error checking the following code shows rougly what is going on in such an Activity:

```java
@Override
public void onCreate(Bundle savedInstanceState) {
    mNfcAdapter = NfcAdapter.getDefaultAdapter(this);
}

@Override
protected void onResume() {
    mNfcAdapter.enableForegroundDispatch(this, PendingIntent.getActivity(this, 0, new Intent(this, getClass()).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP), 0), new IntentFilter[] { new IntentFilter(NfcAdapter.ACTION_TAG_DISCOVERED) }, null);
}

@Override
protected void onNewIntent(Intent intent) {
    if (!intent.getAction().equals(NfcAdapter.ACTION_TAG_DISCOVERED))
        return;
        
    Ndef ndef = Ndef.get(intent.getParcelableExtra(NfcAdapter.EXTRA_TAG));
    ndef.connect();

    if (!ndef.isWritable())
        return;

    if (ndef.getMaxSize() < size)
        return;
        
    WifiCredentials wc = SelectedWifi.GetCredentials(this);
    byte[] wcBytes = wc.getTLVBytes();
    byte[] secCode = SelectedWifi.GetSecurityCodeTLVBytes(this);
    ndef.writeNdefMessage(ConcatArrays(wcBytes, secCode));
}
```

For both cases a more complex procedure is not required, because NFC pairing is only enabled if the Wi-Fi connection is lost or not established yet and additionally requires the knowledge of the pre-shared key.

## Conclusion

You have seen how different wireless technologies handle the pairing process. With Wi-Fi being the most common but also oldest standard we need a custom solution to offer our customers a painless setup procedure. The presented way of using NFC is efficient, fast and easy (tap the new device and you are done) and only adds a bit to an overall product cost (~1€).

Hopefully the Wi-Fi alliance will consider NFC as a required next generation pairing procedure, allowing
companies like us to deliver standard compliant and easy to use solutions in the future.

