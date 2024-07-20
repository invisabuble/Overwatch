import asyncio
import threading
import websockets
import ssl
import json
import socket
import uuid
import RPi.GPIO as GPIO
from getmac import get_mac_address

GPIO.setmode(GPIO.BCM)
GPIO.setwarnings(False)


class WSSError(ValueError):
    """ Error for wss """
    def __init__(self, message):
        super().__init__(f"\nWSSError :\n ERROR OCCURED IN WSS COMMUNICATION : {message}")


class IPError(ValueError):
    """ Error for IPs """
    def __init__(self, message):
        super().__init__(f"\nIPError :\n ERROR OCCURED WHILST TRYING TO FIND LOCAL IP ADDRESS : {message}")


class MACError(ValueError):
    """ Error for MACs """
    def __init__(self, message):
        super().__init__(f"\nMACError :\n ERROR OCCURED WHILST TRYING TO FIND LOCAL MAC ADDRESS : {message}")


class device_gpio:
    """ Define a gpio """
    def __init__(self, gpio, dig_input=False):

        self.io_num = int(gpio[3:])
        self.io = gpio
        self.value = 0

        if dig_input:
            GPIO.setup(self.io_num, GPIO.IN, pull_up_down=GPIO.PUD_DOWN)
        else:
            GPIO.setup(self.io_num, GPIO.OUT)
            GPIO.output(self.io_num, GPIO.LOW)


    def measure(self):
        gpio_value = GPIO.input(self.io_num)
        if self.value != gpio_value:
            self.value = gpio_value
            return self.value


class wss:
    """ Class for encapsulating wss connection """

    def __init__(self, host, port):
        # Define the wss location
        self.wss_server = f"wss://{host}:{port}"

        # Create the ssl context
        self.ssl_context = ssl.create_default_context()
        self.ssl_context.check_hostname = False
        self.ssl_context.verify_mode = ssl.CERT_NONE

        self.wss_response = None
        self.wss_connected = False
        self.message_data = None

        # Make the wss run
        self.run_wss_client = True


    async def wss_send(self, websocket, message):
        """ Send message to wss """
        await websocket.send(message)


    async def wss_connection(self):
        """ Connection to the wss """
        while self.run_wss_client:
            try:
                # Establish connection to the wss
                async with websockets.connect(self.wss_server, ssl=self.ssl_context) as websocket:
                    
                    print(f"Connected to {self.wss_server}")
                    self.wss_conencted = True
                    await self.wss_send(websocket, self.message_data)

                    while self.run_wss_client:
                        # Main communication loop
                        try:
                            # Set wss_response to any response received so that it can be analysed
                            # outside of the wss loop
                            self.wss_response = await websocket.recv()

                            # Check if message_data is None, if its not None then send its contents
                            # to the wss
                            if self.message_data is not None :
                                await self.wss_send(websocket, self.message_data)
                                self.message_data = None

                        except websockets.ConnectionClosed:
                            raise WSSError("CONNECTION CLOSED")

                        except Exception as e:
                            raise WSSError(e)

            except Exception as e:
                self.wss_connected = False
                print(f"WSS CONNECTION ERROR: {e}")
                await asyncio.sleep(5)


    def run(self):
        """ Run the wss connection """
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self.wss_connection())

    def close (self) :
        self.run_wss_client = False


class device(wss):
    """ Main device class """
    def __init__(self, host, port):
        super().__init__(host, port)

        # Load in device config
        device_config = open("device_config.json", "r").read()
        self.config = json.loads(device_config)
        self.wss_old_response = None

        self.input_array = {}
        self.output_array = {}

        # Setup gpios as inputs or outputs
        for gpio in self.config["digital_inputs"]:
            self.input_array[gpio] = device_gpio(gpio, True)

        for gpio in list(self.config["digital_measurements"].keys()):
            self.output_array[gpio] = device_gpio(gpio)

        self.ip = None
        self.mac = None

        # Get the IP address
        try:
            temp_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            temp_socket.connect(("8.8.8.8", 80))
            ip_address = temp_socket.getsockname()[0]
            temp_socket.close()
            self.ip = ip_address
        except Exception as e:
            raise IPError(e)
        
        # Get the MAC address
        try:

            mac_address = get_mac_address()
            if mac_address:
                self.mac = "ow_" + mac_address.upper()
            else:
                raise MACError("Unable to retrieve MAC address.")

        except Exception as e:
            raise MACError(e)

        print(f"DEVICE INFO : {self.ip}, {self.mac}")
        
        # Set the message data to the output of the device_json function,
        # When the wss client thread starts it will be sent out immediately
        self.message_data = self.device_json()
        # Start the wss thread
        self.wss_thread = threading.Thread(target=self.run)
        self.wss_thread.start()

        # Wait for the wss thread to be connected
        print("Waiting for wss connection to be established .", end="")
        while self.wss_connected :
            print(".", end="")
        print(" ")

        #Start the overwatch loop
        self.ow_loop()


    def device_json(self):
        """ Return device json """
        json_config = {
            "INFO": {
                "IP": self.ip,
                "UUID": self.mac
            },
            "CONFIG": json.dumps(self.config)
        }
        return json.dumps(json_config)


    def ow_loop(self):
        """ Main overwatch loop """
        try:
            while True:

                response_json = None

                if self.wss_response != self.wss_old_response :
                    self.wss_old_response = self.wss_response
                    response_json = json.loads(self.wss_response)
                    print(self.wss_response)

                    if "ping_network" in response_json:
                        self.message_data = self.device_json()


        except Exception as e:
            raise WSSError(e)
        
        finally:
            self.close()
            self.wss_thread.join()


ow_client = device("192.168.0.33", "8765")