+++
title = "Cloud Connector Costs"
+++

#### Technical background

Cloud based services like Amazon Alexa or IFTT require a way to communicate with your local OHX installations.

This can usually not happen in a direct fashion because your openHAB installation most likely does not have a public (IP) address and is hidden behind a router that performs Network-Address-Translation (NAT).
Instead your OHX installations connect and listen to a 24/7 running message bus service. Alexa, Google Home, IFTT etc are now posting their commands to this message bus.

{{< mermaid align="left" context="how_cloud_backend_works">}}
graph LR;
    A[Amazon Alexa] -->|cmd: ON| bus(Message Bus)
	bus -->|cmd: ON| i1(OHX Installation)
{{< /mermaid >}}

{{< advanced >}} Please note, that with some router configuration like port forwarding and a dedicated Amazon Lambda function with your IP compiled in, you could get for example Amazon Alexa functionality for your personal installation for free (as long as you are not exceeding the free tier).

We want to provide a way that works out of the box however, for everyone. That closes the gap between your installation(s) and cloud services.

Technology Used
: The **Cloud Connector Addon** uses Google Firestore as a multi-client real-time data storage and Google PubSub as a public/subscribe messenger bus.

<p></p>

* Those services are amazingly fast. An Alexa command reaches your installation in about 30 milliseconds. To put that in perspective, an eye blink is about 100 to 150 milliseconds ([Wikipedia](https://www.wikiwand.com/en/Blinking#/Central_nervous_system's_control)).
* And these services scale up on demand and only actual usage is billed.

#### Cost Calculation

<table class="table">
<thead><tr><th>Service</th><th>Costs</th></tr></thead>
<tbody>
<tr><td>GCloud EGress Network</td><td title="10 TB">0,12 $</td></tr>
<tr><td>GCloud Run</td><td title="per million requests">0,40 $</td></tr>
<tr><td>GCloud Pub/Sub</td><td title="$40/TiB">0,40 $</td></tr>
<tr><td>Google Firestore Auth</td><td title="per 100.000 read/write requests">0,08 $</td></tr>
<tr><td>Amazon Alexa Lambda</td><td>0,10 $</td></tr>
<tr><td>Google Home Action</td><td>0,10 $</td></tr>
<tr><td>VAT (20%)</td><td title="German Tax Law applies">0,21 $</td></tr>
<tr><td>Payment Gateway (2.9% + €0,30)</td><td title="For a $3 payment">0,39 $</td></tr>
<tr><td><b>Sum</b></td><td>1.80 $</td></tr>
</tbody>
</table>

The price for the subscription plans might be lowered at some point, as soon as usage patterns, synergetic effects, chargeback costs etc have been understood.

Developer Program
: People that are part of the developers program get a 100% discount. This is granted on a monthly base and includes all developers that have worked on the core repository in the month before as well as Addon developers with an installation base of over 100 that keep their addons maintained and Github Issue count low.

Those developers are driving the project and I hope you share the idea to allow them free access.
