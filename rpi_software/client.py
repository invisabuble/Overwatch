import asyncio
import websockets
import ssl
import json
import socket
import uuid
import RPi.GPIO as GPIO

GPIO.setwarnings(False)
GPIO.setmode(GPIO.BCM)

class ipError (ValueError) :
    """Error when IP can't be found."""
    def __init__ (self, message) :
        super().__init__(f"IP_ERROR: There was an error getting the device IP: \n{message}")


class macError (ValueError) :
    """Error when MAC can't be found."""
    def __init__ (self, message) :
        super().__init__(f"MAC_ERROR: There was an error getting the MAC address: \n{message}")


class wssError (ValueError) :
    """Error for WSS."""
    def __init__ (self, message) :
        super().__init__(f"WSS_ERROR: There was an error in the WSS communication: \n{message}")


class device :
    """Class for containing device information and measurements."""

    def __init__ (self, host, port) :
        """Initialize the overwatch device."""
        print("Setting up device for overwatch...")

        self.host = host
        self.port = port
        self.wss_server = f"wss://{host}:{port}"

        device_config = open("device_config.json", "r").read()
        self.config = json.loads(device_config)

        for gpio in self.config["digital_inputs"] :
            GPIO.setup(gpio, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)

        for gpio in list(self.config["digital_measurements"].keys()) :
            GPIO.setup(int(gpio[3:]), GPIO.OUT)
            GPIO.output(int(gpio[3:]), 0)

        self.ip = None
        self.mac = None

        self.digital_inputs = self.config["digital_inputs"]
        self.digital_measurements = self.config["digital_measurements"]
        self.analog_measurements = self.config["analog_measurements"]

        try:
            temp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            temp_socket.connect(("8.8.8.8", 80))
            ip_address = temp_socket.getsockname()[0]
            temp_socket.close()
            self.ip = ip_address
        except Exception as e:
            raise ipError(e)

        try:
            mac_address = ':'.join(['{:02x}'.format((uuid.getnode() >> elements) & 0xff) for elements in range(0, 2 * 6, 2)][::-1])
            self.mac = "ow_" + mac_address.upper()
        except Exception as e:
            raise macError(e)

        print(f"\n   IP: {self.ip}\n   MAC: {self.mac}\n   Digital-Inputs: {self.digital_inputs}\n   Digital-Measurements: {self.digital_measurements}\n   Analog-Measurements: {self.analog_measurements}\n")
        

    def device_json (self) :
        """Function to form JSON to send."""
        json_config = {
            "INFO": {
                "IP": self.ip,
                "UUID": self.mac
            },
            "CONFIG": json.dumps(self.config)
        }
        return json.dumps(json_config)


    def gpio_states (self) :

        update_array = "{\"INFO\":{\"UUID\":\"" + self.mac + "\",\"IP\":\"" + self.ip + "\"},\"MEASUREMENTS\":["

        for gpio in list(self.config["digital_measurements"].keys()) :
            state = GPIO.input(int(gpio[3:]))
            if (update_array[-1] == "}"):
                update_array += "," 
            gpio_state = "{\"" + gpio + "\":" + str(state) + "}"
            update_array += gpio_state

        update_array += "]}"
        print(update_array)
        return update_array


    def toggle_gpio (self, gpio) :
        state = bool(GPIO.input(int(gpio)))
        new_state = GPIO.LOW if state else GPIO.HIGH
        GPIO.output(int(gpio), new_state)


class wss (device) :
    """Class for encapsulating the secure WebSocket server connection."""

    def __init__ (self, host, port) :
        """Initialize WSS connection."""
        print("Setting up WSS connection...")
        super().__init__(host, port)

        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE


    async def wss_send (self, websocket, message) :
        """Send message to the WSS."""
        await websocket.send(message)


    async def wss_connection (self) :
        """Connection to the WSS."""
        while True:
            try:
                async with websockets.connect(self.wss_server, ssl=self.ssl_context) as websocket:
                    print("Connected to the server")

                    # Send a message to the server once when the connection is established
                    await self.wss_send(websocket, self.device_json())
                    print("Sent device configuration to the server")

                    # Main communication loop
                    while True:
                        try:
                            # Receive a message from the server
                            response = await websocket.recv()
                            print("Received response from server:", response)

                            await self.wss_send(websocket, self.gpio_states())

                            json_response = json.loads(response)

                            if json_response.get("ping_network") == "ping_network":
                                print("Ping network received. Sending config...")
                                await self.wss_send(websocket, self.device_json())
                                continue

                            if "gpio" in json_response:
                                self.toggle_gpio(json_response["gpio"])
                                continue

                        except websockets.ConnectionClosed:
                            print("Connection closed, attempting to reconnect...")
                            break
                        except Exception as e:
                            print("Error during communication:", e)
                            break

            except Exception as e:
                print("WSS connection error:", e)
                await asyncio.sleep(5)  # Wait before trying to reconnect


    def run (self) :
        asyncio.get_event_loop().run_until_complete(self.wss_connection())

ow_wss_client = wss("192.168.0.33", "8765")
ow_wss_client.run()