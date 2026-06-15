# Network connection settings

This project is configured to accept connections from other devices on the
local network.

## Server address

The launch profile in `WebApplication1/Properties/launchSettings.json` uses:

```text
http://0.0.0.0:5122
```

`0.0.0.0` means the ASP.NET server listens on all network interfaces of this
computer.

## How to start

From the project folder:

```powershell
dotnet run --project WebApplication1 --launch-profile http
```

## How to open from another device

Use the IP address of this computer in the local network:

```text
http://<computer-local-ip>:5122
```

Example:

```text
http://192.168.1.10:5122
```

If the page does not open from another device, check that Windows Firewall
allows inbound connections for port `5122` or for the running `dotnet` process.
