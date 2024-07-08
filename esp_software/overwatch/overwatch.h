#ifndef OVERWATCH_H
#define OVERWATCH_H


#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <vector>
#include <Preferences.h>


Preferences preferences;
using namespace websockets;
typedef std::vector<int> IntVector;


class overwatch_client {

  private:

    String config;
    String ssl_cert;

    StaticJsonDocument<1024> device_config;
    std::vector<std::vector<int>> measurement_array;
    std::vector<int> digital_inputs = {};
    std::vector<int> digital_measurements = {};
    std::vector<int> analog_measurements = {};

    int status_led;
    String UUID;
    String local_ip;

    WebsocketsClient client;
    WiFiClient espClient;

    unsigned long blink_time = 0;


  public:

    overwatch_client (int status_led = 12) : status_led(status_led) {

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

      // ========== GET DEVICE CONFIG AND SSL_CERT ========== //

      // This command has to be run the first time that the key for preferences is created:
      //
      // preferences_read_write("configuration", configuration);
      //
      // This will populate the configuration key in preferences with the configuration variable.
      // if this command is run again, it wont load the configuration variable into the configuration
      // key.
      //
      // The value stored in any key can be found by using:
      //
      // preferences_read_write("key");
      //
      // To reset the configuration key to configuration variable, use:
      // preferences_read_write("configuration", configuration, true);

      config = preferences_read_write("configuration", configuration);
      ssl_cert = preferences_read_write("ssl_cert", ssl_certificate);

      Serial.println(config);

      // ========== PARSE DEVICE CONFIG INTO JSON ========== //
      
      deserializeJson(device_config, config);

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

      // =================================================== //

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

      client.setCACert(ssl_cert.c_str());

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
      ESP_CONFIG["CONFIG"] = config;
      
      String espConfigString;
      serializeJson(ESP_CONFIG, espConfigString);

      client.send(espConfigString);

    }


    String stringify_json (JsonObject json_variable) {
      String variable;
      serializeJson(json_variable, variable);
      return variable;
    }


    void wss_receive (String data) {
      Serial.println(data);

      StaticJsonDocument<200> instruction;
      deserializeJson(instruction, data);

      if (instruction["ping_network"] == "ping_network") {
        wss_send_config();
        read_measurement_array("all_values");
        return;
      }

      if (instruction["set_config"] && (instruction["UUID"] == UUID) && (instruction["IP"] == local_ip)) {
        Serial.println("SETTING NEW CONFIG : ");
        String new_config = stringify_json(instruction["set_config"]);
        Serial.println(new_config);
        preferences_read_write("configuration", new_config, true);
        return;
      }

      int gpio = instruction["gpio"].as<int>();
      String target = instruction["target"].as<String>();

      if ( (target == UUID) && (std::find(digital_measurements.begin(), digital_measurements.end(), gpio) != digital_measurements.end()) ) {
        Serial.printf("GPIO %d toggled\n", gpio);
        digitalWrite(gpio, !digitalRead(gpio));
      }

    }


    void wipe_preferences () {

      // This function will wipe all of the keys from the preferences.
      preferences.clear();
      Serial.println("Wiped all preferences.");

    }


    String preferences_read_write (String variable_name, String variable = "", bool new_variable = false) {

      preferences.begin("overwatch", false);

      if (!preferences.isKey(variable_name.c_str())) {
        preferences.putString(variable_name.c_str(), variable.c_str());
        Serial.printf("Loaded new key '%s' into preferences.\n", variable_name.c_str());
      }

      if (new_variable) {
        preferences.putString(variable_name.c_str(), variable.c_str());
        Serial.printf("Loaded new variable into %s key.\n", variable_name.c_str());
      }

      String preferences_variable = preferences.getString(variable_name.c_str());
      //wipe_preferences();
      preferences.end();
      return preferences_variable;

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