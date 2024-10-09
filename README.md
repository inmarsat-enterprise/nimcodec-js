# Non-IP Modem Codecs for Node.JS

A Node.JS library for decoding and encoding efficient binary blob messages
for Non-IP Modem data transport over constrained satellite networks.

It implements the [**Compact Binary Codec**](https://github.com/inmarsat-enterprise/compact-binary-codec)
concept for use on server/cloud resources.

> [!TIP]
> The key feature of *NIM* messages is that data field boundaries do not need to
align with byte boundaries.

## NB-NTN and CoAP

Narrowband Non-Terrestrial Networks provide low-power low-data connectivity
for IoT devices operating in the most remote areas, and can serve as a fallback
to conventional cellular LPWA (NB-IoT) networks through roaming arrangements.

## NIMO

Non-IP Modem for ORBCOMM protocols is derived from a proprietary codec key file
described by XML or JSON. The principle is the first 2 payload bytes comprise
a message key describing *services* (aka SIN) made up of *messages* (aka MIN).
Messages are defined for both *uplink* (aka Mobile-Originated) and *downlink*
(aka Mobile-Terminated) operations.

Using this approach we can define up to 256 **Service**(s) each with up to
256 **Message**(s) in each direction of communication. The intent is that each
micro-service encapsulates a set of related remote operations, and the messages
represent the individual downlink (command/query) or uplink (response/report)
operations.

> [!NOTE]
> When using actual ORBCOMM-protocol based modems (IDP/OGx service) SIN 0-15 are
reserved for system use, and SIN 16-127 are pseudo-reserved for ORBCOMM Lua apps.

An XML format for the codec file was historically uploaded to the Viasat/Inmarsat
or ORBCOMM/SkyWave web service API gateways, typically with extension `*.idpmsg`.
Some field types may not be supported on some gateways.

The JSON format provides a condensed version and supports an extended set of
field types. The codec library is intended to prefer JSON representation for
processing external to the service provider API gateways.
