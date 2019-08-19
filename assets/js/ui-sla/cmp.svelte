<script>
  export let sla = 0;
  export let range = 100;
  $: hours = ((sla * 24) / 100.0).toFixed(2);
  $: days = ((sla * 31) / 100.0).toFixed(2);
  $: sla_str = parseFloat(sla).toFixed(2);
</script>

<svelte:options accessors/>
<p>
  <q>
    A service-level agreement (SLA) is a commitment between a service provider
    and a client. Particular aspects of the service – quality, availability,
    responsibilities – are agreed between the service provider and the service
    user.
  </q>
</p>

<p>
  {sla_str}% means:
  <b>{hours}h a day</b>
  or
  <b>{days} days every 31 days</b>
  .
</p>

<p>
  The Software-only SLA is limited to:
  <br />
  Cloud Connectors, Rule Engine, IAM-Service, Operating Sytem, Hue Emulation +
  API Access. Your own services will be limited to 1/4 of the available memory
  and 20% CPU-time in SLA mode.
</p>

<p>
  Manipulating the supervisior will free the service provider from any SLA
  obligations with immediate effect.
</p>
