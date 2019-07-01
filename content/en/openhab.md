+++
title = "Compatibility / Difference to openHAB"
type = "plain"
+++

openHAB X evolved on concepts of the [openHAB project](https://www.openhab.org) and supports openHAB addons.
This document is structured in that it first takes a look at conceptual aspects before it dives into implementation differences. The latter might read a bit technical, but will help to understand why openHAB X exists in the first place and why it offers a better security model and industry grade robustness.

**Disclaimer:** This text might read a teeny bit biased. As usual, read with a grain of salt and inform and compare yourself.

## Conceptional differences

openHAB developers did good when they designed the concepts. Many concepts are taken over and are just refined. The following table sums those up and contrasts them with openHAB X concepts.

<table class="table">
  <tr>
    <th></th>
    <th>openHAB</th>
    <th>openHAB X</th>
  </tr>
  <tr>
    <td>Addon</td>
    <td>Extends openHAB with any sort of additional OSGi Java bundle. Because such a bundle is run in the same process as Core and Java has a powerful reflection API, such a bundle can interact, alter and overwrite every part of Core.</td>
    <td><b>N/A.</b> For obvious security reasons, OHX does not allow core services to be altered. Core development happens at a central place and if a feature is missing, everybody is invited to contribute. Updates happen via the updater system periodically.</td>
  </tr>
  <tr>
    <td>Binding<br>(Addon)</td>
    <td>An Addon that explicitly implements the interfaces for integrating an external service or device is called a Binding in openHAB. Related service interfaces are: The discovery service interface ("<i>Inbox</i>") and the Thing factory service interface ("<i>Things</i>").</td>
    <td>Same</td>
  </tr>
  <tr>
    <td>IO Service<br>(Addon)</td>
    <td>An IO Service is a type of Addon that exposes Things / Items. May it be via a http interface for mobile Apps or HomeKit or the Hue protocol for Hue Apps.</td>
    <td>Same</td>
  </tr>
  <tr>
    <td>Rule Modules</td>
    <td>openHAB calls Rule Triggers, Conditions and Actions <b>Rule Modules</b>. Those can be added via the Addons system of openHAB.</td>
    <td>openHAB X also has the same notation of <b>Rule Modules</b>. Additional Rule Modules cannot be installed as this has been recognised as security issue. An additional rule module would need to run in-process with all other rules and would have the same permissions and access levels as the rule engine service itself.</td>
  </tr>
  <tr>
    <td>IO Service Filter<br></td>
    <td><b>N/A</b>. OpenHAB does not allow the Hue Emulation, HomeKit, Alexa or any other IO Service to only expose a chunk of all Things (or Items).</td>
    <td>OHX allow you to setup filters, based on a simple rule syntax. It also allows to restrict filters to specific login accounts ("users"). That way the stereo in your office room can no longer be volumed up to max by your kids.</td>
  </tr>
  <tr>
    <td>User<br>Management</td>
    <td><b>N/A</b>. There is no user concept in openHAB.</td>
    <td>There is a rich user management and authentication service included. IO Service filters allow you to setup in a fine grain way what a specific user can control and what admin scopes he has. The actions a user can issue on a service depends on his assigned access scopes.</td>
  </tr>
  <tr>
    <td>Thing</td>
    <td>Represents a device or service.<br><br>Examples:<br><br>* A Phillips Hue light bulb is a Thing which openHAB can control - turning it on or off, setting its color or brightness.<br>* A ZWave sensor is a Thing which provides data like temperature, humidity or motion events to openHAB.<br></td>
    <td>Same</td>
  </tr>
  <tr>
    <td>Bridge</td>
    <td>openHAB allows a nested Thing setup. A Bridge is internally just a Thing. And a Thing can have child Things. This is to express a hierarchy for example for a Hue Bridge and connected Hue Light Bulbs.</td>
    <td><b>N/A</b>. Instead of layering Bridges and Things, what openHAB probably originally wanted to express is shared configuration. And that is what OHX supports. Multiple Things can share aspects of a configuration, like for example a Hue Light Thing shares configuration (and runtime information like authorisation tokens) with other Hue Lights about the Hue Bridge.<br><br>Advantage: This frees binding developers to think off Bridge -&gt; Thing relationships, online/offline relations and so on.</td>
  </tr>
  <tr>
    <td>Channel</td>
    <td>A Thing will usually provide at least one channel to control a feature or get data from it.<br><br>Examples:<br><br>* a Hue light bulb will have one channel to control its color, and another channel to control the color temperature,<br>* a smart TV will have several channels for things like volume, channel, input source, picture adjustment or guide interaction.<br></td>
    <td>Same</td>
  </tr>
  <tr>
    <td>Thing<br>Property</td>
    <td>An openHAB Thing can have read-only string based key-values assigned. Those Thing Properties can purely be used status and metrics reporting.</td>
    <td><b>N/A</b>. OHX supports a full metrics report API and encourages developers to export valueable information as Thing Status or as Channels. Both can be interacted with via Rules in contrast to openHABs Thing Properties.</td>
  </tr>
  <tr>
    <td>Items, Item Links,<br>Profiles<br></td>
    <td>An Item is an entity of a specific type (Text, Number, Color, Rollershutter, &hellip;) that holds state in openHAB. Bindings, Things and Channels are not allowed to. One or more Thing Channels are usually linked to one or more Items. This is how openHAB archives device and protocol interconnection. Items can exist for Rules only as well, to simulate global variables.<br><br>Items are also used for openHABs persistence system and IO Services. Items do not know about their original Thing or Thing Channel, which makes it impossible for something like the Hue Emulation Service to expose an emulated Hue bulb that can change brightness, color, light temperature on for example a Milight Bulb Thing, which has separate Channels and therefore Items for Brightness, Saturation, Light Temperature.<br><br>openHAB uses <b>Profiles and UOM</b> to alter a channel value (transform Fahrenheit to Celsius for example or , before it is assigned to an Item (and then maybe forwarded to another Thing Channel).<br></td>
    <td>OHX has abandoned the Item concept. Thing Channel interconnection happens via <b>Channel Links</b>. A Channel Link is basically a data flow from one Channel to another. The flow can be influenced by adding <b>Link Processors</b> (like openHAB Profiles) into it.<br><br>Thing Channel Values are persisted directly if enabled for that particular Channel. IO Services expose Things, not an abstraction of Thing Channels.</td>
  </tr>
  <tr>
    <td>Item Tags, Item Metadata,<br>Semantic Tags</td>
    <td>openHAB allows you to tag <b>Items</b> and also allows Bindings and Services to attach configuration to items in a more structured way than just tags ("Item Metadata").<br><br>Semantic tags are just String-based Tags like any others, but have translations and, as the name implies, a specific semantic attached to to them.<br>openHAB uses the <a href="https://brickschema.org/">Brick Schema</a>. The ontology defines 4 main types: Location, Property, Point and Equipment, with associated tags for each of them.</td>
    <td>Instead of tagging items, OHX allows to tag everything. From Things, to Thing Channels, to Rules. Semantic tagging via the Brick Schema is supported and encouraged. Binding developers should semantically pre-tag their exposed Things and Channels ("Light", "Fan" etc) and users can help in this process.<br><br>If all your Things and Channels are semantically tagged, you can without any additional work say "Turn off lights in living room" to the offline voice recognition (Snips AI) service or enter that sentence into the chat bot interface on the Setup&amp;Maintenance interface.</td>
  </tr>
</table>

## Do It Yourself IoT Support

There are some protocols that Makers can use for their IoT devices so that openHAB and openHAB X can discover and interact without any additional Add-on. The following table lists supported protocols.

<table class="table">
  <tr>
    <th></th>
    <th>openHAB X Core</th>
    <th>openHAB Core</th>
  </tr>
  <tr>
    <td>DIY Thing Protocols</td>
    <td>MQTT Homie, Mozilla WebThings</td>
    <td>MQTT Homie</td>
  </tr>
</table>

## Implementation differences

The following table reads a bit technical. Some of the aspects are picked up and explained in detail.

<table class="table">
  <tr>
    <th></th>
    <th>openHAB X Core</th>
    <th>openHAB Core</th>
  </tr>
  <tr>
    <td>Core Programming<br>Language</td>
    <td>Rust</td>
    <td>Java 1.8+</td>
  </tr>
  <tr>
    <td>Addon Programming<br>Language</td>
    <td>Rust, C++,<br>Java, Python,<br>JavaScript</td>
    <td>Java 1.8+</td>
  </tr>
  <tr>
    <td>Architecture</td>
    <td>micro-Service, Native binaries</td>
    <td>Monolith, Java Virtual Machine Bytecode,<br>Runtime extendable (OSGi)</td>
  </tr>
  <tr>
    <td>Service Communication</td>
    <td>Inter Process Communication<br>via TCP sockets (gRPC, Redis Protocol)</td>
    <td>In-Process Message Passing</td>
  </tr>
  <tr>
    <td>Required<br>external Processes</td>
    <td>InfluxDB, Redis</td>
    <td>InfluxDB</td>
  </tr>
  <tr>
    <td>Scalability</td>
    <td>&check;</td>
    <td>-</td>
  </tr>
  <tr>
    <td> {{< details title="Required Memory">}}Memory requirements are hard to compare for the two solutions. For one: OHX supports way more features out of the box, like natural language understanding, Hue Emulation for Hue Apps, Web Things Gateway and Cloud assistants via the Cloud Connector. <p>And second openHABs memory can't really be measured, only the java virtual machine (JVM) ones. Also resource leaks in openHAB raises the question on when to measure used memory, as it constantly climbs up until the all of the JVMs assignend memory is used up.</p>{{< /details>}} </td>
    <td>~200 MB<br><br>(InfluxDB-2 50 MB,<br>Redis 20 MB,<br>IAM 15 MB,<br>AddonMgr 10 MB,<br><abbr title="Natural language understanding">NRU</abbr> 25 MB,<br>Rules 20 MB,<br>Hue Emu. + Web Things IO Service 30 MB,<br>Cloud connector 10 MB)</td>
    <td>~550 MB<br><br>(InfluxDB-1 50 MB, JVM 500 MB)</td>
  </tr>
</table>

**¹:** openHAB X requires external services to run: A Redis Database which stores states and InfluxDB for historic states.

### Programming Language

The actual programming language syntax is really just a preference. The following table sums up differences that do matter however and come inherited with the language design:

<table class="table">
  <tr>
    <th></th>
    <th>Rust</th>
    <th>Java</th>
  </tr>
  <tr>
    <td>Memory<br>Management</td>
    <td>Manual</td>
    <td>Garbage Collected</td>
  </tr>
  <tr>
    <td>Execution</td>
    <td>Native Binary</td>
    <td>Bytecode;<br>Just in time compiled by <abbr title="Java Runtime Enviroment">JRE</abbr></td>
  </tr>
  <tr>
    <td>Runtime<br>Required?</td>
    <td>libc</td>
    <td>libc + JRE 8</td>
  </tr>
</table>

Compiled binaries
: The obvious advantage of machine compiled executables without a runtime is of course the executable size.
For Java, you must have the 150 MB weighting runtime installed and parts of it to be loaded into main memory during execution. Disadvantage is, that you must provide a binary for each target machine architecture, whereas Java shifts this part to the JRE distributors. There have been recent developments in the Java community to eliminate the runtime part (GraalVM). But that is not applicable for openHAB.

Resources
: Both languages require you to carefully watch your resource usage to prevent memory and resource leaks.
Manual memory management brings the huge benefit of being able to free unused parts as soon as you know it's safe. The
garbage collected Java may cause {{< details title="memory usage spikes">}}Assuming scenarios that are more complex, than
the Java Bytecode Optimizer can handle.{{< /details >}} instead. Have a look at the following (naïve, exemplary) example:

<div>
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
			<tab-header-item>Java</tab-header-item>
		</tab-header>
		<tab-body>
			<tab-body-item>
{{< highlight rust >}}
let mut i = 0;
while i < 10 {
    let customer = customer::new();
    customer.do_something();
    i = i + 1;
}
{{< /highlight >}}
			</tab-body-item>
			<tab-body-item>
{{< highlight java >}}
int i = 0;
while i < 10 {
    Customer customer = new Customer();
    customer.doSomething();
    i = i + 1;
}
{{< /highlight >}}
			</tab-body-item>
		</tab-body>
	</tab-container>
</div>

In Rust, as soon as the `customer` instance goes out of scope, the memory will be handed back to the operating system.
The developer has control on how much virtual memory the application occupies.

Java also decrements the objects reference counter to zero, making the object eligable for the garbage collector (GC).
Depending on the used collectors algorithm, it might only kick in after the loop or later, causing a high virtual memory usage spike. If the user configured maximum memory limit has been hit, the garbage collector starts running in between loop cycles. Totally out of control of the programmer!

### Monolith vs micro-Service

The chosen architecture pre-determines a few properties of the software product. A monolith (one process) allows for a more efficient data exchange between different in-process threads. It is usually also easier to bundle and distribute a monolithic software.

At the same time you have signed for some drawbacks. The operating systems process specific security mechanisms have no impact like isolation, process capabilities (for example to open network sockets), filesystem access. openHAB runs its core and all addons in one process context. Everything that the core requires to work (like writable filesystem directories, network access, etc) is therefore available to all addons. **Any addon can read and write any other addons or the cores configuration and thing state**. Resource usage can only be monitored for the entire java openHAB process, not for single addons or services. That makes it especially **hard to find buggy addon code**.

In contrast openHAB X runs a multitude of services with a specific directory each, exposed for reading/writing and with restricted and monitored resource limits (cpu, memory, disk quota). Services and Addons run in their own process each. A malicous addon or a hacked core service can only go so far on the system and will be detected, reported and killed on non-expected behaviour.

What architecture to choose for Home Automation?
: If the entire purpose of a system is to run a java virtual machine process with preconfigured, trusted bundles, the monolith is the architecture of choice. For user installable addons from untrusted sources (like on Android or iOS mobile operating systems, but also a home automation system with community developed addons) the multi-service architecture is clearly the favourable one.

### Service communication &amp; Scalability

As noted above, running a monolith allows for efficient in process communication.

OHX uses normal TCP sockets via the gRPC protocol (remote procedure calls with protobuf decoding and service discovery).
This is clearly more overhead and increases latency (although only in one digit millisecond range). But it does allow for **scalability**. You are free to move services to different systems, or add load balancers in front of services. The only service that keeps data in memory is Redis, which has its [own scalability methods](https://redislabs.com/ebook/part-3-next-steps/chapter-10-scaling-redis/) like read slaves, sharding etc.

## Conclusion

Mayn openHAB core concepts and names have been adopted, as they have been carefully thought of in the openHAB community and amongst developers. The implementation has drastically changed to fulfil what has been declared in the [Design Principles](/developer/design_principles/). If you are coming from openHAB, you may only briefly read over the [User Guide](/userguide) as many concepts will sound familiar. It is still a recommended read.