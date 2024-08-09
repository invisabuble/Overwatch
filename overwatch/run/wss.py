import asyncio
import websockets
import os
import json
import ssl


def printc(message, colour, bold="", **kwargs):
    n = "01" if bold else "0"
    colours = {
        "white": f"\033[{n};0m",
        "red": f"\033[{n};91m",
        "green": f"\033[{n};92m",
        "blue": f"\033[{n};94m",
        "yellow": f"\033[{n};93m",
        "grey": f"\033[{n};90m",
        "cyan": f"\033[{n};36m",
        "darkred": f"\033[{n}31m",
        "magenta": f"\033[{n}95m"
    }
    colour = colours[colour.lower()]
    print(f"{colour}{message}\033[0;0m", **kwargs)


devices = {}
frontends = {}


async def send_to_frontends (message) :
    """ Send a message to all frontends within the frontends dictionary """
    for frontend in frontends.values():
        if frontend.open :
            await frontend.send(json.dumps(message))


async def handler(websocket, path):
    uuid = None
    try:
        async for message in websocket:

            json_message = json.loads(message)

            if "INFO" in json_message:
                # If theres the key 'INFO' in the json message then do this
                info = json_message["INFO"]
                uuid = info["UUID"]
                ip = info["IP"]

                if ip == "ow-frontend":
                    # If theres the value 'ow-frontend' in the key 'IP' in the json message then
                    # the connection is a frontend
                    frontends[uuid] = websocket
                    printc(f"Frontend connected: {message}", "cyan")
                    json_cert = json.dumps({"ssl_cert" : ssl_content})
                    await websocket.send(json_cert)

                    # Send every device within the devices dict to the newly connected frontend
                    for device in devices:
                        connection = devices[device]
                        await connection.send(json.dumps({"ping_network":"ping_network"}))
                        device_connection = connection.device_connection
                        await websocket.send(device_connection)

                else:
                    if "CONFIG" in json_message:
                        # If the connection sends a config, store the config within the connection object
                        # along with the uuid and the ip of the connection
                        websocket.device_connection = message
                        websocket.ow_uuid = uuid
                        websocket.ow_ip = ip
                        devices[uuid] = websocket
                        printc(f"Device connected: {message}", "blue")
                    
                    await send_to_frontends(json_message)

            elif "target" in json_message:
                # If theres the key 'target' in the json message then send the message to the target
                printc(f"{uuid} -> \n {devices} \n {message}", "green")
                target_uuid = json_message["target"]
                # Get the value within the key target_uuid
                target_connection = devices.get(target_uuid)

                if target_connection and target_connection.open:
                    await target_connection.send(message)

                if "set_config" in json_message:
                    printc(f"New config sent to {target_uuid}, removing old instance from dictionary.","magenta")
                    if target_uuid in devices:
                        del devices[target_uuid]
                    else:
                        printc(f"Could'nt remove {target_uuid} from device dictionary.","red")

                else:
                    printc(f"Target {target_uuid} not found or not open", "yellow")
                    disconnect_message = {"INFO": {"UUID": uuid, "IP": "IRRELEVENT"}, "DISCONNECT": "DISCONNECT"}
                    await send_to_frontends(disconnect_message)

            else:
                printc(message, "yellow")

    except websockets.ConnectionClosedError as e:
        printc(f"Connection closed error: {e}", "red")
    except websockets.ConnectionClosedOK:
        printc("Connection closed gracefully", "green")
    except Exception as e:
        printc(f"Unexpected error: {e}", "red")

    finally:
        if uuid:

            if uuid in devices:
                device = devices[uuid]

                disconnect_message = {"INFO": {"UUID": uuid, "IP": device.ow_ip}, "DISCONNECT": "DISCONNECT"}
                await send_to_frontends(disconnect_message)

                del devices[uuid]
                printc(f"Device {uuid} disconnected", "darkred")

            if uuid in frontends:

                del frontends[uuid]
                printc(f"Frontend {uuid} disconnected", "cyan")

            
async def main():
    # Load SSL certificate and key
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ssl_context.load_cert_chain(certfile=f"{cert_path}/overwatch.crt", keyfile=f"{cert_path}/overwatch.key")

    async with websockets.serve(
        handler,
        host,
        port,
        ssl=ssl_context,
        ping_interval=ping_int,
        ping_timeout=ping_tmt
    ):
        printc(f"Server started at {host}:{port}, ping-int: {ping_int}, ping_tmt: {ping_tmt}", "green")
        await asyncio.Future()


if __name__ == "__main__":

    host = os.getenv('WSS_HOST')
    port = int(os.getenv('WSS_PORT'))
    ping_int = int(os.getenv('PING_INT'))
    ping_tmt = int(os.getenv('PING_TMT'))

    cert_path = "/ow.certs"

    ssl_crt = open(f"{cert_path}/overwatch.crt", "r")
    ssl_content = ssl_crt.read()
    ssl_crt.close()

    asyncio.run(main())
