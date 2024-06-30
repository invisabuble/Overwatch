import asyncio
import ssl
import websockets
from getmac import get_mac_address

cert_path = "/ow.certs/"

ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain(certfile=cert_path + "overwatch.crt", keyfile=cert_path + "overwatch.key")

connected_clients = {}

async def echo(websocket, path):
    # Register the new client with its remote address
    remote_address = websocket.remote_address[0]
    mac_address = get_mac_address(ip=remote_address)
    if mac_address :
        mac_address = mac_address.upper()
    connected_clients[websocket] = (remote_address, mac_address)
    print(f"Client connected: IP={remote_address}, MAC={mac_address}")

    try:
        # Keep reading messages from the client
        async for message in websocket:
            print(f"Received message from IP={remote_address}, MAC={mac_address}: {message}")
            # Broadcast the message to all connected clients
            await asyncio.gather(*[client.send(message) for client in connected_clients if client != websocket])
    except websockets.exceptions.ConnectionClosed:
        print(f"Connection closed by IP={remote_address}, MAC={mac_address}")
    except Exception as e:
        print(f"Error processing connection from IP={remote_address}, MAC={mac_address}: {e}")
    finally:
        # Unregister the client
        del connected_clients[websocket]
        print(f"Client disconnected: IP={remote_address}, MAC={mac_address}")
        disconnect_message = f'{{"INFO":{{"UUID":"{mac_address}","IP":"{remote_address}"}},"DISCONNECT":"DISCONNECT"}}'
        await asyncio.gather(*[client.send(disconnect_message) for client in connected_clients])

async def main():
    async with websockets.serve(echo, "0.0.0.0", 8765, ssl=ssl_context):
        print("Overwatch wss server started on 0.0.0.0:8765")
        # Run the server indefinitely
        await asyncio.Future()  # run forever

if __name__ == "__main__":
    asyncio.run(main())

