#ifndef OVERWATCH_H
#define OVERWATCH_H

#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <vector>

using namespace websockets;
typedef std::vector<int> IntVector;

class overwatch_client {

  private:

    int analog_threshold = 200;

    StaticJsonDocument<1024> device_config;

    std::vector<int> digital_inputs = {};
    std::vector<int> digital_measurements = {};
    std::vector<int> analog_measurements = {};

    std::vector<std::vector<int>> measurement_array;

    const char* ssid;
    const char* pswd;
    const char* host;
    const char* ssl_cert;
    uint16_t port;
    int status_led;

    String UUID;
    String local_ip;

    WebsocketsClient client;
    WiFiClient espClient;

    unsigned long blink_time = 0;

  public:

    overwatch_client (const char* ssid, const char* pswd, const char* host, const char* ssl_cert, uint16_t port = 8765, int status_led = 12)
     : ssid(ssid), pswd(pswd), host(host), ssl_cert(ssl_cert), port(port), status_led(status_led) {

      pinMode(status_led, OUTPUT);
      digitalWrite(status_led, LOW);

      // ========== CONNECT TO WIFI ========== //
      Serial.printf("Connecting to WiFi .");

      WiFi.begin(ssid, pswd);
      while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.printf(".");
        digitalWrite(status_led, !digitalRead(status_led));
      }

      UUID = WiFi.macAddress();
      IPAddress ip = WiFi.localIP();
      local_ip = ip.toString();

      Serial.printf("\nConnected to %s\nIP : ", ssid);
      Serial.println(WiFi.localIP());
      Serial.printf("MAC : ");
      Serial.println(UUID);
      // ===================================== //

      deserializeJson(device_config, configuration);

      Serial.println("\n===== DIGITAL INPUTS =====");
      JsonArray digital_in = device_config["digital_inputs"].as<JsonArray>();
      for ( int index = 0; index < digital_in.size(); index++ ) {
        int gpio = digital_in[index].as<int>();
        Serial.println(gpio);
        digital_inputs.push_back(gpio);
        pinMode(gpio, INPUT_PULLUP);
      }

      Serial.println("\n===== DIGITAL MEASUREMENTS =====");
      JsonObject digital_ms = device_config["digital_measurements"].as<JsonObject>();
      std::vector<IntVector> dig_ms;
      for ( JsonPair keyValue : digital_ms ) {
        String keyStr = keyValue.key().c_str();
        keyStr = keyStr.substring(3);
        int key = keyStr.toInt();
        Serial.println(key);
        IntVector measurement = { key, 0 };
        measurement_array.push_back(measurement);
        digital_measurements.push_back(key);
        pinMode(key, OUTPUT);
      }

      Serial.println("\n===== ANALOG MEASUREMENTS =====");
      JsonObject analog_ms = device_config["analog_measurements"].as<JsonObject>();
      std::vector<IntVector> ana_ms;
      for ( JsonPair keyValue : analog_ms ) {
        String keyStr = keyValue.key().c_str();
        keyStr = keyStr.substring(3);
        int key = keyStr.toInt();
        Serial.println(key);
        IntVector measurement = { key, 0 };
        measurement_array.push_back(measurement);
        analog_measurements.push_back(key);
        pinMode(key, INPUT_PULLUP);
      }

    }

    void read_measurement_array (String all_values = "") {

      bool array_updated = false;
      String update_array = "{\"INFO\":{\"UUID\":\"" + String(UUID) + "\",\"IP\":\"" + String(local_ip) + "\"},\"MEASUREMENTS\":[";

      for (int io = 0; io < measurement_array.size(); io++) {

        int gpio = measurement_array[io][0];
        int array_value = measurement_array[io][1];
        int io_value;
        
        if (std::find(digital_measurements.begin(), digital_measurements.end(), gpio) != digital_measurements.end()) {
          io_value = digitalRead(gpio);
        }
        else if (std::find(analog_measurements.begin(), analog_measurements.end(), gpio) != analog_measurements.end()) {
          io_value = analogRead(gpio);

          if ( abs(io_value - array_value) <= analog_threshold ) {
            io_value = array_value;
          }

        }
        else {
          return;
        }

        if ((io_value != array_value) || all_values == "all_values") {
          if (all_values == "") {
            measurement_array[io][1] = io_value;
          }
          if (update_array.charAt(update_array.length() - 1) == '}'){update_array += ",";}
          String gpio_state = "{\"io-" + String(gpio) + "\":" + String(io_value) + "}";
          update_array += gpio_state;
          array_updated = true;
        }
      }

      update_array = update_array + "]}";

      if (array_updated) {
        client.send(update_array);
      }

    }

    void websocket_connect () {

      client.setCACert(ssl_cert);

      if (client.connect(String("wss://") + host + ":" + port)) {

        Serial.println("Connected to WebSocket server");
        wss_send_config();
        read_measurement_array("all_values");

      } else {
        Serial.println("Connection failed. Retrying...");
      }

      client.onMessage([&](WebsocketsMessage message) {
        wss_receive(message.data());
      });
    
    }

    void wss_send_config () {

      StaticJsonDocument<200> ESP_CONFIG;
      ESP_CONFIG["INFO"]["UUID"] = UUID;
      ESP_CONFIG["INFO"]["IP"] = local_ip;
      configuration.replace("\n", "");
      configuration.replace(" ", "");
      ESP_CONFIG["CONFIG"] = configuration;
      
      String espConfigString;
      serializeJson(ESP_CONFIG, espConfigString);

      client.send(espConfigString);

    }

    void wss_receive (String data) {
      Serial.println(data);

      StaticJsonDocument<200> instruction;
      deserializeJson(instruction, data);

      if (instruction["ping_network"] == "ping_network") {
        wss_send_config();
        read_measurement_array("all_values");
      }

      int gpio = instruction["gpio"].as<int>();
      String target = instruction["target"].as<String>();

      if ( (target == UUID) && (std::find(digital_measurements.begin(), digital_measurements.end(), gpio) != digital_measurements.end()) ) {
        Serial.printf("GPIO %d toggled\n", gpio);
        digitalWrite(gpio, !digitalRead(gpio));
      }

    }

    void overwatch_loop() {

      unsigned long current_time = millis();

      // ========== LOOP FUNCTIONS ========== //
      read_measurement_array();
      // ==================================== //

      if (!client.available()) {
        Serial.println("Attempting websocket connection ...");
        delay(250);
        digitalWrite(status_led, !digitalRead(status_led));
        websocket_connect();
      } else {
        client.poll();
        if (current_time - blink_time >= 10000) {
          blink_time = current_time;
          digitalWrite(status_led, HIGH);
          delay(10);
          digitalWrite(status_led, LOW);
        }
      }
    }
};

#endif

