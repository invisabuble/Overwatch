import asyncio
import ssl
import websockets
import json
from getmac import get_mac_address
import os

cert_path = "/ow.certs/"

cert_file = open(cert_path + "overwatch.crt", "r")
cert_contents = cert_file.read()
cert_file.close()

ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain(certfile=cert_path + "overwatch.crt", keyfile=cert_path + "overwatch.key")

connected_clients = {}

async def echo(websocket, path):
    remote_address = websocket.remote_address[0]
    mac_address = get_mac_address(ip=remote_address)
    if mac_address:
        mac_address = "ow_" + mac_address.upper()
    connected_clients[websocket] = (remote_address, mac_address)
    print(f"Client connected: IP={remote_address}, MAC={mac_address}")

    try:
        async for message in websocket:
            print(f"Received message from IP={remote_address}, MAC={mac_address}: {message}")

            if message.strip() == '{"ssl_cert":"ssl_cert"}':
                print(f"Sending certificate to IP={remote_address}")
                json_cert = json.dumps({"ssl_cert" : cert_contents})
                await websocket.send(json_cert)
            else:
                await asyncio.gather(*[client.send(message) for client in connected_clients if client != websocket])

    except websockets.exceptions.ConnectionClosed:
        print(f"Connection closed by IP={remote_address}, MAC={mac_address}")
    except Exception as e:
        print(f"Error processing connection from IP={remote_address}, MAC={mac_address}: {e}")
    finally:
        del connected_clients[websocket]
        print(f"Client disconnected: IP={remote_address}, MAC={mac_address}")
        disconnect_message = f'{{"INFO":{{"UUID":"{mac_address}","IP":"{remote_address}"}},"DISCONNECT":"DISCONNECT"}}'
        await asyncio.gather(*[client.send(disconnect_message) for client in connected_clients])

async def main():
    async with websockets.serve(
        echo, host, port, ssl=ssl_context,
        ping_interval=ping_int,  # Send a ping every 10 seconds
        ping_timeout=ping_tmt     # Wait 5 seconds for a pong before considering the connection closed
    ):
        print("Overwatch wss server started on 0.0.0.0:8765")
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    
    host = os.getenv('WSS_HOST', '0.0.0.0')
    port = int(os.getenv('WSS_PORT', 8765))
    ping_int = int(os.getenv('PING_INT', 5))
    ping_tmt = int(os.getenv('PING_TMT', 5))

    asyncio.run(main())