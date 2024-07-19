#ifndef OVERWATCH_H
#define OVERWATCH_H


#include <WiFi.h>
#include <ArduinoWebsockets.h>
#include <ArduinoJson.h>
#include <vector>
#include <Preferences.h>
#include <esp_system.h>


Preferences preferences;
using namespace websockets;


struct measurement {

  String gpio_name;
  int gpio;
  int value = 0;

  // Analog parameters
  int step;
  int thresh;
  bool analog;

  unsigned long last_measure = 0;

  measurement(String gpio_name, int step = 0, int thresh = 0, bool analog = false) : gpio_name(gpio_name), step(step), thresh(thresh), analog(analog) {
    gpio = gpio_name.substring(3).toInt();
    if (analog) {
      pinMode(gpio, INPUT_PULLUP);
    } else {
      pinMode(gpio, OUTPUT);
      digitalWrite(gpio, LOW);
    }
  }

  int measure_gpio (bool get_values = false) {

    if (analog) {

      unsigned long current_time = millis();
      if ((current_time - last_measure > step) || (get_values)) {

        int gpio_value = analogRead(gpio);
        if ((abs(value - gpio_value) > thresh) || (get_values)) {
          value = gpio_value;
          return value;
        } 

        last_measure = current_time;
      }

    } else {

      int gpio_value = digitalRead(gpio);

      if ((gpio_value != value) || (get_values)) {
        value = gpio_value;
        return value;
      }

    }
    
    return -1;
  
  }

};


class overwatch_client {

  private:

    String config;
    String ssl_cert;

    StaticJsonDocument<1024> device_config;
    std::vector<measurement> measurement_array;

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

      UUID = String("ow_") + WiFi.macAddress();
      IPAddress ip = WiFi.localIP();
      local_ip = ip.toString();

      Serial.printf("\nConnected to %s\nIP : ", ssid);
      Serial.println(WiFi.localIP());
      Serial.printf("MAC : ");
      Serial.println(UUID);

      // ========== RETRIEVE CONFIG AND SSL ========== //

      config = preferences_read_write("configuration", configuration);
      ssl_cert = preferences_read_write("ssl_cert", ssl_certificate);

      Serial.println(config);

      // ========== PARSE JSON CONFIG ========== //

      deserializeJson(device_config, config);

      // SETUP DIGITAL INPUTS
      JsonArray digitalInputs = device_config["digital_inputs"].as<JsonArray>();
      for (JsonVariant digital_input : digitalInputs) {
          pinMode(digital_input.as<int>(), INPUT_PULLUP);
      }

      // SETUP DIGITAL MEASUREMENTS
      JsonObject digitalMeasurements = device_config["digital_measurements"].as<JsonObject>();
      for (JsonPair digital_measurement : digitalMeasurements) {

        String gpio_name = digital_measurement.key().c_str();

        measurement digital_ms(gpio_name);
        measurement_array.push_back(digital_ms);

      }

      // SETUP ANALOG MEASUREMENTS
      JsonObject analogMeasurements = device_config["analog_measurements"].as<JsonObject>();
      for (JsonPair analog_measurement : analogMeasurements) {

          JsonObject measure = analog_measurement.value().as<JsonObject>();
          String gpio_name = analog_measurement.key().c_str();
          int step = measure["step"].as<int>();
          int thresh = measure["thresh"].as<int>();

          measurement analog_ms(gpio_name, step, thresh, true);
          measurement_array.push_back(analog_ms);

      }

    }


    void read_measurement_array (bool get_values = false) {

      bool array_updated = false;
      String update_array = "{\"INFO\":{\"UUID\":\"" + String(UUID) + "\",\"IP\":\"" + String(local_ip) + "\"},\"MEASUREMENTS\":[";

      // Use &measure to refer to the original object within the measurement_array, 
      // Not using the & creates a copy of the instance in the measurement_array and
      // wont update the original instance.
      for (measurement &measure : measurement_array) {

        int value = measure.measure_gpio(get_values);
        String gpio_name = measure.gpio_name;
        if (value != -1) {
          array_updated = true;
          if (update_array.charAt(update_array.length() - 1) == '}'){update_array += ",";}
          String gpio_state = "{\"" + gpio_name + "\":" + String(value) + "}";
          update_array += gpio_state;
        }
      }

      update_array = update_array + "]}";

      if (array_updated) {
        client.send(update_array);
      }

    }


    String stringify_json (JsonObject json_variable) {
      String variable;
      serializeJson(json_variable, variable);
      return variable;
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


    void websocket_connect () {

      client.setCACert(ssl_cert.c_str());

      if (client.connect(String("wss://") + host + ":" + port)) {

        Serial.println("Connected to WebSocket server");
        wss_send_config();
        read_measurement_array(true);

      } else {
        Serial.println("Connection failed. Retrying...");
      }

      client.onMessage([&](WebsocketsMessage message) {
        wss_receive(message.data());
      });
    
    }


    void wss_receive (String data) {
      Serial.println(data);

      StaticJsonDocument<200> instruction;
      deserializeJson(instruction, data);

      if (instruction["ping_network"] == "ping_network") {
        wss_send_config();
        read_measurement_array(true);
        return;
      }

      if (instruction["set_config"] && (instruction["UUID"] == UUID) && (instruction["IP"] == local_ip)) {
        Serial.println("SETTING NEW CONFIG : ");
        String new_config = stringify_json(instruction["set_config"]);
        Serial.println(new_config);
        preferences_read_write("configuration", new_config, true);
        ESP.restart();
        return;
      }

      int gpio = instruction["gpio"].as<int>();
      String target = instruction["target"].as<String>();

      if ( (target == UUID) ) {
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